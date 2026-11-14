<script>
let seq = 0
</script>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MIcon from './MIcon.vue'
import MRoll from './MRoll.vue'
import { curvePaths } from './curve.js'
import { useDrawnPoints, useOnScreen } from './useOnScreen.js'
import { MText } from './textNode.js'

// Curve card: small title, peak at the end, big value with a small unit, a line of text, and an area curve that bleeds off
// the bottom and the sides of the card. No axis; the scale is in the detail sheet.
const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  peak: { type: String, default: '' },
  value: { type: String, default: '' },
  unit: { type: String, default: '' },
  caption: { type: String, default: '' },
  /** more lines under the caption at the medium and large size (the CPU model, the cores, the temperature) */
  facts: { type: Array, default: () => [] },
  points: { type: Array, default: () => [] },
  max: { type: Number, default: null },
  chevron: { type: Boolean, default: true },
  chevronLabel: { type: String, default: '' },
  /** the size it is drawn at: 中 the value and its curve; 大 adds the lowest, mean and highest of the curve and the facts of the hardware */
  size: { type: String, default: 'm' },
  decimals: { type: Number, default: 0 },
  labels: { type: Object, default: () => ({}) }, // { min, avg, max, peak }
})
const emit = defineEmits(['open'])
const root = ref(null)
const svg = ref(null)
const size = ref({ w: 300, h: 80 })
// one gradient per card: two cards of the same title (the grid and the gallery) must not share an id, the first of them may not be drawn
const gid = `g-curve-${++seq}`
let ro = null
onMounted(() => {
  // the chart has its own area under the text (it never runs through the text): its box is the svg's
  const read = () => { const r = svg.value.getBoundingClientRect(); size.value = { w: Math.max(40, Math.round(r.width)), h: Math.max(20, Math.round(r.height)) } }
  read()
  ro = new ResizeObserver(read)
  ro.observe(svg.value)
})
onBeforeUnmount(() => ro?.disconnect())
// the samples the curve draws: the latest while the card is seen (in the viewport, the page not hidden), frozen while it is not, unchanged samples not drawn again
const drawn = useDrawnPoints(() => props.points, useOnScreen(root))
// the lowest, the mean and the highest of the points the curve draws (the same samples, nothing else)
const stats = computed(() => {
  const p = drawn.value.filter((v) => Number.isFinite(v))
  if (props.size !== 'l' || p.length < 2) return []
  const f = (v) => `${v.toFixed(props.decimals)}${props.unit === '%' ? ' %' : props.unit ? ` ${props.unit}` : ''}`
  return [['min', Math.min(...p)], ['avg', p.reduce((a, b) => a + b, 0) / p.length], ['max', Math.max(...p)]].map(([k, v]) => ({ k, label: props.labels[k] || k, value: f(v) }))
})
// a curve without a fixed scale (bitrate, frame rate) is drawn over its own range, so its movement shows and the area under it is not a block from zero to the top;
// one that does not move (under 2 % of its value) stays a flat line in the middle (curve.js). A load has its fixed scale of 100 %.
const range = computed(() => {
  if (props.max != null) return { max: props.max }
  const p = drawn.value.filter((v) => Number.isFinite(v)); if (p.length < 2) return {}
  const hi = Math.max(...p), lo = Math.min(...p), d = hi - lo
  return d < Math.abs(hi) * 0.02 ? {} : { min: Math.max(0, lo - d * 0.6), max: hi + d * 0.2 }
})
// the first seconds of a stream: the host is asked every 3 s, so the second sample comes some seconds after the first, and with one sample there is no curve. The value is there already: until the curve
// has two samples it is drawn as what it is so far, a line that does not move (in the middle, like any curve that stays still), not an empty card.
const samples = computed(() => { const p = drawn.value.filter((v) => Number.isFinite(v)); if (p.length >= 2) return drawn.value; const v = p.length === 1 ? p[0] : props.value === '' || props.value == null ? NaN : Number(props.value); return Number.isFinite(v) ? [v, v] : drawn.value })
const paths = computed(() => curvePaths(samples.value, { w: size.value.w, h: size.value.h, pad: 0.16, ...range.value }))
</script>

<template>
  <section ref="root" class="m-dcard m-dcurve" :class="[{ 'is-empty': !paths.line }, `m-dcurve--${size}`]">
    <header class="m-dcard__head">
      <MIcon v-if="icon" class="m-dcard__icon" :name="icon" />
      <h3 class="m-dcard__title">{{ title }}</h3>
      <span v-if="peak" class="m-dcurve__peak"><MText :text="`${labels.peak ? `${labels.peak} ` : ''}${peak}${unit === '%' ? ' %' : unit ? ` ${unit}` : ''}`" /></span>
      <button v-if="chevron" type="button" class="m-dcard__more" :aria-label="chevronLabel || title" @click="emit('open')"><MIcon name="chevron_right" /></button>
    </header>
    <div class="m-dcurve__value"><b class="m-dnum"><MRoll :text="value || '–'" /></b><small v-if="value && unit">{{ unit }}</small></div>
    <div v-if="caption" class="m-dcurve__caption">{{ caption }}</div>
    <ul v-if="facts.length && size === 'l'" class="m-dcurve__facts"><li v-for="f in facts" :key="f">{{ f }}</li></ul>
    <dl v-if="stats.length" class="m-dcurve__stats"><div v-for="x in stats" :key="x.k"><dt>{{ x.label }}</dt><dd class="m-dnum">{{ x.value }}</dd></div></dl>
    <svg ref="svg" class="m-dcurve__svg" :viewBox="`0 0 ${size.w} ${size.h}`" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--md-sys-color-primary)" stop-opacity=".32" />
          <stop offset="1" stop-color="var(--md-sys-color-primary)" stop-opacity=".04" />
        </linearGradient>
      </defs>
      <template v-if="paths.line">
        <path v-if="paths.area" :d="paths.area" :fill="`url(#${gid})`" />
        <path :d="paths.line" class="m-dcurve__line" />
      </template>
      <line v-else x1="0" :y1="size.h - 1" :x2="size.w" :y2="size.h - 1" class="m-dcurve__zero" />
    </svg>
  </section>
</template>
