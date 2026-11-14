<script setup>
const model = defineModel({ type: String, default: '' })
defineProps({
  /** [{ value: '#rrggbb', label }] */
  colors: { type: Array, required: true },
  label: { type: String, default: '' },
})
</script>

<template>
  <div class="m-swatches" role="radiogroup" :aria-label="label || undefined">
    <button v-for="c in colors" :key="c.value" type="button" class="m-swatch" role="radio" :aria-checked="model === c.value" :aria-label="c.label || c.value" :title="c.label || c.value" :style="{ '--swatch': c.value }" @click="model = c.value" />
  </div>
</template>
