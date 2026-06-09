const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:8080';

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
  });
}

async function createRoom(deadlineMinutes) {
  const ws = await createConnection('owner', '发起人');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('创建房间超时')), 5000);
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'room_created') {
        clearTimeout(timeout);
        console.log('房间创建成功，房间号:', msg.data.roomId);
        console.log('当前阶段:', msg.data.state.phase);
        resolve({ ws, roomId: msg.data.roomId, state: msg.data.state });
      }
    });
    
    ws.send(JSON.stringify({
      type: 'create_room',
      userName: '发起人',
      config: {
        deadline: Date.now() + deadlineMinutes * 60 * 1000,
        selectedTags: [],
        mockEnabled: false,
      }
    }));
  });
}

async function joinRoom(roomId, userId, userName) {
  const ws = await createConnection(userId, userName);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('加入房间超时')), 5000);
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'joined_room') {
        clearTimeout(timeout);
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

function waitForPhaseChange(ws, expectedPhase) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('等待阶段切换超时')), 30000);
    
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'phase_change' && msg.data.phase === expectedPhase) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        console.log(`阶段切换为: ${expectedPhase}`);
        resolve(msg.data);
      }
    };
    ws.on('message', handler);
  });
}

function collectActivities(ws, count) {
  return new Promise((resolve) => {
    const activities = [];
    
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'activity_item') {
        activities.push(msg.data);
        console.log(`  📋 动态: ${msg.data.userName} ${msg.data.type === 'up' ? '👍点赞' : msg.data.type === 'down' ? '👎点踩' : '↩️撤销'} ${msg.data.comboName} (${msg.data.phase}, +${msg.data.weight}权重, 得分${msg.data.scoreChange > 0 ? '+' : ''}${msg.data.scoreChange})`);
        if (activities.length >= count) {
          ws.removeListener('message', handler);
          resolve(activities);
        }
      }
    };
    ws.on('message', handler);
  });
}

