<script setup>
import { computed } from 'vue'

// Small plots for the DualSense pages, drawn from the values on the page. `wave`: the haptics PCM before and after the
// gain, clipped at full scale; `rumble`: motor output over input (power curve, gains, strength, noise gate) for the low
// and the high motor; `response`: output over input of an axis (dead zone inside, saturation outside, anti dead zone as
// the offset, sensitivity as the gain, a named curve for the shape); `players`: the five player lights. Decorative: the
// rows beside it carry the values, the label names the plot for screen readers.
const props = defineProps({
  kind: { type: String, default: 'response' },
  label: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  // wave
  gain: { type: Number, default: 1 },
  // rumble
  enabled: { type: Boolean, default: true },
  strength: { type: Number, default: 1 },
  curve: { type: [Number, String], default: 1 },
  gate: { type: Number, default: 0 },
  low: { type: Number, default: 1 },
  high: { type: Number, default: 1 },
  // response
  inner: { type: Number, default: 0 },
  outer: { type: Number, default: 1 },
  anti: { type: Number, default: 0 },
  sensitivity: { type: Number, default: 1 },
  shape: { type: String, default: 'linear' },
  // series: values 0..1 spread over the width (a force profile)
  points: { type: Array, default: () => [] },
  // players: five booleans
  lit: { type: Array, default: () => [false, false, true, false, false] },
  xLabel: { type: String, default: '' },
  yLabel: { type: String, default: '' },
})

const W = 240
const H = 108
const PAD = { l: 26, r: 10, t: 10, b: 22 }
const plotW = W - PAD.l - PAD.r
const plotH = H - PAD.t - PAD.b
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const X = (u) => PAD.l + u * plotW
const Y = (u) => PAD.t + (1 - u) * plotH
const line = (fn, from = 0, to = 1, n = 72) => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const u = from + ((to - from) * i) / n
    d += `${i ? 'L' : 'M'}${X(u).toFixed(1)} ${Y(fn(u)).toFixed(1)}`
  }
  return d
}

// the shapes the host names for an axis curve
const SHAPES = {
  linear: (m) => m,
  enhanced: (m) => m * (0.5 + 0.5 * m),
  quadratic: (m) => m * m,
  cubic: (m) => m * m * m,
  easeOutQuad: (m) => 1 - (1 - m) * (1 - m),
  easeOutCubic: (m) => 1 - (1 - m) ** 3,
}

// wave: one period pair of a sine at 60 % of full scale, scaled by the gain and clipped (apply_pcm_gain)
const wave = computed(() => {
  const base = 0.6
  const t = (u) => Math.sin(u * Math.PI * 4)
  const mapY = (v) => PAD.t + (1 - (clamp(v, -1, 1) + 1) / 2) * plotH
  const path = (scale) => {
    let d = ''
    for (let i = 0; i <= 160; i++) { const u = i / 160; d += `${i ? 'L' : 'M'}${X(u).toFixed(1)} ${mapY(base * scale * t(u)).toFixed(1)}` }
    return d
  }
  return { ghost: path(1), shaped: path(Math.max(0, props.gain)), clipped: Math.abs(base * props.gain) > 1 }
})

// rumble: clamp(pow(input, curve) * motorGain * strength) with the noise gate under which the output is 0 (shape_rumble)
const rumble = computed(() => {
  const curve = Number(props.curve) || 1
  const out = (motor) => (u) => (!props.enabled || u <= props.gate ? 0 : clamp(u ** curve * motor * props.strength, 0, 1))
  return { low: line(out(props.low)), high: line(out(props.high)) }
})

const response = computed(() => {
  const shape = SHAPES[props.shape] || SHAPES.linear
  const span = Math.max(props.outer - props.inner, 1e-6)
  const fn = (u) => {
    if (u <= props.inner) return 0
    const m = clamp((u - props.inner) / span, 0, 1)
    return clamp((props.anti + (1 - props.anti) * shape(m)) * props.sensitivity, 0, 1)
  }
  return { path: line(fn), zone: [X(0), X(clamp(props.inner, 0, 1)), X(clamp(props.outer, 0, 1))] }
})

