<template>
  <div class="voting-room">
    <header class="room-header">
      <div class="header-left">
        <button class="back-btn" @click="handleLeave">← 退出</button>
      </div>
      <div class="header-center">
        <h2 class="room-title">💝 情人节礼盒投票</h2>
        <div class="room-id">房间号: {{ roomId }}</div>
      </div>
      <div class="header-right">
        <div class="connection-status" :class="{ connected: isConnected, reconnecting: isReconnecting }">
          <span class="status-dot"></span>
          <span v-if="isConnected">已连接</span>
          <span v-else-if="isReconnecting">重连中...</span>
          <span v-else>已断开</span>
        </div>
      </div>
    </header>

    <div v-if="roomState" class="room-content">
      <div class="room-meta">
        <div class="meta-item">
          <span class="meta-icon">👥</span>
          <span>{{ onlineUsers }} 人在线</span>
        </div>
        <div class="meta-item" v-if="!roomState.isLocked">
          <span class="meta-icon">⏱️</span>
          <span>剩余 {{ formatTime(remainingTime) }}</span>
        </div>
        <div class="meta-item" v-else>
          <span class="meta-icon">🔒</span>
          <span>已锁定结果</span>
        </div>
      </div>

      <Leaderboard :combos="rankedCombos" />

      <div class="combos-section">
        <h3 class="section-title">🎁 为组合投票</h3>
        <div class="combos-grid">
          <ComboCard 
            v-for="combo in roomState.combos"
            :key="combo.id"
            :combo="combo"
            :disabled="roomState.isLocked"
            :user-vote="getUserVote(combo.id)"
            @vote="handleVote"
          />
        </div>
      </div>

      <WarningZone :combos="warningCombos" />

      <div v-if="isOwner && !roomState.isLocked" class="owner-actions">
        <button class="btn btn-lock" @click="lockRoom">
          🔒 锁定结果并生成海报
        </button>
      </div>

      <SharePoster 
        v-if="roomState.isLocked && showPoster"
        :combos="rankedCombos"
        :room-id="roomId"
        @close="showPoster = false"
      />
    </div>

    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p>连接中...</p>
      <p class="loading-tip" v-if="isReconnecting">正在重连，请稍候...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'
import ComboCard from './ComboCard.vue'
import Leaderboard from './Leaderboard.vue'
import WarningZone from './WarningZone.vue'
import SharePoster from './SharePoster.vue'

const props = defineProps({
  roomId: String,
  userId: String,
  userName: String,
  isOwner: Boolean,
})

const emit = defineEmits(['leave'])

const { isConnected, isReconnecting, lastMessage, connect, send, close } = useWebSocket()

const roomState = ref(null)
const showPoster = ref(false)
const userVotes = ref({})
const remainingTime = ref(0)
const currentUserId = ref('')
const hasJoined = ref(false)

let timerInterval = null

const rankedCombos = computed(() => {
  if (!roomState.value) return []
  return [...roomState.value.combos].sort((a, b) => b.score - a.score)
})

const warningCombos = computed(() => {
  if (!roomState.value) return []
  return roomState.value.combos.filter(c => c.inWarning)
})

const onlineUsers = computed(() => {
  if (!roomState.value) return 0
  return roomState.value.users.filter(u => u.online).length
})

function getUserVote(comboId) {
  return userVotes.value[comboId] || null
}

function formatTime(ms) {
  if (ms <= 0) return '已结束'
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 60) {
    const hours = Math.floor(mins / 60)
    return `${hours}小时${mins % 60}分`
  }
  return `${mins}分${secs}秒`
}

function updateRemainingTime() {
  if (!roomState.value || roomState.value.isLocked) return
  const now = Date.now()
  const deadline = roomState.value.config.deadline
  remainingTime.value = Math.max(0, deadline - now)
}

function handleVote(comboId, voteType) {
  if (roomState.value?.isLocked) return
  userVotes.value[comboId] = voteType === 'cancel' ? null : voteType
  send({ type: 'vote', comboId, voteType })
}

function handleLeave() {
  close()
  emit('leave')
}

function lockRoom() {
  send({ type: 'lock_room' })
  showPoster.value = true
}

