<template>
  <div class="create-room-page">
    <div class="create-card">
      <button class="back-btn" @click="$emit('back')">← 返回</button>
      <h2>创建投票房</h2>
      <p class="desc">设置投票规则，邀请朋友一起来选</p>
      
      <div class="form-group">
        <label>你的昵称</label>
        <input 
          v-model="form.ownerName" 
          type="text" 
          placeholder="请输入昵称"
          class="input-field"
        />
      </div>

      <div class="form-group">
        <label>截止时间</label>
        <select v-model="form.deadline" class="input-field">
          <option :value="10 * 60 * 1000">10 分钟后</option>
          <option :value="30 * 60 * 1000">30 分钟后</option>
          <option :value="60 * 60 * 1000">1 小时后</option>
          <option :value="3 * 60 * 60 * 1000">3 小时后</option>
          <option :value="24 * 60 * 60 * 1000">24 小时后</option>
        </select>
      </div>

      <div class="form-group">
        <label>可选品类标签</label>
        <div class="tags-grid">
          <button 
            v-for="tag in availableTags" 
            :key="tag"
            class="tag-btn"
            :class="{ active: form.selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
        <p class="hint">不选则展示全部组合</p>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="form.mockEnabled"
          />
          <span>启用模拟投票（5位好友自动参与）</span>
        </label>
      </div>

      <button 
        class="btn btn-primary btn-large create-btn"
        :disabled="!form.ownerName"
        @click="createRoom"
      >
        🎉 创建投票房
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const emit = defineEmits(['created', 'back'])

const availableTags = ['经典', '浪漫', '优雅', '清新', '意式', '高贵', '阳光', '活力', '日式', '温馨', '简约', '纯粹']

const form = reactive({
  ownerName: '',
  deadline: 30 * 60 * 1000,
  selectedTags: [],
  mockEnabled: true,
})

function toggleTag(tag) {
  const idx = form.selectedTags.indexOf(tag)
  if (idx > -1) {
    form.selectedTags.splice(idx, 1)
  } else {
    form.selectedTags.push(tag)
  }
}

async function createRoom() {
  const ws = new WebSocket(getWsUrl())
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'create_room',
      userName: form.ownerName,
      config: {
        deadline: Date.now() + form.deadline,
        selectedTags: form.selectedTags,
        mockEnabled: form.mockEnabled,
      }
    }))
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'room_created') {
      ws.close()
      emit('created', {
        roomId: data.data.roomId,
        userId: data.data.userId,
        userName: form.ownerName,
      })
    }
  }
}

function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/ws`
}
</script>

<style scoped>
.create-room-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.create-card {
  background: white;
  padding: 32px;
  border-radius: 20px;
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 420px;
  animation: fadeIn 0.4s ease;
}

.create-card h2 {
  text-align: center;
  color: var(--primary-dark);
  margin-bottom: 8px;
}

.desc {
  text-align: center;
  color: var(--text-light);
  font-size: 14px;
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

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
  font-size: 14px;
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.3s;
  font-family: inherit;
  background: white;
}

.input-field:focus {
  border-color: var(--primary);
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-btn {
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--bg);
  color: var(--text-light);
  font-size: 13px;
  border: 1px solid var(--border);
}

.tag-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.hint {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: normal !important;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.create-btn {
  margin-top: 8px;
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

.btn-large {
  padding: 16px 32px;
  font-size: 18px;
  width: 100%;
}

@media (max-width: 480px) {
  .create-card {
    padding: 24px 20px;
  }
}
</style>