const series = computed(() => {
  const list = props.points
  if (list.length < 2) return ''
  return list.map((v, i) => `${i ? 'L' : 'M'}${X(i / (list.length - 1)).toFixed(1)} ${Y(clamp(v, 0, 1)).toFixed(1)}`).join('')
})

const TICKS = [0, 0.5, 1]
</script>

<template>
  <figure class="m-dsplot" :class="[`m-dsplot--${kind}`, { 'm-dsplot--compact': compact }]" role="img" :aria-label="label">
    <svg v-if="kind !== 'players'" :viewBox="`0 0 ${W} ${H}`" focusable="false" aria-hidden="true">
      <g class="m-dsplot__grid">
        <path v-for="t in TICKS" :key="t" :d="`M${PAD.l} ${Y(t).toFixed(1)}H${W - PAD.r}`" />
        <template v-if="kind !== 'wave'"><path v-for="t in TICKS" :key="'v' + t" :d="`M${X(t).toFixed(1)} ${PAD.t}V${H - PAD.b}`" /></template>
      </g>
      <template v-if="kind === 'wave'">
        <path class="m-dsplot__clip" :d="`M${PAD.l} ${PAD.t}H${W - PAD.r}M${PAD.l} ${H - PAD.b}H${W - PAD.r}`" />
        <path class="m-dsplot__ghost" :d="wave.ghost" />
        <path class="m-dsplot__line" :class="{ 'is-clipped': wave.clipped }" :d="wave.shaped" />
      </template>
      <template v-else-if="kind === 'rumble'">
        <path class="m-dsplot__ghost" :d="line((u) => u)" />
        <path class="m-dsplot__line m-dsplot__line--b" :d="rumble.high" />
        <path class="m-dsplot__line" :d="rumble.low" />
      </template>
      <template v-else-if="kind === 'series'">
        <path class="m-dsplot__line" :d="series" />
      </template>
      <template v-else>
        <rect class="m-dsplot__zone" :x="response.zone[0]" :y="PAD.t" :width="Math.max(0, response.zone[1] - response.zone[0])" :height="plotH" />
        <rect class="m-dsplot__zone" :x="response.zone[2]" :y="PAD.t" :width="Math.max(0, W - PAD.r - response.zone[2])" :height="plotH" />
        <path class="m-dsplot__ghost" :d="line((u) => u)" />
        <path class="m-dsplot__line" :d="response.path" />
      </template>
      <g v-if="!compact" class="m-dsplot__ticks">
        <text v-if="kind !== 'wave'" :x="X(0)" :y="H - 8" text-anchor="start">0</text>
        <text v-if="kind !== 'wave'" :x="X(1)" :y="H - 8" text-anchor="end">1</text>
        <text v-if="xLabel" :x="X(0.5)" :y="H - 8" text-anchor="middle">{{ xLabel }}</text>
        <text v-if="kind !== 'wave'" :x="PAD.l - 6" :y="Y(0) + 3" text-anchor="end">0</text>
        <text v-if="kind !== 'wave'" :x="PAD.l - 6" :y="Y(1) + 3" text-anchor="end">1</text>
        <text v-if="kind === 'wave'" :x="PAD.l - 6" :y="Y(1) + 3" text-anchor="end">+1</text>
        <text v-if="kind === 'wave'" :x="PAD.l - 6" :y="Y(0) + 3" text-anchor="end">−1</text>
      </g>
    </svg>
    <svg v-else viewBox="0 0 240 44" focusable="false" aria-hidden="true">
      <circle v-for="(on, i) in lit" :key="i" :cx="40 + i * 40" cy="22" r="9" class="m-dsplot__led" :class="{ 'is-on': on }" />
    </svg>
  </figure>
</template>
