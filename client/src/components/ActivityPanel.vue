<template>
  <div class="activity-panel" :class="{ collapsed: isCollapsed }">
    <div class="panel-header" @click="toggleCollapse">
      <div class="header-left">
        <span class="panel-icon">📋</span>
        <span class="panel-title">投票动态</span>
        <span class="activity-count">{{ activities.length }}</span>
      </div>
      <div class="header-right">
        <span class="collapse-icon">{{ isCollapsed ? '▲' : '▼' }}</span>
      </div>
    </div>
    
    <div v-if="!isCollapsed" class="panel-content">
      <div v-if="activities.length === 0" class="empty-state">
        <span class="empty-icon">💭</span>
        <p>暂无投票动态</p>
      </div>
      <div v-else class="activity-list">
        <div 
          v-for="activity in activities" 
          :key="activity.id"
          class="activity-item"
        >
          <div class="activity-avatar">
            {{ activity.userName.charAt(0) }}
          </div>
          <div class="activity-content">
            <div class="activity-text">
              <span class="user-name">{{ activity.userName }}</span>
              <span class="action-text">
                <template v-if="activity.type === 'up'">
                  👍 点赞了
                </template>
                <template v-else-if="activity.type === 'down'">
                  👎 点踩了
                </template>
                <template v-else-if="activity.type === 'cancel'">
                  ↩️ 撤销了对
                </template>
              </span>
              <span class="combo-name">{{ activity.comboName }}</span>
            </div>
            <div class="activity-meta">
              <span class="time">{{ formatTime(activity.timestamp) }}</span>
              <span v-if="activity.phase === 'last_bus' && activity.type === 'up'" class="last-bus-tag">
                🚌 末班车 ×{{ activity.weight }}
              </span>
              <span v-if="activity.scoreChange !== 0" class="score-change" :class="{ positive: activity.scoreChange > 0, negative: activity.scoreChange < 0 }">
                {{ activity.scoreChange > 0 ? '+' : '' }}{{ activity.scoreChange }}分
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
  }
})

const isCollapsed = ref(false)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
</script>

<style scoped>
.activity-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 50;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

.activity-panel.collapsed {
  max-height: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  color: white;
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
  font-size: 15px;
  font-weight: 600;
}

.activity-count {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.collapse-icon {
  font-size: 12px;
  opacity: 0.8;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  max-height: calc(50vh - 50px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.activity-list {
  padding: 8px 0;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--bg);
  animation: fadeIn 0.3s ease;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 14px;
  color: var(--text);
  line-height: 1.4;
}

.user-name {
  font-weight: 600;
  color: var(--primary-dark);
}

.action-text {
  margin: 0 4px;
}

.combo-name {
  font-weight: 500;
  color: var(--text);
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.time {
  font-size: 12px;
  color: var(--text-light);
}

.last-bus-tag {
  font-size: 11px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.score-change {
  font-size: 12px;
  font-weight: 600;
}

.score-change.positive {
  color: var(--success);
}

.score-change.negative {
  color: var(--warning);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 480px) {
  .activity-panel {
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }
  
  .panel-header {
    padding: 12px 16px;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }
  
  .activity-item {
    padding: 10px 16px;
  }
}

@media (min-width: 768px) {
  .activity-panel {
    max-width: 400px;
    left: auto;
    right: 20px;
    bottom: 20px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    max-height: 400px;
  }
  
  .panel-header {
    border-radius: 16px 16px 0 0;
  }
  
  .panel-content {
    max-height: calc(400px - 48px);
    border-radius: 0 0 16px 16px;
  }
}
</style>
