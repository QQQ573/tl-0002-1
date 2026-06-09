const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = new Map();

const MOCK_USERS = [
  { id: 'mock_1', name: '小明' },
  { id: 'mock_2', name: '小红' },
  { id: 'mock_3', name: '小刚' },
  { id: 'mock_4', name: '小丽' },
  { id: 'mock_5', name: '小华' },
];

const DEFAULT_COMBOS = [
  { id: 'combo_1', cake: '草莓千层', flower: '红玫瑰', cakeEmoji: '🍰', flowerEmoji: '🌹', tags: ['经典', '浪漫'] },
  { id: 'combo_2', cake: '黑森林', flower: '百合', cakeEmoji: '🍫', flowerEmoji: '💐', tags: ['优雅', '清新'] },
  { id: 'combo_3', cake: '提拉米苏', flower: '郁金香', cakeEmoji: '☕', flowerEmoji: '🌷', tags: ['意式', '高贵'] },
  { id: 'combo_4', cake: '芒果慕斯', flower: '向日葵', cakeEmoji: '🥭', flowerEmoji: '🌻', tags: ['阳光', '活力'] },
  { id: 'combo_5', cake: '抹茶千层', flower: '康乃馨', cakeEmoji: '🍵', flowerEmoji: '🌸', tags: ['日式', '温馨'] },
  { id: 'combo_6', cake: '芝士蛋糕', flower: '满天星', cakeEmoji: '🧀', flowerEmoji: '✨', tags: ['简约', '纯粹'] },
];

function createRoom(ownerId, ownerName, config) {
  const roomId = uuidv4().slice(0, 8);
  const now = Date.now();
  
  const combos = config.selectedTags && config.selectedTags.length > 0
    ? DEFAULT_COMBOS.filter(c => c.tags.some(t => config.selectedTags.includes(t)))
    : [...DEFAULT_COMBOS];

  const room = {
    id: roomId,
    ownerId,
    ownerName,
    config: {
      deadline: config.deadline || now + 3600000,
      selectedTags: config.selectedTags || [],
    },
    combos: combos.map(c => ({
      ...c,
      upVotes: 0,
      downVotes: 0,
      score: 0,
      recentDownVotes: [],
      inWarning: false,
      voters: { up: new Set(), down: new Set() }
    })),
    users: new Map(),
    votes: [],
    isLocked: false,
    createdAt: now,
    mockEnabled: config.mockEnabled !== false,
  };

  addUserToRoom(room, ownerId, ownerName);
  rooms.set(roomId, room);

  if (room.mockEnabled) {
    startMockVoting(room);
  }

  return room;
}

function addUserToRoom(room, userId, userName) {
  if (!room.users.has(userId)) {
    room.users.set(userId, {
      id: userId,
      name: userName,
      joinedAt: Date.now(),
      ws: null,
    });
  }
  return room.users.get(userId);
}

function getRoomState(room) {
  return {
    roomId: room.id,
    ownerId: room.ownerId,
    ownerName: room.ownerName,
    config: room.config,
    combos: room.combos.map(c => ({
      id: c.id,
      cake: c.cake,
      flower: c.flower,
      cakeEmoji: c.cakeEmoji,
      flowerEmoji: c.flowerEmoji,
      tags: c.tags,
      upVotes: c.upVotes,
      downVotes: c.downVotes,
      score: c.score,
      inWarning: c.inWarning,
    })),
    users: Array.from(room.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      online: u.ws !== null && u.ws.readyState === WebSocket.OPEN,
    })),
    isLocked: room.isLocked,
    createdAt: room.createdAt,
  };
}

function broadcastToRoom(room, message) {
  const data = JSON.stringify(message);
  room.users.forEach(user => {
    if (user.ws && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(data);
    }
  });
}

