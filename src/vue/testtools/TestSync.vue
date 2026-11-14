<script setup>
import { onBeforeUnmount, ref } from 'vue'
import MButton from '../MButton.vue'
import { fillText } from '../guideTexts.js'
import { syncTicks } from '../../testtools/logic.js'

// 音画同步: once a second a flash and a 1 kHz beep scheduled on the audio clock for the same moment; the flash is drawn in the first frame at or after that time.
const props = defineProps({ T: { type: Object, required: true } })
const running = ref(false)
const flash = ref(false)
const n = ref(0)
const latency = ref(null)
const unsupported = ref(false)
let ctx = null
let ticks = []
let raf = 0
function beep(at) { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = 1000; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.5, at + 0.005); g.gain.setValueAtTime(0.5, at + 0.045); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05); o.connect(g).connect(ctx.destination); o.start(at); o.stop(at + 0.06) }
function loop() {
  while (ticks.length && ctx.currentTime >= ticks[0]) { ticks.shift(); n.value += 1; flash.value = true; setTimeout(() => { flash.value = false }, 60) }
  if (ticks.length < 3) { const next = (ticks.at(-1) ?? ctx.currentTime) + 1; ticks.push(next); beep(next) }
  raf = requestAnimationFrame(loop)
}
async function start() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) { unsupported.value = true; return }
  ctx = new AC(); await ctx.resume()
  latency.value = Math.round(((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000)
  ticks = syncTicks(ctx.currentTime, 3); ticks.forEach(beep); n.value = 0; running.value = true; raf = requestAnimationFrame(loop)
}
function stop() { cancelAnimationFrame(raf); running.value = false; flash.value = false; ctx?.close(); ctx = null }
onBeforeUnmount(stop)
</script>

<template>
  <section class="m-tt__tool">
    <p class="m-tt__note">{{ T.sync.note }}</p>
    <div class="m-tt__stage m-tt__flash" :class="{ 'is-on': flash }"><b>{{ running ? fillText(T.sync.count, { n }) : '' }}</b></div>
    <div class="m-tt__row"><MButton :variant="running ? 'tonal' : 'filled'" :icon="running ? 'stop' : 'play_arrow'" @click="running ? stop() : start()">{{ running ? T.stop : T.start }}</MButton><span v-if="latency !== null" class="m-tt__fact">{{ T.sync.latency }}: {{ latency }} ms</span><span v-if="unsupported" class="m-tt__fact">{{ T.sync.unsupported }}</span></div>
  </section>
</template>
