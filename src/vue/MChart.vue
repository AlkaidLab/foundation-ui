<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MSeg from './MSeg.vue'
import { curvePaths, niceMax } from './curve.js'

// Detail chart: smooth line and gradient area with a scale (gridlines and labels), the current value, and a floating time range
// group over it. `points` is the whole history, one value per `step` seconds; a range shows the last `seconds` of it.
const range = defineModel('range', { type: String, default: '' })
const props = defineProps({
  points: { type: Array, default: () => [] },
  unit: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  step: { type: Number, default: 1 },
  ranges: { type: Array, default: () => [] }, // [{ value, label, seconds|null }]
  height: { type: Number, default: 180 },
  max: { type: Number, default: null },
  label: { type: String, default: '' },
  emptyText: { type: String, default: '' },
})
const root = ref(null)
const width = ref(360)
let ro = null
onMounted(() => { const read = () => { width.value = Math.max(120, Math.round(root.value.getBoundingClientRect().width)) }; if (typeof ResizeObserver === 'undefined') read(); else { ro = new ResizeObserver(read); ro.observe(root.value) } })
onBeforeUnmount(() => ro?.disconnect())
const visible = computed(() => {
  const r = props.ranges.find((x) => x.value === range.value)
  if (!r || !r.seconds) return props.points
  return props.points.slice(-Math.max(2, Math.round(r.seconds / props.step)))
})
const top = computed(() => props.max ?? niceMax(Math.max(...visible.value, 0) * 1.1))
const left = 38
const inner = computed(() => ({ w: width.value - left - 8, h: props.height - 24 }))
const paths = computed(() => curvePaths(visible.value, { w: inner.value.w, h: inner.value.h, max: top.value, pad: 0 }))
const ticks = computed(() => [0, 0.5, 1].map((f) => ({ y: inner.value.h - f * inner.value.h, text: (top.value * f).toFixed(top.value < 10 ? 1 : 0) })))
const current = computed(() => (visible.value.length ? visible.value[visible.value.length - 1] : null))
</script>

<template>
  <div ref="root" class="m-chart" role="img" :aria-label="label || undefined">
    <div v-if="ranges.length" class="m-chart__range"><MSeg v-model="range" :options="ranges" size="sm" :label="label" /></div>
    <div class="m-chart__now"><b class="m-dnum">{{ current !== null ? current.toFixed(decimals) : '–' }}</b><small v-if="current !== null">{{ unit }}</small></div>
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <defs><linearGradient id="m-chart-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--md-sys-color-primary)" stop-opacity=".34" /><stop offset="1" stop-color="var(--md-sys-color-primary)" stop-opacity=".02" /></linearGradient></defs>
      <g :transform="`translate(${left} 8)`">
        <g v-for="t in ticks" :key="t.y"><line x1="0" :x2="inner.w" :y1="t.y" :y2="t.y" class="m-chart__grid" /><text x="-8" :y="t.y + 4" text-anchor="end" class="m-chart__tick">{{ t.text }}</text></g>
        <template v-if="paths.line"><path :d="paths.area" fill="url(#m-chart-g)" /><path :d="paths.line" class="m-chart__line" /><circle :cx="paths.last.x" :cy="paths.last.y" r="4.5" class="m-chart__dot" /></template>
      </g>
    </svg>
    <p v-if="!paths.line && emptyText" class="m-chart__empty">{{ emptyText }}</p>
  </div>
</template>