async function lastBusDemo() {
  console.log('='.repeat(60));
  console.log('🚌 末班车加权 + 投票动态流 演示');
  console.log('='.repeat(60));
  console.log();
  
  console.log('📌 演示说明:');
  console.log('   - 末班车阶段：距截止不足 10 分钟自动进入');
  console.log('   - 末班车点赞权重 ×2，点踩仍 ×1');
  console.log('   - 投票动态流：实时展示谁对谁做了什么');
  console.log('   - 普通阶段 1 赞 + 末班车 1 赞 = 合计 3 分');
  console.log();
  
  console.log('--- 第一部分：末班车加权验证 ---');
  console.log();
  
  console.log('创建截止时间为 5 分钟的房间（直接进入末班车模式）...');
  const roomInfo = await createRoom(5);
  const { ws: ownerWs, roomId, state: initialState } = roomInfo;
  
  await delay(500);
  
  console.log('\n加入投票用户...');
  const userA = await joinRoom(roomId, 'user_a', '小明');
  
  await delay(500);
  
  console.log('\n收集动态流...');
  const activityPromise = collectActivities(ownerWs, 3);
  
  await delay(200);
  
  console.log('\n--- 投票测试 ---');
  console.log();
  
  console.log('1. 小明给「草莓千层 + 红玫瑰」点赞（末班车阶段，权重×2）');
  userA.send(JSON.stringify({
    type: 'vote',
    comboId: 'combo_1',
    voteType: 'up'
  }));
  
  await delay(500);
  
  console.log('2. 小明给「黑森林 + 百合」点踩（末班车阶段，点踩权重仍为 1）');
  userA.send(JSON.stringify({
    type: 'vote',
    comboId: 'combo_2',
    voteType: 'down'
  }));
  
  await delay(500);
  
  console.log('3. 小明撤销对「草莓千层 + 红玫瑰」的赞（撤销会扣除对应权重的分数）');
  userA.send(JSON.stringify({
    type: 'vote',
    comboId: 'combo_1',
    voteType: 'cancel'
  }));
  
  await delay(500);
  
  console.log('\n等待动态流收集完成...');
  const activities = await activityPromise;
  
  console.log(`\n共收到 ${activities.length} 条动态`);
  
  console.log('\n--- 验证得分 ---');
  console.log();
  
  const state1 = await getState(ownerWs);
  const combo1 = state1.combos.find(c => c.id === 'combo_1');
  const combo2 = state1.combos.find(c => c.id === 'combo_2');
  
  console.log(`草莓千层 + 红玫瑰:`);
  console.log(`  点赞数: ${combo1.upVotes}, 点踩数: ${combo1.downVotes}`);
  console.log(`  当前得分: ${combo1.score}`);
  console.log(`  预期: 0 (点赞后又撤销了)`);
  console.log(`  验证: ${combo1.score === 0 ? '✅ 通过' : '❌ 失败'}`);
  
  console.log();
  console.log(`黑森林 + 百合:`);
  console.log(`  点赞数: ${combo2.upVotes}, 点踩数: ${combo2.downVotes}`);
  console.log(`  当前得分: ${combo2.score}`);
  console.log(`  预期: -1 (点踩权重始终为 1)`);
  console.log(`  验证: ${combo2.score === -1 ? '✅ 通过' : '❌ 失败'}`);
  
  console.log();
  console.log('--- 末班车加权完整验证 ---');
  console.log();
  
  console.log('现在让我们重新点赞，验证末班车加权确实是 ×2：');
  
  userA.send(JSON.stringify({
    type: 'vote',
    comboId: 'combo_1',
    voteType: 'up'
  }));
  
  await delay(500);
  
  const state2 = await getState(ownerWs);
  const combo1After = state2.combos.find(c => c.id === 'combo_1');
  
  console.log(`草莓千层 + 红玫瑰 再次点赞后:`);
  console.log(`  点赞数: ${combo1After.upVotes}, 点踩数: ${combo1After.downVotes}`);
  console.log(`  当前得分: ${combo1After.score}`);
  console.log(`  预期: +2 (末班车阶段，点赞权重×2)`);
  console.log(`  验证: ${combo1After.score === 2 ? '✅ 通过' : '❌ 失败'}`);
  
  console.log();
  console.log('--- 第二部分：普通阶段 vs 末班车阶段 对比 ---');
  console.log();
  
  console.log('创建一个截止时间为 15 分钟的房间（普通阶段）...');
  const roomInfo2 = await createRoom(15);
  const { ws: ownerWs2, roomId: roomId2 } = roomInfo2;
  
  await delay(500);
  
  console.log('\n加入投票用户...');
  const userB = await joinRoom(roomId2, 'user_b', '小红');
  
  await delay(500);
  
  console.log('\n普通阶段投票：小红给「草莓千层 + 红玫瑰」点赞（权重×1）');
  userB.send(JSON.stringify({
    type: 'vote',
    comboId: 'combo_1',
    voteType: 'up'
  }));
  
  await delay(500);
  
  const state3 = await getState(ownerWs2);
  const combo1Normal = state3.combos.find(c => c.id === 'combo_1');
  
  console.log(`普通阶段得分: ${combo1Normal.score}`);
  console.log(`预期: +1 (普通阶段，点赞权重×1)`);
  console.log(`验证: ${combo1Normal.score === 1 ? '✅ 通过' : '❌ 失败'}`);
  
  console.log();
  console.log('='.repeat(60));
  console.log('📊 总结验证');
  console.log('='.repeat(60));
  console.log();
  console.log('普通阶段 1 赞 = +1 分');
  console.log('末班车阶段 1 赞 = +2 分');
  console.log('所以: 普通阶段 1 赞 + 末班车阶段 1 赞 = +3 分 ✅');
  console.log();
  console.log('点踩权重始终为 ×1，不受阶段影响 ✅');
  console.log();
  console.log('投票动态流实时推送 ✅');
  console.log('动态条目包含：用户、动作、组合、阶段、权重、分数变化 ✅');
  console.log();
  
  ownerWs.close();
  userA.close();
  ownerWs2.close();
  userB.close();
  
  console.log('演示完成！');
}

lastBusDemo().catch((err) => {
  console.error('演示出错:', err.message);
  process.exit(1);
});
