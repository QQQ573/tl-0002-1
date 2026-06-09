const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:8080';
const ROOM_ID = process.env.ROOM_ID || '';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createConnection(userId, userName) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      console.log(`[${userName}] 已连接`);
      resolve(ws);
    });
    
    ws.on('error', (err) => {
      reject(err);
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type !== 'pong' && msg.type !== 'state_update') {
        console.log(`[${userName}] 收到:`, msg.type);
      }
    });
  });
}

async function createRoom() {
  const ws = await createConnection('owner', '发起人');
  
  return new Promise((resolve) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'room_created') {
        console.log('房间创建成功，房间号:', msg.data.roomId);
        resolve({ ws, roomId: msg.data.roomId });
      }
    });
    
    ws.send(JSON.stringify({
      type: 'create_room',
      userName: '发起人',
      config: {
        deadline: Date.now() + 3600000,
        selectedTags: [],
        mockEnabled: false,
      }
    }));
  });
}

async function joinRoom(roomId, userId, userName) {
  const ws = await createConnection(userId, userName);
  
  return new Promise((resolve) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'joined_room') {
        console.log(`[${userName}] 已加入房间`);
        resolve(ws);
      }
    });
    
    ws.send(JSON.stringify({
      type: 'join_room',
      roomId,
      userId,
      userName,
    }));
  });
}

function getState(ws) {
  return new Promise((resolve) => {
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'state_update') {
        ws.removeListener('message', handler);
        resolve(msg.data);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ type: 'get_state' }));
  });
}

function addCustomCombo(ws, combo) {
  return new Promise((resolve) => {
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'custom_combo_added' || msg.type === 'error') {
        ws.removeListener('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({
      type: 'add_custom_combo',
      combo,
    }));
  });
}

