<template>
  <div class="poster-overlay" @click.self="$emit('close')">
    <div class="poster-modal">
      <button class="close-btn" @click="$emit('close')">✕</button>
      
      <div class="poster-content">
        <div class="poster-header">
          <span class="poster-emoji">💝</span>
          <h2>情人节礼盒投票结果</h2>
          <p class="poster-subtitle">房间号: {{ roomId }}</p>
        </div>

        <div class="poster-winners">
          <div 
            v-for="(combo, index) in topThree" 
            :key="combo.id"
            class="winner-item"
            :class="`rank-${index + 1}`"
          >
            <div class="winner-rank">
              <span v-if="index === 0">🥇</span>
              <span v-else-if="index === 1">🥈</span>
              <span v-else-if="index === 2">🥉</span>
              第{{ index + 1 }}名
            </div>
            <div class="winner-combo">
              <span class="winner-emoji">{{ combo.cakeEmoji }} + {{ combo.flowerEmoji }}</span>
              <span class="winner-name">{{ combo.cake }} & {{ combo.flower }}</span>
            </div>
            <div class="winner-score">
              得分 {{ combo.score > 0 ? '+' : '' }}{{ combo.score }}
            </div>
          </div>
        </div>

        <div class="poster-cta">
          <p>今年情人节，就选它了！</p>
        </div>

        <div class="poster-actions">
          <button class="btn btn-copy" @click="copyPosterText">
            📋 复制文案
          </button>
        </div>
      </div>

      <div class="copy-toast" v-if="showToast">
        ✅ 文案已复制
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  combos: {
    type: Array,
    default: () => []
  },
  roomId: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])

const showToast = ref(false)

const topThree = computed(() => {
  return props.combos.slice(0, 3)
})

function generatePosterText() {
  const winner = topThree.value[0]
  if (!winner) return ''
  
  let text = `💝 情人节礼盒投票结果出炉！\n\n`
  text += `🏆 冠军组合：${winner.cake} + ${winner.flower}\n`
  text += `📊 最终得分：${winner.score > 0 ? '+' : ''}${winner.score}\n\n`
  
  if (topThree.value[1]) {
    text += `🥈 第二名：${topThree.value[1].cake} + ${topThree.value[1].flower}\n`
  }
  if (topThree.value[2]) {
    text += `🥉 第三名：${topThree.value[2].cake} + ${topThree.value[2].flower}\n`
  }
  
  text += `\n💑 经过大家投票，这个情人节就选【${winner.cake} + ${winner.flower}】啦！\n`
  text += `#情人节 #甜蜜投票 #${winner.cake} #${winner.flower}`
  
  return text
}

function copyPosterText() {
  const text = generatePosterText()
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast.value = true
      setTimeout(() => {
        showToast.value = false
      }, 2000)
    })
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  }
}
</script>

<style scoped>
.poster-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.poster-modal {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  position: relative;
  animation: slideUp 0.4s ease;
  max-height: 90vh;
  overflow-y: auto;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  color: var(--text-light);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.close-btn:hover {
  background: var(--border);
  color: var(--text);
}

.poster-content {
  padding: 32px 24px;
}

.poster-header {
  text-align: center;
  margin-bottom: 24px;
}

.poster-emoji {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
  animation: pulse 2s ease-in-out infinite;
}

.poster-header h2 {
  font-size: 22px;
  color: var(--primary-dark);
  margin-bottom: 4px;
}

.poster-subtitle {
  font-size: 13px;
  color: var(--text-light);
}

.poster-winners {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.winner-item {
  background: var(--bg);
  border-radius: 14px;
  padding: 16px;
  text-align: center;
}

.winner-item.rank-1 {
  background: linear-gradient(135deg, #fff9e6 0%, #fff0b3 100%);
  border: 2px solid #ffd700;
  transform: scale(1.02);
}

.winner-item.rank-2 {
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  border: 2px solid #c0c0c0;
}

.winner-item.rank-3 {
  background: linear-gradient(135deg, #fff0e6 0%, #ffd9b3 100%);
  border: 2px solid #cd7f32;
}

.winner-rank {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.winner-combo {
  margin-bottom: 8px;
}

.winner-emoji {
  font-size: 28px;
  display: block;
  margin-bottom: 4px;
}

.winner-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.winner-score {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-dark);
}

.poster-cta {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}

.poster-cta p {
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.poster-actions {
  display: flex;
  justify-content: center;
}

.btn-copy {
  background: var(--primary);
  color: white;
  padding: 14px 32px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
}

.btn-copy:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.copy-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1001;
  animation: fadeIn 0.3s ease;
}

@media (max-width: 480px) {
  .poster-content {
    padding: 24px 20px;
  }
  
  .poster-header h2 {
    font-size: 20px;
  }
  
  .winner-emoji {
    font-size: 24px;
  }
  
  .winner-name {
    font-size: 14px;
  }
}
</style>
