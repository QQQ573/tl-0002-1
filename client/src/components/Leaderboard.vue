<template>
  <div class="leaderboard">
    <div class="board-header">
      <h3 class="board-title">🏆 实时得票榜</h3>
      <div class="sort-tabs">
        <button 
          class="sort-tab" 
          :class="{ active: sortMode === 'hot' }"
          @click="sortMode = 'hot'"
        >
          🔥 热度
        </button>
        <button 
          class="sort-tab" 
          :class="{ active: sortMode === 'price' }"
          @click="sortMode = 'price'"
        >
          💰 预算
        </button>
      </div>
    </div>
    
    <div class="board-list">
      <div 
        v-for="(combo, index) in sortedCombos" 
        :key="combo.id"
        class="board-item"
        :class="`rank-${index + 1}`"
      >
        <div class="rank-badge">
          <span v-if="index === 0">🥇</span>
          <span v-else-if="index === 1">🥈</span>
          <span v-else-if="index === 2">🥉</span>
          <span v-else class="rank-num">{{ index + 1 }}</span>
        </div>
        <div class="combo-info">
          <span class="combo-emoji">{{ combo.cakeEmoji }}{{ combo.flowerEmoji }}</span>
          <div class="combo-text-wrap">
            <span class="combo-text">{{ combo.cake }} + {{ combo.flower }}</span>
            <span class="combo-price">¥{{ combo.price }}</span>
          </div>
        </div>
        <div class="score-info">
          <span class="score" :class="{ positive: combo.score > 0, negative: combo.score < 0 }">
            {{ combo.score > 0 ? '+' : '' }}{{ combo.score }}
          </span>
          <span class="vote-detail">
            👍{{ combo.upVotes }} 👎{{ combo.downVotes }}
          </span>
        </div>
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
  }
})

const sortMode = ref('hot')

const sortedCombos = computed(() => {
  const list = [...props.combos]
  
  if (sortMode.value === 'hot') {
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.price - b.price
    })
  } else {
    list.sort((a, b) => a.price - b.price)
  }
  
  return list
})
</script>

<style scoped>
.leaderboard {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  animation: fadeIn 0.4s ease;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.board-title {
  font-size: 18px;
  color: var(--primary-dark);
}

.sort-tabs {
  display: flex;
  background: var(--bg);
  border-radius: 20px;
  padding: 3px;
}

.sort-tab {
  padding: 6px 14px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: var(--text-light);
  transition: all 0.3s ease;
}

.sort-tab.active {
  background: white;
  color: var(--primary-dark);
  box-shadow: 0 2px 6px rgba(255, 107, 139, 0.15);
}

.board-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.board-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.board-item.rank-1 {
  background: linear-gradient(135deg, #fff9e6 0%, #fff3cc 100%);
  border: 2px solid #ffd700;
}

.board-item.rank-2 {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border: 2px solid #c0c0c0;
}

.board-item.rank-3 {
  background: linear-gradient(135deg, #fff0e6 0%, #ffe4cc 100%);
  border: 2px solid #cd7f32;
}

.rank-badge {
  width: 36px;
  text-align: center;
  font-size: 24px;
}

.rank-num {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-light);
}

.combo-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.combo-emoji {
  font-size: 20px;
}

.combo-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.combo-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.combo-price {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.score-info {
  text-align: right;
}

.score {
  font-size: 20px;
  font-weight: 700;
  display: block;
}

.score.positive {
  color: var(--success);
}

.score.negative {
  color: var(--warning);
}

.vote-detail {
  font-size: 11px;
  color: var(--text-light);
}

@media (max-width: 480px) {
  .board-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .board-item {
    padding: 10px 12px;
  }
  
  .combo-text {
    font-size: 13px;
  }
  
  .score {
    font-size: 18px;
  }
  
  .combo-emoji {
    display: none;
  }
}
</style>
