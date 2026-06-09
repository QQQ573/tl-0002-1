<template>
  <div class="combo-card" :class="{ warning: combo.inWarning, disabled: disabled }">
    <div class="card-header">
      <span class="combo-emoji">{{ combo.cakeEmoji }}</span>
      <span class="plus">+</span>
      <span class="combo-emoji">{{ combo.flowerEmoji }}</span>
    </div>
    
    <div class="combo-names">
      <span class="cake-name">{{ combo.cake }}</span>
      <span class="divider">·</span>
      <span class="flower-name">{{ combo.flower }}</span>
    </div>

    <div class="combo-tags">
      <span v-for="tag in combo.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>

    <div class="vote-stats">
      <div class="stat up">
        <span class="stat-icon">👍</span>
        <span class="stat-num">{{ combo.upVotes }}</span>
      </div>
      <div class="stat score" :class="{ positive: combo.score > 0, negative: combo.score < 0 }">
        {{ combo.score > 0 ? '+' : '' }}{{ combo.score }}
      </div>
      <div class="stat down">
        <span class="stat-icon">👎</span>
        <span class="stat-num">{{ combo.downVotes }}</span>
      </div>
    </div>

    <div class="vote-buttons" v-if="!disabled">
      <button 
        class="vote-btn up-btn"
        :class="{ active: userVote === 'up' }"
        @click="handleVote('up')"
      >
        👍 赞
      </button>
      <button 
        class="vote-btn down-btn"
        :class="{ active: userVote === 'down' }"
        @click="handleVote('down')"
      >
        👎 踩
      </button>
    </div>

    <div v-if="combo.inWarning" class="warning-badge">
      ⚠️ 强烈不建议
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  combo: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  userVote: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['vote'])

function handleVote(type) {
  if (props.disabled) return
  
  if (props.userVote === type) {
    emit('vote', props.combo.id, 'cancel')
  } else {
    emit('vote', props.combo.id, type)
  }
}
</script>

<style scoped>
.combo-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  position: relative;
  transition: all 0.3s ease;
  animation: slideUp 0.4s ease;
}

.combo-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.combo-card.warning {
  border: 2px solid var(--warning);
  animation: shake 0.5s ease, fadeIn 0.4s ease;
}

.combo-card.disabled {
  opacity: 0.7;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.combo-emoji {
  font-size: 48px;
  display: inline-block;
}

.plus {
  font-size: 20px;
  color: var(--text-light);
  font-weight: 300;
}

.combo-names {
  text-align: center;
  margin-bottom: 10px;
}

.cake-name, .flower-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.divider {
  color: var(--border);
  margin: 0 8px;
}

.combo-tags {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 3px 10px;
  background: var(--bg);
  color: var(--text-light);
  border-radius: 10px;
}

.vote-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 16px;
  padding: 10px 0;
  background: var(--bg);
  border-radius: 10px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.stat-icon {
  font-size: 18px;
}

.stat-num {
  font-weight: 600;
  color: var(--text);
}

.stat.score {
  font-size: 20px;
  font-weight: 700;
}

.stat.score.positive {
  color: var(--success);
}

.stat.score.negative {
  color: var(--warning);
}

.vote-buttons {
  display: flex;
  gap: 10px;
}

.vote-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  background: var(--bg);
  color: var(--text-light);
  transition: all 0.2s ease;
}

.vote-btn:hover {
  transform: scale(1.02);
}

.up-btn.active {
  background: var(--success);
  color: white;
}

.down-btn.active {
  background: var(--warning);
  color: white;
}

.warning-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  background: var(--warning);
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 99, 72, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}

@media (max-width: 480px) {
  .combo-card {
    padding: 16px;
  }
  
  .combo-emoji {
    font-size: 40px;
  }
  
  .cake-name, .flower-name {
    font-size: 14px;
  }
}
</style>
