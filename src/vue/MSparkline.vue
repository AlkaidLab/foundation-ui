<script setup>
import { computed } from 'vue'

const props = defineProps({
  points: { type: Array, required: true },
  width: { type: Number, default: 96 },
  height: { type: Number, default: 32 },
})
const path = computed(() => {
  const p = props.points.filter((n) => Number.isFinite(n))
  if (p.length < 2) return { line: '', area: '' }
  const min = Math.min(...p), max = Math.max(...p), span = max - min || 1
  const x = (i) => (i / (p.length - 1)) * props.width
  const y = (v) => props.height - 3 - ((v - min) / span) * (props.height - 6)
  const line = p.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return { line, area: `${line} L${props.width} ${props.height} L0 ${props.height} Z` }
})
</script>

<template>
  <svg class="m-spark" :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" aria-hidden="true">
    <path :d="path.area" class="m-spark__area" />
    <path :d="path.line" class="m-spark__line" />
  </svg>
</template>
