<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, required: true }, // 0..1
  label: { type: String, default: '' },
  size: { type: Number, default: 44 },
})
const r = 18
const c = 2 * Math.PI * r
const dash = computed(() => `${Math.max(0, Math.min(1, props.value)) * c} ${c}`)
</script>

<template>
  <svg class="m-gauge" :width="size" :height="size" viewBox="0 0 44 44" role="progressbar" :aria-valuenow="Math.round(value * 100)" aria-valuemin="0" aria-valuemax="100" :aria-label="label || undefined">
    <circle class="m-gauge__track" cx="22" cy="22" :r="r" />
    <circle class="m-gauge__bar" cx="22" cy="22" :r="r" :stroke-dasharray="dash" transform="rotate(-90 22 22)" />
    <text x="22" y="26" text-anchor="middle" class="m-gauge__text">{{ Math.round(value * 100) }}</text>
  </svg>
</template>
