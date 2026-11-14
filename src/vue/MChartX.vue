<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { areaBetween, domainOf, fitDomain, histogram, monotonePath, nearestIndex, niceTicks, rangeTicks, seriesPoints, stack, tickDecimals } from '../charts/chartMath.js'

/**
 * The chart for every use case: line, area (overlaid), stacked area, mirrored area (up and down), bar, grouped bar, stacked bar and histogram.
 * One shared sample axis for all series, smooth monotone curves, minimal gridlines, a compact legend or direct labels, a crosshair with a value
 * tooltip (pointer and keyboard: arrows, Home, End, Escape), an optional threshold line and target band, empty and sparse states.
 * series: [{ id, label, values: number[], color? }]; for `hist` the first series holds the raw samples. `labels` name the samples (times).
 */
const props = defineProps({
  type: { type: String, default: 'line' }, // line | area | stacked | mirror | bar | groupbar | stackbar | hist
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  height: { type: Number, default: 120 },
  unit: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  threshold: { type: Object, default: null }, // { value, label }
  band: { type: Object, default: null }, // { lo, hi, label }
  floor: { type: Number, default: 0 }, // the smallest top of the scale, so a quiet series is not stretched flat
  fixedMax: { type: Number, default: null },
  bins: { type: Number, default: 12 },
  legend: { type: String, default: 'compact' }, // compact | direct | none
  axis: { type: Boolean, default: true },
  empty: { type: String, default: '' },
  label: { type: String, default: '' },
  minSamples: { type: Number, default: 2 },
  zero: { type: Boolean, default: false }, // a line starts at zero; by default it is fitted to its data (frame rate, temperature)
  maxBar: { type: Number, default: 40 }, // the widest a bar gets (px): a chart with few bars is not a few wide blocks
  gutter: { type: Number, default: null }, // width left of the plot; give charts that sit above each other the same one so their time axes line up
})
// series colours: the ramp made from the seed (src/tokens/chartColors.js); never primary, secondary or tertiary, and never the red and amber of limits and errors
const COLORS = ['var(--md-sys-color-chart1)', 'var(--md-sys-color-chart2)', 'var(--md-sys-color-chart3)', 'var(--md-sys-color-chart4)', 'var(--md-sys-color-chart5)', 'var(--md-sys-color-chart6)']
const root = ref(null)
const w = ref(320)
let ro = null
onMounted(() => { const read = () => { w.value = Math.max(60, Math.round(root.value.getBoundingClientRect().width)) }; if (typeof ResizeObserver === 'undefined') read(); else { ro = new ResizeObserver(read); ro.observe(root.value) } })
onBeforeUnmount(() => ro?.disconnect())

const padL = computed(() => props.gutter ?? (props.axis ? 34 : 4)), padB = computed(() => (props.axis ? 16 : 4)), padT = 6, padR = 6
const pw = computed(() => w.value - padL.value - padR), ph = computed(() => props.height - padT - padB.value)
const list = computed(() => props.series.map((s, i) => ({ ...s, color: s.color || COLORS[i % COLORS.length] })))
const isBars = computed(() => ['bar', 'groupbar', 'stackbar', 'hist'].includes(props.type))
const hist = computed(() => (props.type === 'hist' ? histogram(list.value[0]?.values || [], props.bins) : null))
const values = computed(() => (hist.value ? [hist.value.counts] : list.value.map((s) => s.values)))
const n = computed(() => Math.max(0, ...values.value.map((v) => v.length)))
const sparse = computed(() => n.value < props.minSamples || !values.value.some((v) => v.some(Number.isFinite)))

const dom = computed(() => {
  if (props.type === 'stacked' || props.type === 'stackbar') { const tops = stack(values.value).map((s) => s.top); return props.fixedMax ? { lo: 0, hi: props.fixedMax } : domainOf([tops[tops.length - 1] || []], { floor: props.floor }) }
  if (props.type === 'mirror') { const hi = domainOf(values.value.map((v) => v), { floor: props.floor }).hi; return { lo: -hi, hi } }
  // a band and a threshold are part of the picture: the scale holds them
  const marks = [props.band?.lo, props.band?.hi, props.threshold?.value].filter((v) => Number.isFinite(v))
  const vals = marks.length ? [...values.value, marks] : values.value
  const fitted = props.type === 'line' && !props.zero
  const d = fitted ? fitDomain(vals) : domainOf(vals, { zero: true, floor: props.floor })
  return props.fixedMax ? { lo: d.lo, hi: props.fixedMax, step: d.step } : d
})
const yOf = (v) => padT + ph.value - ((Math.min(Math.max(v, dom.value.lo), dom.value.hi) - dom.value.lo) / ((dom.value.hi - dom.value.lo) || 1)) * ph.value
const xOf = (i) => padL.value + (n.value > 1 ? (i / (n.value - 1)) * pw.value : pw.value / 2)
const pts = (vals, sign = 1) => vals.map((v, i) => (Number.isFinite(v) ? { x: xOf(i), y: yOf(sign * v), v } : null)).filter(Boolean)
const base = computed(() => yOf(props.type === 'mirror' ? 0 : dom.value.lo))

