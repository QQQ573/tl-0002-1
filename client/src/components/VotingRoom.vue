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

    <div v-if="roomState && roomPhase === 'last_bus' && !roomState.isLocked" class="last-bus-banner">
      <div class="banner-content">
        <span class="bus-icon">🚌</span>
        <span class="banner-text">
          <strong>末班车模式！</strong>
          距截止还剩 <span class="countdown">{{ formatTime(remainingTime) }}</span>
          点赞权重 ×2
        </span>
      </div>
    </div>

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
        <div v-if="isOwner && !roomState.isLocked" class="meta-item add-btn" @click="showAddModal = true">
          <span class="meta-icon">➕</span>
          <span>加私房组合 ({{ customComboCount }}/3)</span>
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

      <ActivityPanel :activities="activities" />

      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>添加私房组合</h3>
            <button class="close-btn" @click="showAddModal = false">✕</button>
          </div>
          <p class="modal-desc">已添加 {{ customComboCount }}/3 组私房组合</p>
          
          <CustomComboForm ref="customFormRef" />
          
          <div v-if="addError" class="error-alert">
            ⚠️ {{ addError }}
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-cancel" @click="showAddModal = false">取消</button>
            <button 
              class="btn btn-confirm"
              :disabled="!canAddCustom || adding"
              @click="addCustomCombo"
            >
              {{ adding ? '添加中...' : '添加' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="toastMessage" class="toast" :class="{ success: toastType === 'success', error: toastType === 'error' }">
        {{ toastMessage }}
      </div>
    </div>

    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p>连接中...</p>
      <p class="loading-tip" v-if="isReconnecting">正在重连，请稍候...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'
import ComboCard from './ComboCard.vue'
import Leaderboard from './Leaderboard.vue'
import WarningZone from './WarningZone.vue'
import SharePoster from './SharePoster.vue'
import CustomComboForm from './CustomComboForm.vue'
import ActivityPanel from './ActivityPanel.vue'

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
const showAddModal = ref(false)
const customFormRef = ref(null)
const adding = ref(false)
const addError = ref('')
const toastMessage = ref('')
const toastType = ref('success')
const roomPhase = ref('normal')
const activities = ref([])

let timerInterval = null
let toastTimer = null

const rankedCombos = computed(() => {
  if (!roomState.value) return []
  return [...roomState.value.combos].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.price - b.price
  })
})

const warningCombos = computed(() => {
  if (!roomState.value) return []
  return roomState.value.combos.filter(c => c.inWarning)
})

const onlineUsers = computed(() => {
  if (!roomState.value) return 0
  return roomState.value.users.filter(u => u.online).length
})

const customComboCount = computed(() => {
  if (!roomState.value) return 0
  return roomState.value.combos.filter(c => c.isCustom).length
})

const canAddCustom = computed(() => {
  if (!customFormRef.value) return false
  return customFormRef.value.isValid() && customComboCount.value < 3
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

function showToast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2500)
}

function addCustomCombo() {
  if (!customFormRef.value || !customFormRef.value.isValid()) return
  if (customComboCount.value >= 3) return
  
  adding.value = true
  addError.value = ''
  
  const comboData = customFormRef.value.getData()
  
  const result = send({ type: 'add_custom_combo', combo: comboData })
  
  if (!result) {
    addError.value = '网络连接失败，请稍后重试'
    adding.value = false
    return
  }
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
      if (data.state.phase) {
        roomPhase.value = data.state.phase
      }
      if (data.state.activities) {
        activities.value = data.state.activities
      }
      hasJoined.value = true
      updateRemainingTime()
      break

    case 'state_update':
      roomState.value = data
      if (data.phase) {
        roomPhase.value = data.phase
      }
      if (data.activities) {
        activities.value = data.activities
      }
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

    case 'combo_list_updated':
      if (roomState.value) {
        roomState.value.combos = data.combos
      }
      break

    case 'custom_combo_added':
      adding.value = false
      showAddModal.value = false
      showToast('私房组合添加成功！', 'success')
      break

    case 'phase_change':
      roomPhase.value = data.phase
      if (data.phase === 'last_bus') {
        showToast('🚌 末班车模式开启！点赞权重×2', 'success')
      }
      break

    case 'activity_item':
      activities.value.unshift(data)
      if (activities.value.length > 50) {
        activities.value = activities.value.slice(0, 50)
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

    case 'error':
      addError.value = data.message
      adding.value = false
      showToast(data.message, 'error')
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
  if (toastTimer) clearTimeout(toastTimer)
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

.last-bus-banner {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  color: white;
  padding: 12px 20px;
  text-align: center;
  animation: pulseBanner 2s ease-in-out infinite;
  position: sticky;
  top: 68px;
  z-index: 99;
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.bus-icon {
  font-size: 24px;
  animation: bounce 1s ease-in-out infinite;
}

.banner-text {
  font-size: 14px;
  font-weight: 500;
}

.banner-text strong {
  font-weight: 700;
}

.countdown {
  font-weight: 700;
  font-size: 16px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  margin: 0 4px;
}

.room-content {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease;
}

.room-meta {
  display: flex;
  gap: 12px;
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

.meta-item.add-btn {
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  font-weight: 500;
  transition: transform 0.2s;
}

.meta-item.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 139, 0.3);
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

@keyframes pulseBanner {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.9; }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  animation: slideUp 0.4s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.modal-header h3 {
  font-size: 20px;
  color: var(--primary-dark);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  color: var(--text-light);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--border);
  color: var(--text);
}

.modal-desc {
  font-size: 14px;
  color: var(--text-light);
  margin-bottom: 16px;
}

.error-alert {
  background: #fff0f0;
  border: 1px solid #ffcccc;
  border-radius: 10px;
  padding: 12px;
  margin-top: 12px;
  font-size: 13px;
  color: #e74c3c;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: var(--bg);
  color: var(--text-light);
  border: none;
}

.btn-cancel:hover {
  background: var(--border);
}

.btn-confirm {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  border: none;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 107, 139, 0.4);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 500;
  z-index: 300;
  animation: slideDown 0.3s ease;
}

.toast.success {
  background: var(--success);
  color: white;
}

.toast.error {
  background: var(--warning);
  color: white;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
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
  
  .last-bus-banner {
    top: 60px;
    padding: 10px 16px;
  }
  
  .banner-text {
    font-size: 12px;
  }
  
  .countdown {
    font-size: 14px;
  }
  
  .bus-icon {
    font-size: 20px;
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
  
  .modal-content {
    padding: 20px 16px;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .combos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
