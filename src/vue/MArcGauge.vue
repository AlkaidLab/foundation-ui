<script setup>
import { computed } from 'vue'

/**
 * An open arc gauge (240 degrees) for one value that has a safe range: the track is split into zones by `zones` ([{ to (0..1), tone: ok|warn|err }]), the fill
 * is the value, a tick marks `limit`. The centre slot holds the number. Used for temperature and load against a threshold.
 */
const props = defineProps({
  value: { type: Number, default: 0 }, // 0..1
  zones: { type: Array, default: () => [{ to: 0.7, tone: 'ok' }, { to: 0.9, tone: 'warn' }, { to: 1, tone: 'err' }] },
  limit: { type: Number, default: null },
  size: { type: Number, default: 132 },
  thickness: { type: Number, default: 12 },
  label: { type: String, default: '' },
})
const START = 150, SWEEP = 240
const r = computed(() => (props.size - props.thickness) / 2)
const c = computed(() => props.size / 2)
const pt = (frac) => { const a = ((START + SWEEP * frac) * Math.PI) / 180; return [c.value + r.value * Math.cos(a), c.value + r.value * Math.sin(a)] }
const arc = (a, b) => { const [x1, y1] = pt(a); const [x2, y2] = pt(b); return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r.value} ${r.value} 0 ${(b - a) * SWEEP > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}` }
const v = computed(() => Math.max(0, Math.min(1, props.value)))
const zone = computed(() => props.zones.find((z) => v.value <= z.to)?.tone || props.zones[props.zones.length - 1]?.tone || 'ok')
const segs = computed(() => { let from = 0; return props.zones.map((z) => { const s = { d: arc(from, z.to), tone: z.tone }; from = z.to; return s }) })
const tick = computed(() => (props.limit === null ? null : (() => { const [x1, y1] = [c.value + (r.value - props.thickness * 0.8) * Math.cos(((START + SWEEP * props.limit) * Math.PI) / 180), c.value + (r.value - props.thickness * 0.8) * Math.sin(((START + SWEEP * props.limit) * Math.PI) / 180)]; const [x2, y2] = pt(props.limit); return { x1, y1, x2, y2 } })()))
</script>

<template>
  <div class="m-agauge" :style="{ width: `${size}px`, height: `${size * 0.82}px` }" role="meter" :aria-valuenow="Math.round(v * 100)" aria-valuemin="0" aria-valuemax="100" :aria-label="label || undefined">
    <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size">
      <path v-for="(s, i) in segs" :key="i" class="m-agauge__zone" :class="`m-agauge__zone--${s.tone}`" :d="s.d" :stroke-width="thickness" />
      <path v-if="v > 0.004" class="m-agauge__fill" :class="`m-agauge__fill--${zone}`" :d="arc(0, v)" :stroke-width="thickness" />
      <line v-if="tick" class="m-agauge__tick" :x1="tick.x1" :y1="tick.y1" :x2="tick.x2" :y2="tick.y2" />
    </svg>
    <div class="m-agauge__centre"><slot /></div>
  </div>
</template>
