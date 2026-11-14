<script setup>
import { computed } from 'vue'

// Ring (progress or donut) with numerals in the middle. `value` 0..1, or `segments` [{ value, tone }] that add up to at most 1.
const props = defineProps({
  value: { type: Number, default: null },
  segments: { type: Array, default: () => [] },
  size: { type: Number, default: 112 },
  thickness: { type: Number, default: 12 },
  tone: { type: String, default: 'primary' },
  label: { type: String, default: '' },
})
const r = computed(() => (props.size - props.thickness) / 2)
const c = computed(() => 2 * Math.PI * r.value)
const arcs = computed(() => {
  const list = props.segments.length ? props.segments : [{ value: props.value ?? 0, tone: props.tone }]
  let offset = 0
  return list.map((s) => { const len = Math.max(0, Math.min(1, s.value)) * c.value; const a = { tone: s.tone || props.tone, dash: `${Math.max(0, len - props.thickness * 0.5)} ${c.value}`, offset: -offset }; offset += len; return a })
})
</script>

<template>
  <div class="m-ring" :style="{ width: `${size}px`, height: `${size}px` }" role="img" :aria-label="label || undefined">
    <svg :viewBox="`0 0 ${size} ${size}`">
      <circle class="m-ring__track" :cx="size / 2" :cy="size / 2" :r="r" :stroke-width="thickness" />
      <circle v-for="(a, i) in arcs" :key="i" class="m-ring__arc" :class="`m-ring__arc--${a.tone}`" :cx="size / 2" :cy="size / 2" :r="r" :stroke-width="thickness" :stroke-dasharray="a.dash" :stroke-dashoffset="a.offset" />
    </svg>
    <div class="m-ring__center"><slot /></div>
  </div>
</template>
