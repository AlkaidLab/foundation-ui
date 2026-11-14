<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { reducedMotion } from '../appearance/motion.js'
import { DOT_R, dotPaths, hanziTime, onClockTick } from '../appearance/clockFaces.js'
import { CLOCK_INK } from '../appearance/clockInk.js'
import { useAppearance } from './useAppearance.js'

// The clock of the dock, in one of fifteen faces in the spirit of the lock-screen clocks of Android (Material You) and iOS/iPadOS: Default (two lines of large digits), Metro
// (condensed, heavy), Calligraphy, Inflate (wide, round, heavy), Growth (the weight grows through the minute), Handwritten, Numoverlap (four coloured digits that overlap),
// Analog (a Material dial), Minimal, Flex (a ramp of weights and widths that turns over on the minute), Tall (very tall condensed digits in a two-tone fill that stretch to the
// space), Dot matrix, Outline (outlined digits over a layer), Flip (split-flap cards that really flip) and 文字 (the time in Chinese words, a brush hand).
// Fonts: open ones only (see fonts/FONTS.md). Colours are the theme's tonal palette. Nothing moves with reduced motion (动画 减少, or the system's when it follows the system).
// `at` fixes the time (a preview, a test); otherwise the clock runs on the shared timer (clockFaces.js): every whole minute, every whole second with seconds, paused while hidden.
// The size, the seconds and the position come from the appearance (个性化) unless given. The edge of the clock is its ink, not its text box: the glyphs' side bearings and an
// italic's overhang (measured from pixels, clockInk.js) are given back as margins in em, so the ink sits exactly on the dock's inset at every size and every frame of a resize.
const props = defineProps({
  face: { type: String, default: 'default' },
  locale: { type: String, default: 'en' },
  at: { type: Number, default: 0 },
  /** a small live preview (the picker): no sizes of the dock */
  preview: { type: Boolean, default: false },
  /** s, m, l, xl; empty: the appearance's */
  size: { type: String, default: '' },
  /** seconds; unset: the appearance's */
  seconds: { type: Boolean, default: undefined },
})
const ap = useAppearance().state
const sizeOf = computed(() => (props.preview ? 'm' : props.size || ap.clockSize || 'm'))
const secondsOn = computed(() => props.seconds ?? !!ap.clockSeconds)
const now = ref(props.at || Date.now())
const root = ref(null)
const secEl = ref(null)
let tick = null
const date = computed(() => new Date(props.at || now.value))
const pad = (n) => String(n).padStart(2, '0')
const hh = computed(() => pad(date.value.getHours()))
const mm = computed(() => pad(date.value.getMinutes()))
const ss = computed(() => pad(date.value.getSeconds()))
const label = computed(() => `${hh.value}:${mm.value}${secondsOn.value ? ':' + ss.value : ''}`)
const ticking = ref(false) // false, or when the minute's breathing began (ms)
let tickTimer = 0
// Growth: the weight rises with the seconds of the minute; Analog: the hands
const grow = computed(() => (reducedMotion() ? 400 : Math.round(200 + 600 * (date.value.getSeconds() / 60))))
const angles = computed(() => ({ h: ((date.value.getHours() % 12) + date.value.getMinutes() / 60) * 30, m: date.value.getMinutes() * 6 }))
const digits = computed(() => [...hh.value, ...mm.value])
const chars = computed(() => [...hh.value, ':', ...mm.value])
const hz = computed(() => hanziTime(date.value.getHours(), date.value.getMinutes(), date.value.getSeconds()))
const dots = computed(() => (props.face === 'dots' ? dotPaths(hh.value, mm.value, secondsOn.value ? ss.value : '', DOT_R[sizeOf.value] || DOT_R.m) : null))
// the dot matrix's edge is its lit dots: a dark outer column (a 1) is given back as a negative margin (em of the clock; the drawing is .9 em tall), like a glyph's bearing
const dotsStyle = computed(() => (dots.value ? { aspectRatio: dots.value.ratio, marginLeft: `${-0.9 * dots.value.unit * dots.value.inL}em`, marginRight: `${-0.9 * dots.value.unit * dots.value.inR}em` } : undefined))
const STACKED = new Set(['default', 'metro', 'inflate', 'outline'])
const LINE = new Set(['calligraphy', 'growth', 'handwritten', 'minimal', 'tall'])
const needsSeconds = () => secondsOn.value || props.face === 'growth'

// the second hand of the dial sweeps on the compositor (a CSS animation of the hand's transform, nothing per frame on the page); with reduced motion it steps once a second
const sweepKey = ref(0)
const sweepDelay = ref(0)
const resync = (t) => { const d = new Date(t); sweepDelay.value = -(d.getSeconds() + d.getMilliseconds() / 1000); sweepKey.value++ }
const sweepStyle = computed(() => (reducedMotion() || props.at ? { transform: `rotate(${date.value.getSeconds() * 6}deg)`, animation: 'none' } : { animationDelay: `${sweepDelay.value}s` }))

