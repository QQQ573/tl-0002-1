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

async function concurrentVoteDemo() {
  console.log('=== 双人并发点赞演示 ===\n');
  
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
  
  console.log('\n--- 验证结果：获取房间状态 ---');
  
  return new Promise((resolve) => {
    ownerWs.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'state_update') {
        const combos = msg.data.combos;
        const sorted = [...combos].sort((a, b) => b.score - a.score);
        
        console.log('\n=== 最终排名 ===');
        sorted.forEach((c, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          console.log(`${medal} ${c.cake} + ${c.flower}`);
          console.log(`   得分: ${c.score > 0 ? '+' : ''}${c.score} (👍${c.upVotes} 👎${c.downVotes})`);
        });
        
        console.log('\n=== 期望排序验证 ===');
        const combo1 = sorted.find(c => c.id === 'combo_1');
        console.log(`combo_1 (草莓千层+红玫瑰) 期望得分: +2, 实际: ${combo1.score}`);
        console.log(`  验证结果: ${combo1.score === 2 && combo1.upVotes === 2 ? '✅ 通过' : '❌ 失败'}`);
        
        const combo2 = sorted.find(c => c.id === 'combo_2');
        console.log(`combo_2 (黑森林+百合) 期望得分: -1, 实际: ${combo2.score}`);
        console.log(`  验证结果: ${combo2.score === -1 && combo2.downVotes === 1 ? '✅ 通过' : '❌ 失败'}`);
        
        const combo3 = sorted.find(c => c.id === 'combo_3');
        console.log(`combo_3 (提拉米苏+郁金香) 期望得分: +1, 实际: ${combo3.score}`);
        console.log(`  验证结果: ${combo3.score === 1 && combo3.upVotes === 1 ? '✅ 通过' : '❌ 失败'}`);
        
        console.log('\n演示完成！');
        
        ownerWs.close();
        userA.close();
        userB.close();
        
        resolve();
      }
    });
    
    ownerWs.send(JSON.stringify({ type: 'get_state' }));
  });
}

concurrentVoteDemo().catch(console.error);
