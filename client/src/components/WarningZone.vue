<template>
  <div v-if="combos.length > 0" class="warning-zone">
    <div class="warning-header">
      <span class="warning-icon">⚠️</span>
      <h3 class="warning-title">强烈不建议</h3>
      <span class="warning-count">{{ combos.length }}</span>
    </div>
    <p class="warning-desc">这些组合已连续收到 3 票以上反对</p>
    <div class="warning-list">
      <div 
        v-for="combo in combos" 
        :key="combo.id"
        class="warning-item"
      >
        <span class="item-emoji">{{ combo.cakeEmoji }}{{ combo.flowerEmoji }}</span>
        <span class="item-name">{{ combo.cake }} + {{ combo.flower }}</span>
        <span class="item-downvotes">👎 {{ combo.downVotes }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  combos: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.warning-zone {
  margin-top: 24px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
  border: 2px solid var(--warning);
  border-radius: 16px;
  padding: 20px;
  animation: fadeIn 0.4s ease;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.warning-icon {
  font-size: 24px;
  animation: pulse 1.5s ease-in-out infinite;
}

.warning-title {
  font-size: 18px;
  color: var(--warning);
  font-weight: 700;
  flex: 1;
}

.warning-count {
  background: var(--warning);
  color: white;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.warning-desc {
  font-size: 13px;
  color: var(--text-light);
  margin-bottom: 16px;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 10px 14px;
  border-radius: 10px;
}

.item-emoji {
  font-size: 20px;
}

.item-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.item-downvotes {
  font-size: 13px;
  color: var(--warning);
  font-weight: 600;
}

@media (max-width: 480px) {
  .warning-zone {
    padding: 16px;
  }
  
  .warning-title {
    font-size: 16px;
  }
  
  .item-name {
    font-size: 13px;
  }
}
</style>
