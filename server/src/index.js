const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = new Map();

const MAX_CUSTOM_COMBOS = 3;
const LAST_BUS_MINUTES = 10;
const MAX_ACTIVITY_LOGS = 50;
const PHASE_NORMAL = 'normal';
const PHASE_LAST_BUS = 'last_bus';

const MOCK_USERS = [
  { id: 'mock_1', name: '小明' },
  { id: 'mock_2', name: '小红' },
  { id: 'mock_3', name: '小刚' },
  { id: 'mock_4', name: '小丽' },
  { id: 'mock_5', name: '小华' },
];

const DEFAULT_COMBOS = [
  { id: 'combo_1', cake: '草莓千层', flower: '红玫瑰', cakeEmoji: '🍰', flowerEmoji: '🌹', tags: ['经典', '浪漫'], price: 299, isCustom: false },
  { id: 'combo_2', cake: '黑森林', flower: '百合', cakeEmoji: '🍫', flowerEmoji: '💐', tags: ['优雅', '清新'], price: 259, isCustom: false },
  { id: 'combo_3', cake: '提拉米苏', flower: '郁金香', cakeEmoji: '☕', flowerEmoji: '🌷', tags: ['意式', '高贵'], price: 329, isCustom: false },
  { id: 'combo_4', cake: '芒果慕斯', flower: '向日葵', cakeEmoji: '🥭', flowerEmoji: '🌻', tags: ['阳光', '活力'], price: 239, isCustom: false },
  { id: 'combo_5', cake: '抹茶千层', flower: '康乃馨', cakeEmoji: '🍵', flowerEmoji: '🌸', tags: ['日式', '温馨'], price: 269, isCustom: false },
  { id: 'combo_6', cake: '芝士蛋糕', flower: '满天星', cakeEmoji: '🧀', flowerEmoji: '✨', tags: ['简约', '纯粹'], price: 219, isCustom: false },
];

const CAKE_EMOJI_OPTIONS = ['🍰', '🍫', '☕', '🥭', '🍵', '🧀', '🎂', '🍮', '🍩', '🍪'];
const FLOWER_EMOJI_OPTIONS = ['🌹', '💐', '🌷', '🌻', '🌸', '✨', '🌺', '💮', '🏵️', '🌼'];

