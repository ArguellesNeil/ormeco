<template>
  <div class="searchbar">
    <input
      :placeholder="placeholder"
      :value="modelValue"
      @input="onInput"
      class="search-input"
      type="search"
      aria-label="Search"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Search...' }
});
const emit = defineEmits(['update:modelValue']);

let timer = null;
const onInput = (e) => {
  const v = e.target.value;
  // debounce emit
  clearTimeout(timer);
  timer = setTimeout(() => emit('update:modelValue', v), 220);
};

watch(() => props.modelValue, () => {
  // noop - keeps component reactive when parent sets value
});
</script>

<style scoped>
.searchbar {
  display: flex;
  align-items: center;
}
.search-input {
  min-width: 220px;
  max-width: 420px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #d7e0ee;
  background: #fff;
  color: var(--text);
  font-size: 13px;
  box-shadow: 0 6px 18px rgba(16,35,62,0.06);
}

@media (max-width: 900px) {
  .search-input { min-width: 140px; }
}
</style>