function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/ws`
}

function processMessage(msg) {
  if (!msg || !msg.data || !msg.data.type) return

  const type = msg.data.type
  const data = msg.data.data

  switch (type) {
    case 'joined_room':
    case 'room_created':
      roomState.value = data.state
      if (data.userId) {
        currentUserId.value = data.userId
        localStorage.setItem('vote_user_id', data.userId)
      }
      hasJoined.value = true
      updateRemainingTime()
      break

    case 'state_update':
      roomState.value = data
      updateRemainingTime()
      break

    case 'vote_update':
      if (roomState.value) {
        const combo = roomState.value.combos.find(c => c.id === data.combo.id)
        if (combo) {
          combo.upVotes = data.combo.upVotes
          combo.downVotes = data.combo.downVotes
          combo.score = data.combo.score
          combo.inWarning = data.combo.inWarning
        }
      }
      break

    case 'user_joined':
    case 'user_left':
      send({ type: 'get_state' })
      break

    case 'room_locked':
      if (roomState.value) {
        roomState.value.isLocked = true
      }
      break
  }
}

function joinRoom() {
  const url = getWsUrl()
  let uid = props.userId
  if (!uid) {
    uid = localStorage.getItem('vote_user_id')
  }
  if (!uid) {
    uid = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
  currentUserId.value = uid
  hasJoined.value = false

  connect(url)
}

function tryJoinRoom() {
  if (hasJoined.value) return
  if (!isConnected.value) return
  
  send({
    type: 'join_room',
    roomId: props.roomId,
    userId: currentUserId.value,
    userName: props.userName || '匿名用户',
  })
}

function requestState() {
  if (isConnected.value) {
    send({ type: 'get_state' })
  }
}

watch(lastMessage, (msg) => {
  if (msg) {
    processMessage(msg)
  }
}, { deep: true })

watch(isConnected, (connected) => {
  if (connected) {
    if (!hasJoined.value) {
      tryJoinRoom()
    } else if (!roomState.value) {
      requestState()
    }
  }
})

onMounted(() => {
  joinRoom()
  timerInterval = setInterval(updateRemainingTime, 1000)
  
  const joinRetry = setInterval(() => {
    if (!hasJoined.value && isConnected.value) {
      tryJoinRoom()
    }
    if (hasJoined.value) {
      clearInterval(joinRetry)
    }
  }, 200)
  
  setTimeout(() => clearInterval(joinRetry), 10000)
  
  setInterval(() => {
    if (isConnected.value && hasJoined.value) {
      send({ type: 'ping' })
    }
  }, 25000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  close()
})
</script>

<style scoped>
.voting-room {
  min-height: 100vh;
  padding-bottom: 80px;
}

.room-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(255, 107, 139, 0.1);
}

.header-left, .header-right {
  width: 100px;
}

.header-center {
  text-align: center;
  flex: 1;
}

.room-title {
  font-size: 18px;
  color: var(--primary-dark);
  margin-bottom: 2px;
}

.room-id {
  font-size: 12px;
  color: var(--text-light);
}

.back-btn {
  background: none;
  color: var(--text-light);
  font-size: 14px;
  padding: 6px 0;
}

.back-btn:hover {
  color: var(--primary);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-light);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}

.connection-status.connected .status-dot {
  background: var(--success);
  animation: pulse 2s ease-in-out infinite;
}

.connection-status.reconnecting .status-dot {
  background: #ffa502;
  animation: pulse 0.8s ease-in-out infinite;
}

.room-content {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease;
}

.room-meta {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  color: var(--text);
  box-shadow: 0 2px 8px rgba(255, 107, 139, 0.1);
}

.meta-icon {
  font-size: 16px;
}

.combos-section {
  margin-top: 24px;
}

.section-title {
  font-size: 18px;
  color: var(--text);
  margin-bottom: 16px;
  text-align: center;
}

.combos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.owner-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
}

.btn-lock {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  padding: 14px 32px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(255, 107, 139, 0.4);
}

.btn-lock:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(255, 107, 139, 0.5);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 12px;
  color: var(--text-light);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-tip {
  font-size: 13px;
  color: var(--primary);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .room-header {
    padding: 10px 12px;
  }
  
  .room-title {
    font-size: 16px;
  }
  
  .room-id {
    font-size: 11px;
  }
  
  .header-left, .header-right {
    width: 80px;
  }
  
  .combos-grid {
    grid-template-columns: 1fr;
  }
  
  .room-meta {
    gap: 8px;
  }
  
  .meta-item {
    font-size: 12px;
    padding: 6px 12px;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .combos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
