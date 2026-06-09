<template>
  <div class="activity-panel" :class="{ collapsed: isCollapsed, 'is-last-bus': isLastBus }">
    <div class="panel-header" @click="toggleCollapse">
      <div class="header-left">
        <span class="panel-icon">📋</span>
        <span class="panel-title">投票动态</span>
        <span class="activity-count" :class="{ 'is-full': activities.length >= maxCount }">
          {{ activities.length }}/{{ maxCount }}
        </span>
        <span v-if="activities.length >= maxCount" class="full-hint">已满</span>
      </div>
      <div class="header-right">
        <button 
          v-if="!isCollapsed && activities.length > 0" 
          class="clear-btn" 
          @click.stop="handleClear"
          title="清空动态"
        >
          🗑️ 清空
        </button>
        <span class="collapse-icon">{{ isCollapsed ? '▲' : '▼' }}</span>
      </div>
    </div>
    
    <div v-show="!isCollapsed" class="panel-content">
      <div v-if="activities.length === 0" class="empty-state">
        <span class="empty-icon">💭</span>
        <p class="empty-text">暂无投票动态</p>
        <p class="empty-hint">点赞或点踩后会在这里显示</p>
      </div>
      
      <div v-else class="activity-list">
        <div 
          v-for="(activity, index) in activities" 
          :key="activity.id"
          class="activity-item"
          :class="{ 'new-item': index === 0 }"
        >
          <div class="activity-avatar" :class="getAvatarClass(activity.type)">
            {{ activity.userName ? activity.userName.charAt(0) : '?' }}
          </div>
          
          <div class="activity-body">
            <div class="activity-main">
              <span class="user-name">{{ activity.userName || '未知用户' }}</span>
              <span class="action-text" :class="getActionClass(activity.type)">
                {{ getActionText(activity.type) }}
              </span>
              <span class="combo-name">{{ activity.comboName || '未知组合' }}</span>
            </div>
            
            <div class="activity-meta">
              <span class="time">{{ formatTime(activity.timestamp) }}</span>
              
              <span 
                v-if="activity.phase === 'last_bus' && activity.type === 'up'" 
                class="phase-tag last-bus"
              >
                🚌 末班车 ×{{ activity.weight }}
              </span>
              
              <span 
                v-if="activity.scoreChange !== undefined && activity.scoreChange !== 0" 
                class="score-change"
                :class="{ positive: activity.scoreChange > 0, negative: activity.scoreChange < 0 }"
              >
                {{ activity.scoreChange > 0 ? '+' : '' }}{{ activity.scoreChange }} 分
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  activities: {
    type: Array,
    default: () => []
  },
  maxCount: {
    type: Number,
    default: 50
  },
  isLastBus: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['clear'])

const isCollapsed = ref(false)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function handleClear() {
  if (confirm('确定要清空所有投票动态吗？')) {
    emit('clear')
  }
}

function formatTime(timestamp) {
  if (!timestamp) return '--:--:--'
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function getActionText(type) {
  switch (type) {
    case 'up': return '👍 点赞了'
    case 'down': return '👎 点踩了'
    case 'cancel': return '↩️ 撤销了对'
    default: return '操作了'
  }
}

function getActionClass(type) {
  return `action-${type}`
}

function getAvatarClass(type) {
  return `avatar-${type}`
}
</script>

<style scoped>
.activity-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
  z-index: 999;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

.activity-panel.collapsed {
  max-height: none;
}

.activity-panel.is-last-bus .panel-header {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  color: white;
  flex-shrink: 0;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 18px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
}

.activity-count {
  background: rgba(255, 255, 255, 0.25);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.activity-count.is-full {
  background: rgba(255, 0, 0, 0.4);
}

.full-hint {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #ff4757;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.collapse-icon {
  font-size: 11px;
  opacity: 0.8;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(60vh - 46px);
  background: #fafafa;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  font-size: 42px;
  margin-bottom: 10px;
}

.empty-text {
  font-size: 14px;
  margin: 0 0 4px 0;
  color: #666;
}

.empty-hint {
  font-size: 12px;
  margin: 0;
  color: #999;
}

.activity-list {
  padding: 0;
}

.activity-item {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: white;
  transition: background 0.2s;
}

.activity-item.new-item {
  animation: highlight 0.6s ease;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item:hover {
  background: #f9f9f9;
}

.activity-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}

.activity-avatar.avatar-up {
  background: linear-gradient(135deg, #26de81 0%, #20bf6b 100%);
}

.activity-avatar.avatar-down {
  background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%);
}

.activity-avatar.avatar-cancel {
  background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
}

.activity-body {
  flex: 1;
  min-width: 0;
}

.activity-main {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  word-break: break-all;
}

.user-name {
  font-weight: 700;
  color: #c44569;
  margin-right: 2px;
}

.action-text {
  margin: 0 4px;
  font-weight: 500;
}

.action-text.action-up {
  color: #20bf6b;
}

.action-text.action-down {
  color: #e84393;
}

.action-text.action-cancel {
  color: #6c5ce7;
}

.combo-name {
  font-weight: 600;
  color: #333;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.time {
  font-size: 11px;
  color: #aaa;
}

.phase-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 600;
  color: white;
}

.phase-tag.last-bus {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
}

.score-change {
  font-size: 12px;
  font-weight: 700;
}

.score-change.positive {
  color: #20bf6b;
}

.score-change.negative {
  color: #e84393;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0.5;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes highlight {
  0% {
    background: #fff9c4;
  }
  100% {
    background: white;
  }
}

@media (max-width: 480px) {
  .activity-panel {
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
  }
  
  .panel-header {
    padding: 10px 14px;
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
  }
  
  .panel-title {
    font-size: 13px;
  }
  
  .activity-item {
    padding: 10px 14px;
  }
  
  .activity-avatar {
    width: 34px;
    height: 34px;
    font-size: 13px;
  }
  
  .activity-main {
    font-size: 13px;
  }
}

@media (min-width: 768px) {
  .activity-panel {
    max-width: 420px;
    left: auto;
    right: 24px;
    bottom: 24px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    max-height: 500px;
  }
  
  .panel-header {
    border-radius: 16px 16px 0 0;
  }
  
  .panel-content {
    max-height: calc(500px - 46px);
    border-radius: 0 0 16px 16px;
  }
}
</style>