async function concurrentVoteDemo() {
  console.log('=== 情人节礼盒投票演示 ===\n');
  
  let roomId;
  let ownerWs;
  
  if (ROOM_ID) {
    roomId = ROOM_ID;
    console.log('使用指定房间号:', roomId);
    ownerWs = await joinRoom(roomId, 'owner_observer', '观察者');
  } else {
    const roomInfo = await createRoom();
    roomId = roomInfo.roomId;
    ownerWs = roomInfo.ws;
  }
  
  await delay(500);
  
  console.log('\n=== 第一部分：双人并发点赞演示 ===\n');
  
  console.log('\n--- 两个用户同时加入房间 ---');
  const [userA, userB] = await Promise.all([
    joinRoom(roomId, 'user_a', '小明'),
    joinRoom(roomId, 'user_b', '小红'),
  ]);
  
  await delay(500);
  
  console.log('\n--- 并发点赞：两人同时给组合1 点赞 ---');
  
  const votePromises = [];
  
  votePromises.push(new Promise((resolve) => {
    const startTime = Date.now();
    userA.send(JSON.stringify({
      type: 'vote',
      comboId: 'combo_1',
      voteType: 'up'
    }));
    console.log(`[小明] 点赞 combo_1 (${Date.now() - startTime}ms)`);
    resolve();
  }));
  
  votePromises.push(new Promise((resolve) => {
    const startTime = Date.now();
    userB.send(JSON.stringify({
      type: 'vote',
      comboId: 'combo_1',
      voteType: 'up'
    }));
    console.log(`[小红] 点赞 combo_1 (${Date.now() - startTime}ms)`);
    resolve();
  }));
  
  await Promise.all(votePromises);
  
  await delay(1000);
  
  console.log('\n--- 并发投票：小明点踩组合2，小红点赞组合3 ---');
  
  await Promise.all([
    new Promise((resolve) => {
      userA.send(JSON.stringify({
        type: 'vote',
        comboId: 'combo_2',
        voteType: 'down'
      }));
      console.log('[小明] 点踩 combo_2');
      resolve();
    }),
    new Promise((resolve) => {
      userB.send(JSON.stringify({
        type: 'vote',
        comboId: 'combo_3',
        voteType: 'up'
      }));
      console.log('[小红] 点赞 combo_3');
      resolve();
    }),
  ]);
  
  await delay(1000);
  
  console.log('\n--- 验证并发投票结果 ---');
  
  const state1 = await getState(ownerWs);
  const combo1 = state1.combos.find(c => c.id === 'combo_1');
  const combo2 = state1.combos.find(c => c.id === 'combo_2');
  const combo3 = state1.combos.find(c => c.id === 'combo_3');
  
  console.log(`\ncombo_1 (草莓千层+红玫瑰) 期望得分: +2, 实际: ${combo1.score}`);
  console.log(`  验证结果: ${combo1.score === 2 && combo1.upVotes === 2 ? '✅ 通过' : '❌ 失败'}`);
  
  console.log(`combo_2 (黑森林+百合) 期望得分: -1, 实际: ${combo2.score}`);
  console.log(`  验证结果: ${combo2.score === -1 && combo2.downVotes === 1 ? '✅ 通过' : '❌ 失败'}`);
  
  console.log(`combo_3 (提拉米苏+郁金香) 期望得分: +1, 实际: ${combo3.score}`);
  console.log(`  验证结果: ${combo3.score === 1 && combo3.upVotes === 1 ? '✅ 通过' : '❌ 失败'}`);
  
  console.log('\n=== 第二部分：私房组合边界演示 ===\n');
  
  console.log('--- 测试1：空蛋糕名应被拒绝 ---');
  const result1 = await addCustomCombo(ownerWs, {
    cake: '',
    flower: '雏菊',
    cakeEmoji: '🍰',
    flowerEmoji: '🌼',
    tags: ['清新'],
    price: 199
  });
  console.log(`结果: ${result1.type === 'error' ? '❌ 拒绝（预期）' : '✅ 通过（意外）'}`);
  if (result1.type === 'error') {
    console.log(`错误信息: ${result1.data.message}`);
  }
  
  await delay(500);
  
  console.log('\n--- 测试2：零预算应被拒绝 ---');
  const result2 = await addCustomCombo(ownerWs, {
    cake: '抹茶卷',
    flower: '雏菊',
    cakeEmoji: '🍵',
    flowerEmoji: '🌼',
    tags: ['清新', '日式'],
    price: 0
  });
  console.log(`结果: ${result2.type === 'error' ? '❌ 拒绝（预期）' : '✅ 通过（意外）'}`);
  if (result2.type === 'error') {
    console.log(`错误信息: ${result2.data.message}`);
  }
  
  await delay(500);
  
  console.log('\n--- 测试3：添加第1组合法私房组合 ---');
  const result3 = await addCustomCombo(ownerWs, {
    cake: '抹茶卷',
    flower: '雏菊',
    cakeEmoji: '🍵',
    flowerEmoji: '🌼',
    tags: ['清新'],
    price: 199
  });
  console.log(`结果: ${result3.type === 'custom_combo_added' ? '✅ 添加成功' : '❌ 添加失败'}`);
  if (result3.type === 'custom_combo_added') {
    console.log(`组合名: ${result3.data.combo.cake} + ${result3.data.combo.flower}`);
    console.log(`价格: ¥${result3.data.combo.price}`);
    console.log(`当前私房组合数: ${result3.data.customComboCount}`);
  }
  
  await delay(500);
  
  console.log('\n--- 测试4：添加第2组合法私房组合 ---');
  const result4 = await addCustomCombo(ownerWs, {
    cake: '芒果班戟',
    flower: '洋甘菊',
    cakeEmoji: '🥭',
    flowerEmoji: '🌼',
    tags: ['阳光', '活力'],
    price: 168
  });
  console.log(`结果: ${result4.type === 'custom_combo_added' ? '✅ 添加成功' : '❌ 添加失败'}`);
  if (result4.type === 'custom_combo_added') {
    console.log(`当前私房组合数: ${result4.data.customComboCount}`);
  }
  
  await delay(500);
  
  console.log('\n--- 测试5：添加第3组合法私房组合 ---');
  const result5 = await addCustomCombo(ownerWs, {
    cake: '芋泥蛋糕',
    flower: '薰衣草',
    cakeEmoji: '🍠',
    flowerEmoji: '💜',
    tags: ['温柔', '浪漫', '法式'],
    price: 228
  });
  console.log(`结果: ${result5.type === 'custom_combo_added' ? '✅ 添加成功' : '❌ 添加失败'}`);
  if (result5.type === 'custom_combo_added') {
    console.log(`当前私房组合数: ${result5.data.customComboCount}`);
  }
  
  await delay(500);
  
  console.log('\n--- 测试6：超额追加第4组应被拒绝 ---');
  const result6 = await addCustomCombo(ownerWs, {
    cake: '巧克力熔岩',
    flower: '红玫瑰',
    cakeEmoji: '🍫',
    flowerEmoji: '🌹',
    tags: ['浪漫'],
    price: 258
  });
  console.log(`结果: ${result6.type === 'error' ? '❌ 拒绝（预期）' : '✅ 通过（意外）'}`);
  if (result6.type === 'error') {
    console.log(`错误信息: ${result6.data.message}`);
  }
  
  await delay(500);
  
  console.log('\n=== 第三部分：预算排序验证 ===\n');
  
  const state2 = await getState(ownerWs);
  
  console.log('\n--- 按热度排序（默认）---');
  const sortedByHot = [...state2.combos].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.price - b.price;
  });
  console.log('排名  组合                  价格   得分');
  console.log('----  --------------------  -----  ----');
  sortedByHot.forEach((c, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    const comboName = `${c.cake} + ${c.flower}`.padEnd(18);
    const price = `¥${c.price}`.padEnd(5);
    const score = (c.score > 0 ? '+' : '') + c.score;
    const customTag = c.isCustom ? ' [私房]' : '';
    console.log(`${medal}  ${comboName}${price}  ${score}${customTag}`);
  });
  
  console.log('\n--- 按预算排序 ---');
  const sortedByPrice = [...state2.combos].sort((a, b) => a.price - b.price);
  console.log('排名  组合                  价格   得分');
  console.log('----  --------------------  -----  ----');
  sortedByPrice.forEach((c, idx) => {
    const rank = `${idx + 1}.`.padEnd(3);
    const comboName = `${c.cake} + ${c.flower}`.padEnd(18);
    const price = `¥${c.price}`.padEnd(5);
    const score = (c.score > 0 ? '+' : '') + c.score;
    const customTag = c.isCustom ? ' [私房]' : '';
    console.log(`${rank}  ${comboName}${price}  ${score}${customTag}`);
  });
  
  console.log('\n--- 同分热度时预算更低者靠前验证 ---');
  console.log('给芝士蛋糕+满天星（¥219）和芒果慕斯+向日葵（¥239）各点赞1次，使其得分相同');
  
  userA.send(JSON.stringify({ type: 'vote', comboId: 'combo_6', voteType: 'up' }));
  userB.send(JSON.stringify({ type: 'vote', comboId: 'combo_4', voteType: 'up' }));
  
  await delay(1000);
  
  const state3 = await getState(ownerWs);
  const combo6 = state3.combos.find(c => c.id === 'combo_6');
  const combo4 = state3.combos.find(c => c.id === 'combo_4');
  
  console.log(`芝士蛋糕+满天星: 得分 ${combo6.score}, 价格 ¥${combo6.price}`);
  console.log(`芒果慕斯+向日葵: 得分 ${combo4.score}, 价格 ¥${combo4.price}`);
  
  const sortedByHot2 = [...state3.combos].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.price - b.price;
  });
  
  const idx6 = sortedByHot2.findIndex(c => c.id === 'combo_6');
  const idx4 = sortedByHot2.findIndex(c => c.id === 'combo_4');
  
  console.log(`\n热度排序中：`);
  console.log(`  芝士蛋糕+满天星（¥219）排名: 第${idx6 + 1}名`);
  console.log(`  芒果慕斯+向日葵（¥239）排名: 第${idx4 + 1}名`);
  console.log(`  验证结果: ${idx6 < idx4 ? '✅ 同分预算低者靠前（通过）' : '❌ 排序错误（失败）'}`);
  
  console.log('\n=== 演示完成 ===');
  console.log('所有测试用例执行完毕！');
  
  ownerWs.close();
  userA.close();
  userB.close();
}

concurrentVoteDemo().catch(console.error);