function validateComboInput(combo) {
  const errors = [];
  
  if (!combo) {
    return { valid: false, errors: ['组合数据不能为空'] };
  }
  
  if (!combo.cake || typeof combo.cake !== 'string' || combo.cake.trim().length === 0) {
    errors.push('蛋糕名称不能为空');
  } else if (combo.cake.trim().length > 20) {
    errors.push('蛋糕名称不能超过20个字符');
  }
  
  if (!combo.flower || typeof combo.flower !== 'string' || combo.flower.trim().length === 0) {
    errors.push('鲜花名称不能为空');
  } else if (combo.flower.trim().length > 20) {
    errors.push('鲜花名称不能超过20个字符');
  }
  
  if (!combo.cakeEmoji || typeof combo.cakeEmoji !== 'string') {
    errors.push('请选择蛋糕表情');
  }
  
  if (!combo.flowerEmoji || typeof combo.flowerEmoji !== 'string') {
    errors.push('请选择鲜花表情');
  }
  
  if (!combo.tags || !Array.isArray(combo.tags) || combo.tags.length === 0) {
    errors.push('请至少选择一个风格标签');
  } else if (combo.tags.length > 3) {
    errors.push('风格标签最多选择3个');
  }
  
  if (combo.price === undefined || combo.price === null || isNaN(combo.price)) {
    errors.push('预算价格不能为空');
  } else if (typeof combo.price === 'string' && combo.price.trim() === '') {
    errors.push('预算价格不能为空');
  } else {
    const priceNum = Number(combo.price);
    if (isNaN(priceNum)) {
      errors.push('预算价格必须是数字');
    } else if (priceNum <= 0) {
      errors.push('预算价格必须大于0');
    } else if (priceNum > 9999) {
      errors.push('预算价格不能超过9999元');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

function createRoom(ownerId, ownerName, config) {
  const roomId = uuidv4().slice(0, 8);
  const now = Date.now();
  
  const combos = config.selectedTags && config.selectedTags.length > 0
    ? DEFAULT_COMBOS.filter(c => c.tags.some(t => config.selectedTags.includes(t)))
    : [...DEFAULT_COMBOS];

  const deadline = config.deadline || now + 3600000;
  const timeLeft = deadline - now;
  const initialPhase = timeLeft <= LAST_BUS_MINUTES * 60 * 1000 ? PHASE_LAST_BUS : PHASE_NORMAL;

  const room = {
    id: roomId,
    ownerId,
    ownerName,
    config: {
      deadline,
      selectedTags: config.selectedTags || [],
      maxCustomCombos: MAX_CUSTOM_COMBOS,
      lastBusMinutes: LAST_BUS_MINUTES,
    },
    phase: initialPhase,
    phaseTimer: null,
    combos: combos.map(c => ({
      ...c,
      upVotes: 0,
      downVotes: 0,
      score: 0,
      recentDownVotes: [],
      inWarning: false,
      voters: { up: new Set(), down: new Set() },
      voteDetails: [],
    })),
    customComboCount: 0,
    users: new Map(),
    votes: [],
    activities: [],
    isLocked: false,
    createdAt: now,
    mockEnabled: config.mockEnabled !== false,
  };

  if (config.customCombos && Array.isArray(config.customCombos) && config.customCombos.length > 0) {
    const maxCustom = Math.min(config.customCombos.length, MAX_CUSTOM_COMBOS);
    for (let i = 0; i < maxCustom; i++) {
      const validation = validateComboInput(config.customCombos[i]);
      if (validation.valid) {
        addCustomComboToRoom(room, config.customCombos[i]);
      }
    }
  }

  addUserToRoom(room, ownerId, ownerName);
  rooms.set(roomId, room);

  if (room.mockEnabled) {
    startMockVoting(room);
  }

  startPhaseTimer(room);

  return room;
}

function addCustomComboToRoom(room, comboInput) {
  if (room.customComboCount >= MAX_CUSTOM_COMBOS) {
    return { success: false, error: `最多只能添加${MAX_CUSTOM_COMBOS}组私房组合` };
  }
  
  const validation = validateComboInput(comboInput);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  const newCombo = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    cake: comboInput.cake.trim(),
    flower: comboInput.flower.trim(),
    cakeEmoji: comboInput.cakeEmoji,
    flowerEmoji: comboInput.flowerEmoji,
    tags: comboInput.tags,
    price: Math.round(Number(comboInput.price) * 100) / 100,
    isCustom: true,
    upVotes: 0,
    downVotes: 0,
    score: 0,
    recentDownVotes: [],
    inWarning: false,
    voters: { up: new Set(), down: new Set() },
    createdAt: Date.now(),
  };
  
  room.combos.push(newCombo);
  room.customComboCount++;
  
  return { success: true, combo: newCombo };
}

function removeCustomComboFromRoom(room, comboId) {
  const comboIndex = room.combos.findIndex(c => c.id === comboId);
  if (comboIndex === -1) {
    return { success: false, error: '组合不存在' };
  }
  
  const combo = room.combos[comboIndex];
  if (!combo.isCustom) {
    return { success: false, error: '只能删除私房组合' };
  }
  
  room.combos.splice(comboIndex, 1);
  room.customComboCount--;
  
  return { success: true };
}

function checkPhase(room) {
  const now = Date.now();
  const timeLeft = room.config.deadline - now;
  const shouldBeLastBus = timeLeft <= LAST_BUS_MINUTES * 60 * 1000 && timeLeft > 0 && !room.isLocked;
  const newPhase = shouldBeLastBus ? PHASE_LAST_BUS : PHASE_NORMAL;
  
  if (newPhase !== room.phase && !room.isLocked) {
    room.phase = newPhase;
    broadcastToRoom(room, {
      type: 'phase_change',
      data: {
        phase: room.phase,
        deadline: room.config.deadline,
        timeLeft: Math.max(0, room.config.deadline - Date.now()),
      }
    });
  }
  
  return room.phase;
}

function startPhaseTimer(room) {
  if (room.phaseTimer) {
    clearInterval(room.phaseTimer);
  }
  room.phaseTimer = setInterval(() => {
    checkPhase(room);
    if (room.isLocked || Date.now() > room.config.deadline + 60000) {
      clearInterval(room.phaseTimer);
      room.phaseTimer = null;
    }
  }, 1000);
}

function addActivity(room, activity) {
  const activityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    ...activity,
  };
  
  room.activities.unshift(activityItem);
  
  if (room.activities.length > MAX_ACTIVITY_LOGS) {
    room.activities = room.activities.slice(0, MAX_ACTIVITY_LOGS);
  }
  
  broadcastToRoom(room, {
    type: 'activity_item',
    data: activityItem,
  });
}

function getVoteWeight(room, voteType) {
  if (room.phase === PHASE_LAST_BUS && voteType === 'up') {
    return 2;
  }
  return 1;
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
    phase: room.phase,
    combos: room.combos.map(c => ({
      id: c.id,
      cake: c.cake,
      flower: c.flower,
      cakeEmoji: c.cakeEmoji,
      flowerEmoji: c.flowerEmoji,
      tags: c.tags,
      price: c.price,
      isCustom: c.isCustom || false,
      upVotes: c.upVotes,
      downVotes: c.downVotes,
      score: c.score,
      inWarning: c.inWarning,
    })),
    customComboCount: room.customComboCount,
    activities: room.activities,
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
  const prevVoteType = prevUp ? 'up' : (prevDown ? 'down' : null);
  
  if (voteType === prevVoteType) return;

  const currentPhase = room.phase;
  let scoreChange = 0;

  if (prevVoteType === 'up') {
    const prevWeight = getVoteWeight(room, 'up');
    scoreChange -= prevWeight;
    combo.voters.up.delete(userId);
    combo.upVotes--;
  }
  if (prevVoteType === 'down') {
    scoreChange += 1;
    combo.voters.down.delete(userId);
    combo.downVotes--;
    combo.recentDownVotes = combo.recentDownVotes.filter(v => v.userId !== userId);
  }

  if (voteType === 'up') {
    const weight = getVoteWeight(room, 'up');
    scoreChange += weight;
    combo.voters.up.add(userId);
    combo.upVotes++;
  } else if (voteType === 'down') {
    scoreChange -= 1;
    combo.voters.down.add(userId);
    combo.downVotes++;
    
    const now = Date.now();
    combo.recentDownVotes.push({ userId, timestamp: now });
    combo.recentDownVotes = combo.recentDownVotes.filter(v => now - v.timestamp < 60000);
    
    if (combo.recentDownVotes.length >= 3) {
      combo.inWarning = true;
    }
  }

  combo.score += scoreChange;

  if (combo.recentDownVotes.length < 3) {
    combo.inWarning = false;
  }

  const voteDetail = {
    userId,
    userName: user.name,
    voteType,
    phase: currentPhase,
    weight: voteType !== 'cancel' ? getVoteWeight(room, voteType) : 0,
    scoreChange,
    timestamp: Date.now(),
  };
  combo.voteDetails.push(voteDetail);

  room.votes.push({
    id: uuidv4(),
    userId,
    userName: user.name,
    comboId,
    voteType,
    phase: currentPhase,
    timestamp: Date.now(),
  });

  if (voteType !== 'cancel' || prevVoteType) {
    addActivity(room, {
      userId,
      userName: user.name,
      type: voteType === 'cancel' ? 'cancel' : voteType,
      comboId,
      comboName: `${combo.cake} + ${combo.flower}`,
      phase: currentPhase,
      weight: voteType !== 'cancel' ? getVoteWeight(room, voteType) : 0,
      scoreChange,
    });
  }

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
      phase: currentPhase,
      scoreChange,
    }
  });
}

