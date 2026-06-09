<template>
  <div class="app-container">
    <div v-if="currentView === 'welcome'" class="welcome-page">
      <div class="welcome-content">
        <div class="welcome-header">
          <span class="welcome-emoji">💝</span>
          <h1>情人节礼盒投票</h1>
          <p class="subtitle">选出最适合你们的甜蜜组合</p>
        </div>
        <div class="welcome-actions">
          <button class="btn btn-primary btn-large" @click="currentView = 'create'">
            🏠 创建投票房
          </button>
          <button class="btn btn-secondary btn-large" @click="currentView = 'join'">
            👥 加入投票房
          </button>
        </div>
      </div>
    </div>

    <CreateRoom 
      v-else-if="currentView === 'create'"
      @created="onRoomCreated"
      @back="currentView = 'welcome'"
    />

    <div v-else-if="currentView === 'join'" class="join-page">
      <div class="join-card">
        <button class="back-btn" @click="currentView = 'welcome'">← 返回</button>
        <h2>加入投票房</h2>
        <input 
          v-model="joinRoomId" 
          type="text" 
          placeholder="输入房间号"
          class="input-field"
        />
        <input 
          v-model="joinUserName" 
          type="text" 
          placeholder="你的昵称"
          class="input-field"
        />
        <button 
          class="btn btn-primary btn-large"
          :disabled="!joinRoomId || !joinUserName"
          @click="joinRoom"
        >
          加入房间
        </button>
      </div>
    </div>

    <VotingRoom 
      v-else-if="currentView === 'voting'"
      :room-id="roomId"
      :user-id="userId"
      :user-name="userName"
      :is-owner="isOwner"
      @leave="leaveRoom"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CreateRoom from './components/CreateRoom.vue'
import VotingRoom from './components/VotingRoom.vue'

const currentView = ref('welcome')
const roomId = ref('')
const userId = ref('')
const userName = ref('')
const isOwner = ref(false)
const joinRoomId = ref('')
const joinUserName = ref('')

function onRoomCreated(data) {
  roomId.value = data.roomId
  userId.value = data.userId
  userName.value = data.userName
  isOwner.value = true
  currentView.value = 'voting'
}

function joinRoom() {
  roomId.value = joinRoomId.value
  userId.value = ''
  userName.value = joinUserName.value
  isOwner.value = false
  currentView.value = 'voting'
}

function leaveRoom() {
  roomId.value = ''
  userId.value = ''
  userName.value = ''
  isOwner.value = false
  currentView.value = 'welcome'
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  width: 100%;
}

.welcome-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.welcome-content {
  text-align: center;
  animation: fadeIn 0.6s ease;
}

.welcome-header {
  margin-bottom: 40px;
}

.welcome-emoji {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
  animation: pulse 2s ease-in-out infinite;
}

.welcome-content h1 {
  font-size: 32px;
  color: var(--primary-dark);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-light);
  font-size: 16px;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 280px;
  margin: 0 auto;
}

.btn {
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 107, 139, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 139, 0.5);
}

.btn-secondary {
  background: white;
  color: var(--primary-dark);
  border: 2px solid var(--border);
}

.btn-secondary:hover {
  background: var(--secondary);
  border-color: var(--primary);
}

.btn-large {
  padding: 16px 32px;
  font-size: 18px;
  width: 100%;
}

.join-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.join-card {
  background: white;
  padding: 32px;
  border-radius: 20px;
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 360px;
  animation: fadeIn 0.4s ease;
}

.join-card h2 {
  text-align: center;
  color: var(--primary-dark);
  margin-bottom: 24px;
}

.back-btn {
  background: none;
  color: var(--text-light);
  font-size: 14px;
  margin-bottom: 16px;
  padding: 4px 0;
}

.back-btn:hover {
  color: var(--primary);
}

.input-field {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 16px;
  margin-bottom: 16px;
  outline: none;
  transition: border-color 0.3s;
  font-family: inherit;
}

.input-field:focus {
  border-color: var(--primary);
}

@media (max-width: 768px) {
  .welcome-content h1 {
    font-size: 26px;
  }
  
  .welcome-emoji {
    font-size: 52px;
  }
}
</style>