function handleVote(room, userId, comboId, voteType) {
  if (room.isLocked) return;
  
  const combo = room.combos.find(c => c.id === comboId);
  if (!combo) return;

  const user = room.users.get(userId);
  if (!user) return;

  const prevUp = combo.voters.up.has(userId);
  const prevDown = combo.voters.down.has(userId);

  if (voteType === 'up') {
    if (prevUp) return;
    if (prevDown) {
      combo.voters.down.delete(userId);
      combo.downVotes--;
      combo.recentDownVotes = combo.recentDownVotes.filter(v => v.userId !== userId);
    }
    combo.voters.up.add(userId);
    combo.upVotes++;
  } else if (voteType === 'down') {
    if (prevDown) return;
    if (prevUp) {
      combo.voters.up.delete(userId);
      combo.upVotes--;
    }
    combo.voters.down.add(userId);
    combo.downVotes++;
    
    const now = Date.now();
    combo.recentDownVotes.push({ userId, timestamp: now });
    combo.recentDownVotes = combo.recentDownVotes.filter(v => now - v.timestamp < 60000);
    
    if (combo.recentDownVotes.length >= 3) {
      combo.inWarning = true;
    }
  } else if (voteType === 'cancel') {
    if (prevUp) {
      combo.voters.up.delete(userId);
      combo.upVotes--;
    }
    if (prevDown) {
      combo.voters.down.delete(userId);
      combo.downVotes--;
      combo.recentDownVotes = combo.recentDownVotes.filter(v => v.userId !== userId);
    }
  }

  combo.score = combo.upVotes - combo.downVotes;

  if (combo.recentDownVotes.length < 3) {
    combo.inWarning = false;
  }

  room.votes.push({
    id: uuidv4(),
    userId,
    userName: user.name,
    comboId,
    voteType,
    timestamp: Date.now(),
  });

  broadcastToRoom(room, {
    type: 'vote_update',
    data: {
      combo: {
        id: combo.id,
        upVotes: combo.upVotes,
        downVotes: combo.downVotes,
        score: combo.score,
        inWarning: combo.inWarning,
      },
      voter: { id: userId, name: user.name },
      voteType,
    }
  });
}

function lockRoom(room, userId) {
  if (room.ownerId !== userId) return false;
  room.isLocked = true;
  
  const sortedCombos = [...room.combos].sort((a, b) => b.score - a.score);
  
  broadcastToRoom(room, {
    type: 'room_locked',
    data: {
      isLocked: true,
      finalRank: sortedCombos.map((c, idx) => ({
        rank: idx + 1,
        id: c.id,
        cake: c.cake,
        flower: c.flower,
        score: c.score,
        upVotes: c.upVotes,
        downVotes: c.downVotes,
      }))
    }
  });
  
  return true;
}

function startMockVoting(room) {
  let mockVoteCount = 0;
  const maxMockVotes = 20;

  function mockVote() {
    if (room.isLocked || mockVoteCount >= maxMockVotes) return;

    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    const combo = room.combos[Math.floor(Math.random() * room.combos.length)];
    const voteType = Math.random() > 0.35 ? 'up' : 'down';

    addUserToRoom(room, user.id, user.name);
    handleVote(room, user.id, combo.id, voteType);
    
    mockVoteCount++;
    
    const delay = 2000 + Math.random() * 4000;
    setTimeout(mockVote, delay);
  }

  MOCK_USERS.forEach((user, idx) => {
    setTimeout(() => {
      addUserToRoom(room, user.id, user.name);
      broadcastToRoom(room, {
        type: 'user_joined',
        data: { userId: user.id, userName: user.name }
      });
    }, idx * 800);
  });

  setTimeout(mockVote, 3000);
}

wss.on('connection', (ws, req) => {
  let currentRoom = null;
  let currentUser = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'create_room': {
          const room = createRoom(
            data.userId || uuidv4(),
            data.userName || '发起人',
            data.config || {}
          );
          currentRoom = room;
          currentUser = room.users.get(room.ownerId);
          currentUser.ws = ws;

          ws.send(JSON.stringify({
            type: 'room_created',
            data: {
              roomId: room.id,
              userId: currentUser.id,
              state: getRoomState(room),
            }
          }));
          break;
        }

        case 'join_room': {
          const room = rooms.get(data.roomId);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: '房间不存在' }
            }));
            return;
          }

          const userId = data.userId || uuidv4();
          const user = addUserToRoom(room, userId, data.userName || '匿名用户');
          user.ws = ws;
          currentRoom = room;
          currentUser = user;

          ws.send(JSON.stringify({
            type: 'joined_room',
            data: {
              roomId: room.id,
              userId,
              state: getRoomState(room),
            }
          }));

          broadcastToRoom(room, {
            type: 'user_joined',
            data: { userId, userName: user.name }
          });
          break;
        }

        case 'vote': {
          if (!currentRoom || !currentUser) return;
          handleVote(currentRoom, currentUser.id, data.comboId, data.voteType);
          break;
        }

        case 'lock_room': {
          if (!currentRoom || !currentUser) return;
          lockRoom(currentRoom, currentUser.id);
          break;
        }

        case 'get_state': {
          if (!currentRoom) return;
          ws.send(JSON.stringify({
            type: 'state_update',
            data: getRoomState(currentRoom)
          }));
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
          break;
        }
      }
    } catch (e) {
      console.error('Message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentUser) {
      currentUser.ws = null;
      broadcastToRoom(currentRoom, {
        type: 'user_left',
        data: { userId: currentUser.id, userName: currentUser.name }
      });
    }
  });
});

console.log(`WebSocket server running on port ${PORT}`);