function lockRoom(room, userId) {
  if (room.ownerId !== userId) return false;
  room.isLocked = true;
  
  if (room.phaseTimer) {
    clearInterval(room.phaseTimer);
    room.phaseTimer = null;
  }
  
  const sortedCombos = [...room.combos].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.price - b.price;
  });
  
  broadcastToRoom(room, {
    type: 'room_locked',
    data: {
      isLocked: true,
      finalRank: sortedCombos.map((c, idx) => ({
        rank: idx + 1,
        id: c.id,
        cake: c.cake,
        flower: c.flower,
        price: c.price,
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

        case 'add_custom_combo': {
          if (!currentRoom || !currentUser) return;
          
          if (currentRoom.ownerId !== currentUser.id) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: '只有发起人可以添加私房组合' }
            }));
            return;
          }
          
          if (currentRoom.isLocked) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: '投票已锁定，无法添加组合' }
            }));
            return;
          }
          
          const result = addCustomComboToRoom(currentRoom, data.combo);
          
          if (result.success) {
            ws.send(JSON.stringify({
              type: 'custom_combo_added',
              data: {
                combo: {
                  id: result.combo.id,
                  cake: result.combo.cake,
                  flower: result.combo.flower,
                  cakeEmoji: result.combo.cakeEmoji,
                  flowerEmoji: result.combo.flowerEmoji,
                  tags: result.combo.tags,
                  price: result.combo.price,
                  isCustom: true,
                  upVotes: 0,
                  downVotes: 0,
                  score: 0,
                  inWarning: false,
                },
                customComboCount: currentRoom.customComboCount,
              }
            }));
            
            broadcastToRoom(currentRoom, {
              type: 'combo_list_updated',
              data: { combos: getRoomState(currentRoom).combos }
            });
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: result.errors ? result.errors.join('；') : result.error }
            }));
          }
          break;
        }

        case 'remove_custom_combo': {
          if (!currentRoom || !currentUser) return;
          
          if (currentRoom.ownerId !== currentUser.id) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: '只有发起人可以删除私房组合' }
            }));
            return;
          }
          
          if (currentRoom.isLocked) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: '投票已锁定，无法删除组合' }
            }));
            return;
          }
          
          const result = removeCustomComboFromRoom(currentRoom, data.comboId);
          
          if (result.success) {
            broadcastToRoom(currentRoom, {
              type: 'combo_list_updated',
              data: { combos: getRoomState(currentRoom).combos }
            });
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: result.error }
            }));
          }
          break;
        }

        case 'get_combos': {
          if (!currentRoom) return;
          ws.send(JSON.stringify({
            type: 'combo_list',
            data: { combos: getRoomState(currentRoom).combos }
          }));
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
