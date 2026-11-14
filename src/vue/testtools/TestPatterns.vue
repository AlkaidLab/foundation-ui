<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MSeg from '../MSeg.vue'
import MButton from '../MButton.vue'
import { BARS, PATTERNS, hdrSteps, nearBlack, nearWhite, rampSteps } from '../../testtools/logic.js'

// 画面测试图: one pattern on a canvas of the display's own pixels (device pixels, no scaling), full screen on demand.
const props = defineProps({ T: { type: Object, required: true } })
const id = ref('bars')
const box = ref(null)
const canvas = ref(null)
const options = computed(() => PATTERNS.map((p) => ({ value: p, label: props.T.pattern[p] })))
const gray = (v) => `rgb(${v},${v},${v})`
function draw() {
  const c = canvas.value
  if (!c) return
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr)
  c.width = w; c.height = h
  const g = c.getContext('2d')
  g.imageSmoothingEnabled = false
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h)
  const label = (text, x, y, color = '#fff') => { g.fillStyle = color; g.font = `${Math.round(12 * dpr)}px sans-serif`; g.textAlign = 'center'; g.fillText(text, x, y) }
  if (id.value === 'bars') BARS.forEach((rgb, i) => { g.fillStyle = `rgb(${rgb})`; g.fillRect(Math.round((i * w) / 8), 0, Math.ceil(w / 8), h) })
  else if (id.value === 'ramp') {
    const steps = rampSteps(64)
    steps.forEach((s, i) => { g.fillStyle = gray(s.code); g.fillRect(Math.round((i * w) / 64), 0, Math.ceil(w / 64), h / 2) })
    const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#000'); grad.addColorStop(1, '#fff'); g.fillStyle = grad; g.fillRect(0, h / 2, w, h / 2)
  } else if (id.value === 'black' || id.value === 'white') {
    const list = id.value === 'black' ? nearBlack() : nearWhite()
    g.fillStyle = gray(id.value === 'black' ? 0 : 255); g.fillRect(0, 0, w, h)
    const cols = 13, cw = w / cols, rh = h / Math.ceil(list.length / cols)
    list.forEach((s, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * rh; g.fillStyle = gray(s.code); g.fillRect(x + cw * 0.08, y + rh * 0.08, cw * 0.84, rh * 0.84); label(String(s.code) + (s.video ? ' ▲' : ''), x + cw / 2, y + rh * 0.9, s.code > 127 ? '#000' : '#fff') })
  } else if (id.value === 'sharp') {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'
    for (let x = 0; x < w / 2; x += 2) g.fillRect(x, 0, 1, h / 2)
    for (let y = 0; y < h / 2; y += 2) for (let x = 0; x < w / 2; x += 2) if (((x + y) / 2) % 2 === 0) g.fillRect(w / 2 + x, y, 1, 1)
    for (let y = h / 2; y < h; y += 2) g.fillRect(0, y, w / 2, 1)
    g.strokeStyle = '#fff'; g.lineWidth = 1; for (let a = 0; a < 180; a += 6) { g.beginPath(); g.moveTo(w * 0.75, h * 0.75); const r = Math.min(w, h) * 0.24; g.lineTo(w * 0.75 + Math.cos((a * Math.PI) / 90) * r, h * 0.75 + Math.sin((a * Math.PI) / 90) * r); g.stroke() }
  } else if (id.value === 'chroma') {
    const pairs = [['#ff0000', '#0000ff'], ['#00ff00', '#ff00ff'], ['#ffffff', '#ff0000'], ['#ffff00', '#0000ff']]
    pairs.forEach(([fg, bg], i) => { g.fillStyle = bg; g.fillRect(0, (i * h) / 4, w, h / 4); g.fillStyle = fg; g.textAlign = 'left'; ;[8, 10, 12, 16].forEach((px, k) => { g.font = `${Math.round(px * dpr)}px sans-serif`; g.fillText('Foundation Sunshine 串流 4:4:4 0123456789', 12 * dpr, (i * h) / 4 + (k + 1) * (h / 4 / 5)) }) })
  } else {
    const steps = hdrSteps(1000)
    steps.forEach((s, i) => { const x = (i * w) / steps.length; g.fillStyle = gray(Math.round(255 * Math.min(1, s.pq / 1023))); g.fillRect(x + 4 * dpr, h * 0.1, w / steps.length - 8 * dpr, h * 0.8); label(`${Math.round(s.share * 100)}%`, x + w / steps.length / 2, h * 0.5, s.pq > 520 ? '#000' : '#fff'); label(`(${s.pq})`, x + w / steps.length / 2, h * 0.5 + 16 * dpr, s.pq > 520 ? '#000' : '#fff') })
  }
}
const full = () => box.value?.requestFullscreen?.()
// the listeners are on the document and the window, not on the tool's own element: they go when the tool goes, or every resize would draw a canvas that is no longer there
const redraw = () => nextTick(draw)
onMounted(() => { draw(); document.addEventListener('fullscreenchange', redraw); window.addEventListener('resize', draw) })
onBeforeUnmount(() => { document.removeEventListener('fullscreenchange', redraw); window.removeEventListener('resize', draw) })
watch(id, () => nextTick(draw))
</script>

<template>
  <section class="m-tt__tool">
    <MSeg v-model="id" :label="T.tools.patterns" :options="options" />
    <p class="m-tt__note">{{ T.patternNote[id] }}</p>
    <div ref="box" class="m-tt__stage"><canvas ref="canvas" class="m-tt__canvas" /></div>
    <div class="m-tt__row"><MButton variant="tonal" icon="fullscreen" @click="full">{{ T.fullscreen }}</MButton></div>
  </section>
</template>