const shapes = computed(() => {
  if (sparse.value || isBars.value) return []
  if (props.type === 'stacked') { const st = stack(values.value); return list.value.map((s, i) => ({ ...s, fill: areaBetween(pts(st[i].top), pts(st[i].base)), line: monotonePath(pts(st[i].top)) })).reverse() }
  if (props.type === 'mirror') return list.value.map((s, i) => { const sign = i === 0 ? 1 : -1; const p = pts(s.values, sign); const z = p.map((q) => ({ x: q.x, y: yOf(0) })); return { ...s, fill: areaBetween(p, z), line: monotonePath(p) } })
  return list.value.map((s) => { const p = pts(s.values); const z = p.map((q) => ({ x: q.x, y: base.value })); return { ...s, fill: props.type === 'area' || props.type === 'line' ? areaBetween(p, z) : '', line: monotonePath(p) } })
})
const bars = computed(() => {
  if (sparse.value || !isBars.value) return []
  const out = []; const slot = pw.value / Math.max(n.value, 1)
  const groups = props.type === 'groupbar' ? list.value.length : 1
  const bw = Math.min(props.maxBar / groups, Math.max(2, (slot * 0.72) / groups))
  const st = props.type === 'stackbar' ? stack(values.value) : null
  for (let i = 0; i < n.value; i++) {
    const cx = padL.value + slot * i + slot / 2
    list.value.forEach((s, si) => {
      if (hist.value && si > 0) return
      const v = hist.value ? hist.value.counts[i] : s.values[i]
      if (!Number.isFinite(v)) return
      if (st) { out.push({ x: cx - bw / 2, y: yOf(st[si].top[i]), h: Math.max(0, yOf(st[si].base[i]) - yOf(st[si].top[i])), w: bw, color: s.color, i }) }
      else { const x = props.type === 'groupbar' ? cx - (bw * groups) / 2 + si * bw : cx - bw / 2; out.push({ x, y: yOf(v), h: Math.max(1, yOf(0) - yOf(v)), w: bw - (groups > 1 ? 1 : 0), color: s.color, i }) }
    })
  }
  return out
})
const step = computed(() => dom.value.step || (dom.value.hi - dom.value.lo) / 2)
const ticks = computed(() => {
  if (!props.axis) return []
  const list = props.type === 'mirror' ? [dom.value.hi, 0, dom.value.lo] : dom.value.step ? rangeTicks(dom.value.lo, dom.value.hi, dom.value.step, 4) : niceTicks(dom.value.hi, 2)
  return list.map((t) => ({ v: t, y: yOf(t) }))
})
const fmt = (v) => (Number.isFinite(v) ? Number(v).toFixed(props.decimals) : '–')
const fmtTick = (v) => Math.abs(v).toFixed(Math.abs(Math.abs(v) - Math.round(Math.abs(v))) < 1e-9 && step.value >= 1 ? 0 : props.decimals || tickDecimals(step.value))

