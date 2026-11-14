<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import MButton from '../MButton.vue'
import { paceStats } from '../../testtools/logic.js'

// 帧率与卡顿: a bar that moves at a fixed speed (960 px/s) and the statistics of every frame the window received.
const props = defineProps({ T: { type: Object, required: true } })
const running = ref(false)
const bar = ref(null)
const stats = ref(null)
let times = []
let raf = 0
let t0 = 0
const SPEED = 960
function tick(t) {
  times.push(t)
  if (times.length > 3000) times.shift()
  const w = bar.value?.parentElement?.clientWidth || 600
  if (bar.value) bar.value.style.transform = `translateX(${((t - t0) * SPEED / 1000) % (w - 24)}px)`
  if (times.length % 15 === 0) stats.value = paceStats(times)
  raf = requestAnimationFrame(tick)
}
function start() { times = []; t0 = performance.now(); running.value = true; raf = requestAnimationFrame(tick) }
function stop() { cancelAnimationFrame(raf); running.value = false; stats.value = paceStats(times) }
onBeforeUnmount(() => cancelAnimationFrame(raf))
const rows = computed(() => { const s = stats.value; const T = props.T.pacing; return s ? [[T.refresh, `${s.refreshHz.toFixed(1)} Hz`], [T.avg, `${s.avgFps.toFixed(1)}`], [T.low, `${s.lowFps.toFixed(1)}`], [T.janks, String(s.janks)], [T.longest, `${s.longestMs.toFixed(1)} ${T.ms}`], [T.frames, String(s.frames)]] : [] })
</script>

<template>
  <section class="m-tt__tool">
    <p class="m-tt__note">{{ T.pacing.note }}</p>
    <div class="m-tt__lane"><i ref="bar" class="m-tt__bar" /></div>
    <div class="m-tt__row"><MButton :variant="running ? 'tonal' : 'filled'" :icon="running ? 'stop' : 'play_arrow'" @click="running ? stop() : start()">{{ running ? T.stop : T.start }}</MButton></div>
    <dl v-if="rows.length" class="m-tt__stats"><div v-for="[k, v] in rows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div></dl>
  </section>
</template>
