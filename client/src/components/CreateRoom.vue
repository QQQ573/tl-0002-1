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
        <div class="section-header">
          <label>私房组合（最多 3 组）</label>
          <span class="count-badge">{{ customCombos.length }}/3</span>
        </div>
        <p class="hint">把你们逛店挑的私房搭配也加进来吧~</p>
        
        <div v-for="(combo, idx) in customCombos" :key="idx" class="custom-combo-item">
          <div class="combo-item-header">
            <span class="combo-index">私房组合 {{ idx + 1 }}</span>
            <button class="remove-btn" @click="removeCustomCombo(idx)">✕ 删除</button>
          </div>
          <CustomComboForm 
            :ref="el => setFormRef(el, idx)"
            :initial-data="combo"
            @change="onComboChange(idx, $event)"
          />
        </div>

        <button 
          v-if="customCombos.length < 3"
          class="btn-add-custom"
          @click="addCustomCombo"
        >
          + 添加私房组合
        </button>
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
        :disabled="!canSubmit"
        @click="createRoom"
      >
        🎉 创建投票房
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import CustomComboForm from './CustomComboForm.vue'

const emit = defineEmits(['created', 'back'])

const availableTags = ['经典', '浪漫', '优雅', '清新', '意式', '高贵', '阳光', '活力', '日式', '温馨', '简约', '纯粹']

const form = reactive({
  ownerName: '',
  deadline: 30 * 60 * 1000,
  selectedTags: [],
  mockEnabled: true,
})

const customCombos = ref([])
const formRefs = ref({})

function setFormRef(el, idx) {
  if (el) {
    formRefs.value[idx] = el
  }
}

const canSubmit = computed(() => {
  if (!form.ownerName) return false
  for (let i = 0; i < customCombos.value.length; i++) {
    const ref = formRefs.value[i]
    if (ref && !ref.isValid()) return false
  }
  return true
})

function toggleTag(tag) {
  const idx = form.selectedTags.indexOf(tag)
  if (idx > -1) {
    form.selectedTags.splice(idx, 1)
  } else {
    form.selectedTags.push(tag)
  }
}

function addCustomCombo() {
  if (customCombos.value.length < 3) {
    customCombos.value.push({
      cake: '',
      flower: '',
      cakeEmoji: '🍰',
      flowerEmoji: '🌹',
      tags: [],
      price: '',
    })
  }
}

function removeCustomCombo(idx) {
  customCombos.value.splice(idx, 1)
  delete formRefs.value[idx]
}

function onComboChange(idx, data) {
  customCombos.value[idx] = { ...customCombos.value[idx], ...data }
}

function collectCustomCombos() {
  const result = []
  for (let i = 0; i < customCombos.value.length; i++) {
    const ref = formRefs.value[i]
    if (ref && ref.isValid()) {
      result.push(ref.getData())
    }
  }
  return result
}

async function createRoom() {
  const ws = new WebSocket(getWsUrl())
  
  const customCombosData = collectCustomCombos()
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'create_room',
      userName: form.ownerName,
      config: {
        deadline: Date.now() + form.deadline,
        selectedTags: form.selectedTags,
        mockEnabled: form.mockEnabled,
        customCombos: customCombosData,
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
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}

.create-card {
  background: white;
  padding: 32px;
  border-radius: 20px;
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 480px;
  animation: fadeIn 0.4s ease;
  margin: 20px 0;
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.section-header label {
  margin-bottom: 0;
}

.count-badge {
  font-size: 12px;
  color: var(--primary);
  background: var(--bg);
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 600;
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

.custom-combo-item {
  background: var(--bg);
  border-radius: 12px;
  padding: 12px 16px;
  margin-top: 12px;
  border: 1px solid var(--border);
}

.combo-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.combo-index {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-dark);
}

.remove-btn {
  background: none;
  color: var(--warning);
  font-size: 12px;
  padding: 2px 8px;
}

.remove-btn:hover {
  text-decoration: underline;
}

.btn-add-custom {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: 2px dashed var(--primary);
  background: var(--bg);
  color: var(--primary-dark);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.btn-add-custom:hover {
  background: var(--secondary);
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
    max-width: 100%;
  }
}
</style>
