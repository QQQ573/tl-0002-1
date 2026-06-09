<template>
  <div class="custom-combo-form">
    <div class="form-item">
      <label>蛋糕名称</label>
      <input 
        v-model="form.cake" 
        type="text" 
        placeholder="如：抹茶卷"
        class="input-field"
        maxlength="20"
      />
    </div>

    <div class="form-item">
      <label>鲜花名称</label>
      <input 
        v-model="form.flower" 
        type="text" 
        placeholder="如：雏菊"
        class="input-field"
        maxlength="20"
      />
    </div>

    <div class="form-item">
      <label>蛋糕表情</label>
      <div class="emoji-picker">
        <button 
          v-for="emoji in cakeEmojis" 
          :key="emoji"
          class="emoji-btn"
          :class="{ active: form.cakeEmoji === emoji }"
          @click="form.cakeEmoji = emoji"
        >
          {{ emoji }}
        </button>
      </div>
    </div>

    <div class="form-item">
      <label>鲜花表情</label>
      <div class="emoji-picker">
        <button 
          v-for="emoji in flowerEmojis" 
          :key="emoji"
          class="emoji-btn"
          :class="{ active: form.flowerEmoji === emoji }"
          @click="form.flowerEmoji = emoji"
        >
          {{ emoji }}
        </button>
      </div>
    </div>

    <div class="form-item">
      <label>风格标签（最多3个）</label>
      <div class="tags-picker">
        <button 
          v-for="tag in allTags" 
          :key="tag"
          class="tag-btn"
          :class="{ active: form.tags.includes(tag), disabled: !form.tags.includes(tag) && form.tags.length >= 3 }"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div class="form-item">
      <label>参考预算价（元）</label>
      <input 
        v-model.number="form.price" 
        type="number" 
        placeholder="如：99"
        class="input-field"
        min="0.01"
        max="9999"
        step="0.01"
      />
    </div>

    <div v-if="errors.length > 0" class="errors-box">
      <p v-for="(err, idx) in errors" :key="idx" class="error-text">⚠️ {{ err }}</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['change', 'validate'])

const cakeEmojis = ['🍰', '🍫', '☕', '🥭', '🍵', '🧀', '🎂', '🍮', '🍩', '🍪']
const flowerEmojis = ['🌹', '💐', '🌷', '🌻', '🌸', '✨', '🌺', '💮', '🏵️', '🌼']
const allTags = ['经典', '浪漫', '优雅', '清新', '意式', '高贵', '阳光', '活力', '日式', '温馨', '简约', '纯粹', '可爱', '文艺']

const form = reactive({
  cake: props.initialData?.cake || '',
  flower: props.initialData?.flower || '',
  cakeEmoji: props.initialData?.cakeEmoji || '🍰',
  flowerEmoji: props.initialData?.flowerEmoji || '🌹',
  tags: props.initialData?.tags ? [...props.initialData.tags] : [],
  price: props.initialData?.price || '',
})

const errors = computed(() => {
  const errs = []
  
  if (!form.cake || form.cake.trim().length === 0) {
    errs.push('蛋糕名称不能为空')
  } else if (form.cake.trim().length > 20) {
    errs.push('蛋糕名称不能超过20个字符')
  }
  
  if (!form.flower || form.flower.trim().length === 0) {
    errs.push('鲜花名称不能为空')
  } else if (form.flower.trim().length > 20) {
    errs.push('鲜花名称不能超过20个字符')
  }
  
  if (!form.cakeEmoji) {
    errs.push('请选择蛋糕表情')
  }
  
  if (!form.flowerEmoji) {
    errs.push('请选择鲜花表情')
  }
  
  if (!form.tags || form.tags.length === 0) {
    errs.push('请至少选择一个风格标签')
  } else if (form.tags.length > 3) {
    errs.push('风格标签最多选择3个')
  }
  
  if (form.price === '' || form.price === null || form.price === undefined || isNaN(Number(form.price))) {
    errs.push('预算价格不能为空')
  } else {
    const priceNum = Number(form.price)
    if (priceNum <= 0) {
      errs.push('预算价格必须大于0')
    } else if (priceNum > 9999) {
      errs.push('预算价格不能超过9999元')
    }
  }
  
  return errs
})

function toggleTag(tag) {
  const idx = form.tags.indexOf(tag)
  if (idx > -1) {
    form.tags.splice(idx, 1)
  } else if (form.tags.length < 3) {
    form.tags.push(tag)
  }
}

function getData() {
  return {
    cake: form.cake.trim(),
    flower: form.flower.trim(),
    cakeEmoji: form.cakeEmoji,
    flowerEmoji: form.flowerEmoji,
    tags: [...form.tags],
    price: Number(form.price),
  }
}

function isValid() {
  return errors.value.length === 0
}

defineExpose({
  getData,
  isValid,
  errors,
})
</script>

<style scoped>
.custom-combo-form {
  padding: 16px 0;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
  font-size: 14px;
}

.input-field {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
  font-family: inherit;
  background: white;
}

.input-field:focus {
  border-color: var(--primary);
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.emoji-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 2px solid var(--border);
  background: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.emoji-btn:hover {
  border-color: var(--primary);
  transform: scale(1.1);
}

.emoji-btn.active {
  border-color: var(--primary);
  background: var(--bg);
  box-shadow: 0 2px 8px rgba(255, 107, 139, 0.2);
}

.tags-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-btn {
  padding: 6px 14px;
  border-radius: 16px;
  background: var(--bg);
  color: var(--text-light);
  font-size: 13px;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.tag-btn:hover:not(.disabled) {
  border-color: var(--primary);
}

.tag-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.tag-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.errors-box {
  background: #fff0f0;
  border: 1px solid #ffcccc;
  border-radius: 10px;
  padding: 12px;
  margin-top: 12px;
}

.error-text {
  font-size: 13px;
  color: #e74c3c;
  margin: 4px 0;
}

@media (max-width: 480px) {
  .emoji-btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
}
</style>