// Flip: each card shows the new value on its upper half and the old one on its lower half until the leaves have turned: the upper leaf (old) falls, the lower one (new) lands
const flip = reactive({ h: { cur: '', prev: '', k: 0 }, m: { cur: '', prev: '', k: 0 }, s: { cur: '', prev: '', k: 0 } })
const setFlip = (g, v) => { const c = flip[g]; if (c.cur === v) return; c.prev = c.cur && !reducedMotion() && !props.preview ? c.cur : v; c.cur = v; c.k++ }
watch([hh, mm, ss], ([h, m, s]) => { setFlip('h', h); setFlip('m', m); setFlip('s', s) }, { immediate: true })

// ---- the ink ----
// The edge of the clock is its ink. Every glyph's ink past its advance box was measured from rendered pixels (clockInk.js; canvas measureText cannot: it draws the
// proportional figures and knows no width axis, and its bearings for these faces were off by up to 0.04 em). For each [data-ink] element: the first glyph's left
// overhang and the last glyph's right one, in em of the element, become its margins (CSS). The seconds change every second, so their side is the worst of all digits:
// the ink never passes the inset and nothing is restyled per second. Runs on a new minute, a face or seconds change; never in a resize (em follows the size).
const roleOf = (el) => { const c = el.classList; return c.contains('m-clock__s') ? 's' : c.contains('m-clock__l--s') ? 'ls' : c.contains('m-clock__fx--0') ? 'fx0' : c.contains('m-clock__fx--4') ? 'fx4' : c.contains('m-clock__d--0') ? 'd0' : c.contains('m-clock__d--3') ? 'd3' : c.contains('m-clock__l') ? 'l' : 'line' }
const textNodes = (el) => { const out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) if (n.data.trim()) out.push(n); return out }
// the overhang (px) of a text node's first (side 0) or last (side 1) glyph; a changing node (the seconds) takes the worst glyph it can show
function overhang(node, side) {
  const p = node.parentElement, t = CLOCK_INK[`${props.face}:${roleOf(p)}`]
  if (!t) return 0
  const changing = !!p.closest('.m-clock__s, .m-clock__l--s')
  const chars = changing ? Object.keys(t) : [side ? node.data.trim().at(-1) : node.data.trim()[0]]
  return Math.max(...chars.map((ch) => (t[ch] ? t[ch][side] : 0))) * (parseFloat(getComputedStyle(p).fontSize) || 0)
}
function measure() {
  const el = root.value
  if (!el) return
  for (const ink of el.querySelectorAll('[data-ink]')) {
    const nodes = textNodes(ink)
    if (!nodes.length) continue
    const fs = parseFloat(getComputedStyle(ink).fontSize) || 1
    ink.style.setProperty('--ovl', (overhang(nodes[0], 0) / fs).toFixed(4))
    ink.style.setProperty('--ovr', (overhang(nodes[nodes.length - 1], 1) / fs).toFixed(4))
  }
}
// a new minute (or face, or seconds on/off): measure the ink of the new digits first, then breathe (an animation would change the axes being measured)
watch([hh, mm, () => props.face, secondsOn, () => hz.value.hour + hz.value.minute], async (v, old) => {
  await nextTick(); measure()
  if (old && v[1] !== old[1] && !reducedMotion() && !props.at) { ticking.value = Date.now(); clearTimeout(tickTimer); if (!needsSeconds()) tickTimer = setTimeout(() => { ticking.value = false }, 1300) }
}, { flush: 'post' })
// the seconds tick: transform and opacity only, on the compositor; none with reduced motion
watch(ss, () => {
  if (!secondsOn.value || reducedMotion() || props.at || !secEl.value?.animate) return
  // a drawing (the dot matrix) only fades: a transform of an SVG element is laid out again on the main thread every frame
  const k = props.face === 'dots' ? [{ opacity: 0.45 }, { opacity: 1 }] : [{ transform: 'translateY(-.14em)', opacity: 0.45 }, { transform: 'none', opacity: 1 }]
  secEl.value.animate(k, { duration: 260, easing: 'cubic-bezier(.2, .8, .3, 1)' })
}, { flush: 'post' })
watch(needsSeconds, () => tick?.rearm())
onMounted(() => {
  if (!props.at) { tick = onClockTick((t) => { if (t - now.value > 2500) resync(t); now.value = t; if (ticking.value && t - ticking.value >= 1200) ticking.value = false }, needsSeconds); resync(Date.now()) }
  measure()
})
onBeforeUnmount(() => { tick?.stop(); clearTimeout(tickTimer) })
</script>

