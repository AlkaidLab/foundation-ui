<script setup>
// Tile kit (docs/tile-kit.md): the ring or gauge of a tile. A thick capacity ring (SwiftUI Gauge .accessoryCircularCapacity; Pixel Battery) whose active track is wavy,
// as the Material 3 Expressive progress indicators are, with a gap to the flat track behind it; `sweep` 270 makes it an open gauge. Parts of a whole (内存: this host,
// the other programs) are segments of the same ring. The slot is the centre (a numeral). Geometry in a 100 × 100 box, every arc measured in pathLength 100;
// a change moves the dash arrays (a paint, no layout); none under reduced motion (tilekit.css).
import { computed } from 'vue'

const props = defineProps({
  /** 0..1 */
  value: { type: Number, default: 0 },
  /** [{ value 0..1, tone: 'a' | 'b' | 'c' }]: drawn instead of `value` */
  segments: { type: Array, default: null },
  stroke: { type: Number, default: 10 },
  /** 360: a closed ring from the top; less: an open gauge centred on the top (270 leaves the bottom open) */
  sweep: { type: Number, default: 360 },
  wavy: { type: Boolean, default: true },
  waves: { type: Number, default: 16 },
  /** how far the wavy line swings off the circle, in the 100 box (the stroke is its own width) */
  amp: { type: Number, default: 1.1 },
  /** the wave runs along the line (the phase of the wave moves, the arc stays): the same slow motion as the wavy progress bar (one period in 1.1 s). A transform on a layer of its own, none under reduced motion. One arc only. */
  spin: { type: Boolean, default: false },
})
const R = computed(() => 50 - props.stroke / 2 - 2 - Math.max(0, props.amp - 1.1))
const pathOf = (amp) => {
  const n = 240, r0 = R.value, sw = (Math.min(360, props.sweep) * Math.PI) / 180, a0 = -sw / 2 + (props.sweep >= 360 ? sw / 2 : 0)
  let d = ''
  for (let i = 0; i <= n; i++) {
    const t = a0 + (i / n) * sw, r = r0 + amp * Math.sin(props.waves * (t - a0))
    d += `${i ? 'L' : 'M'}${(50 + r * Math.sin(t)).toFixed(2)} ${(50 - r * Math.cos(t)).toFixed(2)}`
  }
  return d
}
const active = computed(() => pathOf(props.wavy ? props.amp : 0))
const flat = computed(() => pathOf(0))
// the round caps reach half the stroke past each end: lengths are measured from cap to cap
const cap = computed(() => ((props.stroke / 2) / (2 * Math.PI * R.value * (Math.min(360, props.sweep) / 360))) * 100)
const gap = computed(() => cap.value * 2 + 2.2)
const clamp = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0))
const parts = computed(() => {
  let at = 0
  return (props.segments || [{ value: props.value, tone: 'a' }]).map((s, i) => { const len = clamp(s.value) * 100; const o = { tone: s.tone || 'a', start: at + (i ? gap.value : 0), len: Math.max(0, len - (i ? gap.value : 0)) }; at += len; return o }).filter((p) => p.len > 0.2)
})
const used = computed(() => (parts.value.length ? parts.value[parts.value.length - 1].start + parts.value[parts.value.length - 1].len : 0))
// a dash `len` long that starts `start` along the path (a part shorter than its caps is a dot)
const dashOf = (start, len) => `0 ${(start + cap.value).toFixed(2)} ${Math.max(0.01, len - cap.value * 2).toFixed(2)} 200`
// the spinning wave: a full wavy ring that turns by one period inside a fixed mask of the arc (the mask is the flat arc with round caps); turning by one period (360 / waves degrees) looks like the start
const spinOn = computed(() => props.spin && props.wavy && !props.segments && props.sweep >= 360 && parts.value.length === 1)
const maskUrl = computed(() => {
  if (!spinOn.value) return ''
  const p = parts.value[0]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${flat.value}" pathLength="100" fill="none" stroke="black" stroke-linecap="round" stroke-width="${(props.stroke + props.amp * 2).toFixed(2)}" stroke-dasharray="${dashOf(p.start, p.len)}"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})
const track = computed(() => { const from = used.value ? used.value + gap.value : 0; const len = (props.sweep >= 360 && used.value ? 100 - gap.value : 100) - from; return len <= cap.value * 2 ? '' : dashOf(from, len) })
</script>

<template>
  <div class="m-tring">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path v-if="track" class="m-tring__track" :d="flat" pathLength="100" :stroke-width="stroke" :style="{ strokeDasharray: track }" />
      <path v-for="(p, i) in (spinOn ? [] : parts)" :key="i" class="m-tring__arc" :class="`m-tring__arc--${p.tone}`" :d="active" pathLength="100" :stroke-width="stroke" :style="{ strokeDasharray: dashOf(p.start, p.len) }" />
    </svg>
    <div v-if="spinOn" class="m-tring__spin" :style="{ '--waves': waves, maskImage: maskUrl, WebkitMaskImage: maskUrl }" aria-hidden="true">
      <svg viewBox="0 0 100 100"><path class="m-tring__arc m-tring__arc--a" :d="active" :stroke-width="stroke" /></svg>
    </div>
    <div v-if="$slots.default" class="m-tring__centre"><slot /></div>
  </div>
</template>