// ---- crosshair and tooltip ----
const idx = ref(-1)
const say = ref('')
const at = (i) => { idx.value = i; say.value = i < 0 ? '' : tipRows.value.map((r) => `${r.label} ${r.text}`).join(', ') }
function onMove(e) { const r = root.value.getBoundingClientRect(); const x = e.clientX - r.left - padL.value; if (x < -6 || x > pw.value + 6) return at(-1); at(nearestIndex(Math.max(0, x), pw.value, isBars.value ? n.value * 1 : n.value)) }
function onKey(e) {
  const last = n.value - 1
  if (e.key === 'ArrowLeft') at(Math.max(0, (idx.value < 0 ? last : idx.value) - 1))
  else if (e.key === 'ArrowRight') at(Math.min(last, idx.value + 1))
  else if (e.key === 'Home') at(0)
  else if (e.key === 'End') at(last)
  else if (e.key === 'Escape') at(-1)
  else return
  e.preventDefault()
}
const tipRows = computed(() => (idx.value < 0 ? [] : (hist.value ? [{ label: `${fmt(hist.value.edges[idx.value])}–${fmt(hist.value.edges[idx.value + 1])}`, color: list.value[0]?.color, text: String(hist.value.counts[idx.value]) }] : list.value.map((s) => ({ label: s.label, color: s.color, text: `${fmt(s.values[idx.value])}${props.unit ? ` ${props.unit}` : ''}` })))))
const tipTitle = computed(() => (idx.value >= 0 ? props.labels[idx.value] ?? '' : ''))
const cx = computed(() => (idx.value < 0 ? 0 : isBars.value ? padL.value + (pw.value / Math.max(n.value, 1)) * (idx.value + 0.5) : xOf(idx.value)))
const tipLeft = computed(() => (cx.value > w.value * 0.6 ? 'auto' : `${cx.value + 10}px`))
const tipRight = computed(() => (cx.value > w.value * 0.6 ? `${w.value - cx.value + 10}px` : 'auto'))
</script>

<template>
  <figure ref="root" class="m-cx" :style="{ '--ch': `${height}px` }">
    <div v-if="sparse" class="m-cx__empty" :style="{ height: `${height}px` }">{{ empty }}</div>
    <svg v-else class="m-cx__svg" :width="w" :height="height" :viewBox="`0 0 ${w} ${height}`" tabindex="0" role="img" :aria-label="label" @pointermove="onMove" @pointerleave="at(-1)" @keydown="onKey" @blur="at(-1)">
      <g class="m-cx__grid"><line v-for="t in ticks" :key="t.v" :x1="padL" :x2="w - padR" :y1="t.y" :y2="t.y" /></g>
      <g class="m-cx__ticks"><text v-for="t in ticks" :key="t.v" :x="padL - 6" :y="t.y + 4" text-anchor="end">{{ fmtTick(t.v) }}</text></g>
      <rect v-if="band" class="m-cx__band" :x="padL" :width="pw" :y="yOf(band.hi)" :height="Math.max(0, yOf(band.lo) - yOf(band.hi))" />
      <line v-if="type === 'mirror'" class="m-cx__zero" :x1="padL" :x2="w - padR" :y1="yOf(0)" :y2="yOf(0)" />
      <g v-for="s in shapes" :key="s.id || s.label" :style="{ '--c': s.color }">
        <path v-if="s.fill" class="m-cx__fill" :class="{ 'is-solid': type === 'stacked' || type === 'mirror' }" :d="s.fill" />
        <path class="m-cx__line" :d="s.line" />
      </g>
      <rect v-for="(b, k) in bars" :key="k" class="m-cx__bar" :class="{ 'is-on': b.i === idx }" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="3" :style="{ '--c': b.color }" />
      <g v-if="threshold" class="m-cx__threshold"><line :x1="padL" :x2="w - padR" :y1="yOf(threshold.value)" :y2="yOf(threshold.value)" /><text :x="w - padR" :y="yOf(threshold.value) - 4" text-anchor="end">{{ threshold.label }}</text></g>
      <g v-if="idx >= 0" class="m-cx__cross"><line :x1="cx" :x2="cx" :y1="padT" :y2="padT + ph" /><circle v-for="s in (isBars ? [] : shapes)" :key="s.id || s.label" :cx="cx" :cy="yOf(type === 'stacked' ? stack(values).reduce((a, st, k) => (list[k].id === s.id ? st.top[idx] : a), 0) : (type === 'mirror' && s.id === list[1]?.id ? -s.values[idx] : s.values[idx]))" r="4.5" :fill="s.color" /></g>
      <g v-if="labels.length && axis" class="m-cx__ticks"><text :x="padL" :y="height - 3">{{ labels[0] }}</text><text :x="w - padR" :y="height - 3" text-anchor="end">{{ labels[labels.length - 1] }}</text></g>
    </svg>
    <div v-if="idx >= 0" class="m-cx__tip" :style="{ left: tipLeft, right: tipRight }" role="status"><b v-if="tipTitle">{{ tipTitle }}</b><span v-for="r in tipRows" :key="r.label"><i :style="{ background: r.color }" />{{ r.label }} <em>{{ r.text }}</em></span></div>
    <figcaption v-if="legend !== 'none' && list.length > 1 && !sparse" class="m-cx__legend"><span v-for="s in list" :key="s.id || s.label"><i :style="{ background: s.color }" />{{ s.label }}</span></figcaption>
    <span class="m-cx__live" aria-live="polite">{{ say }}</span>
  </figure>
</template>