<template>
  <time ref="root" class="m-clock" :class="[`m-clock--${face}`, `is-${sizeOf}`, { 'has-sec': secondsOn, 'is-tick': ticking, 'is-preview': preview }]" :datetime="label" :aria-label="label" :style="face === 'growth' ? { '--clock-w': grow } : undefined">
    <template v-if="STACKED.has(face)">
      <span class="m-clock__l m-clock__l--a" data-ink :data-text="hh" aria-hidden="true">{{ hh }}</span><span class="m-clock__l m-clock__l--b" data-ink :data-text="mm" aria-hidden="true">{{ mm }}<span v-if="secondsOn" ref="secEl" class="m-clock__s" :data-text="ss">{{ ss }}</span></span>
    </template>
    <span v-else-if="LINE.has(face)" class="m-clock__line" data-ink aria-hidden="true">{{ hh }}:{{ mm }}<span v-if="secondsOn" ref="secEl" class="m-clock__s">{{ ss }}</span></span>
    <span v-else-if="face === 'flex'" class="m-clock__line" data-ink aria-hidden="true"><span v-for="(c, i) in chars" :key="i" class="m-clock__fx" :class="`m-clock__fx--${i}`">{{ c }}</span><span v-if="secondsOn" ref="secEl" class="m-clock__s">{{ ss }}</span></span>
    <span v-else-if="face === 'numoverlap'" class="m-clock__row" data-ink aria-hidden="true"><span v-for="(d, i) in digits" :key="i" class="m-clock__d" :class="`m-clock__d--${i}`">{{ d }}</span><span v-if="secondsOn" ref="secEl" class="m-clock__s">{{ ss }}</span></span>
    <template v-else-if="face === 'hanzi'">
      <span class="m-clock__l m-clock__l--a" data-ink aria-hidden="true">{{ hz.hour }}</span><span class="m-clock__l m-clock__l--b" data-ink aria-hidden="true">{{ hz.minute }}</span><span v-if="secondsOn" ref="secEl" class="m-clock__l m-clock__l--s" data-ink aria-hidden="true">{{ hz.second }}</span>
    </template>
    <svg v-else-if="face === 'dots'" class="m-clock__dots" :viewBox="dots.box" :style="dotsStyle" aria-hidden="true">
      <path class="m-clock__dots-off" :d="dots.off" /><path class="m-clock__dots-h" :d="dots.h" /><path class="m-clock__dots-c" :d="dots.colon" /><path class="m-clock__dots-m" :d="dots.m" /><path v-if="secondsOn" ref="secEl" class="m-clock__dots-s" :d="dots.s" />
    </svg>
    <template v-else-if="face === 'flip'">
      <span v-for="g in secondsOn ? ['h', 'm', 's'] : ['h', 'm']" :key="g" class="m-flip" :class="`m-flip--${g}`" aria-hidden="true">
        <span class="m-flip__half m-flip__top"><i>{{ flip[g].cur }}</i></span><span class="m-flip__half m-flip__bot"><i>{{ flip[g].prev }}</i></span>
        <template v-if="flip[g].prev !== flip[g].cur"><span :key="'a' + flip[g].k" class="m-flip__half m-flip__top m-flip__leaf-a"><i>{{ flip[g].prev }}</i></span><span :key="'b' + flip[g].k" class="m-flip__half m-flip__bot m-flip__leaf-b"><i>{{ flip[g].cur }}</i></span></template>
      </span>
    </template>
    <template v-else-if="face === 'analog'">
      <svg class="m-clock__dial" viewBox="-96 -96 192 192" aria-hidden="true">
        <circle class="m-clock__face" r="96" />
        <line v-for="n in 12" :key="n" class="m-clock__tick" :class="{ 'is-q': (n - 1) % 3 === 0 }" x1="0" :y1="-80" x2="0" :y2="(n - 1) % 3 === 0 ? -68 : -74" :transform="`rotate(${(n - 1) * 30})`" />
        <line class="m-clock__hand m-clock__hand--h" x1="0" y1="6" x2="0" y2="-46" :transform="`rotate(${angles.h})`" />
        <line class="m-clock__hand m-clock__hand--m" x1="0" y1="8" x2="0" y2="-70" :transform="`rotate(${angles.m})`" />
        <circle v-if="!secondsOn" class="m-clock__pin" r="6" />
      </svg>
      <svg v-if="secondsOn" :key="sweepKey" class="m-clock__sweep" viewBox="-96 -96 192 192" :style="sweepStyle" aria-hidden="true"><line class="m-clock__hand m-clock__hand--s" x1="0" y1="14" x2="0" y2="-74" /><circle class="m-clock__dot" cy="-74" r="6" /><circle class="m-clock__pin" r="6" /></svg>
    </template>
    <span v-else class="m-clock__line" data-ink aria-hidden="true">{{ hh }}:{{ mm }}</span>
  </time>
</template>
