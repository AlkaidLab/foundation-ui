<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import MButton from '../MButton.vue'
import MSeg from '../MSeg.vue'
import { cueDelay, delayStats } from '../../testtools/logic.js'

// 输入延迟: "to screen" is the time from a press reaching the window (the event's own time stamp) to the frame after it being drawn; "reaction" is the time from a cue (the area turns
// to the primary colour) to the press. Both stop when the tool goes; the reaction round starts on a press of Start.
const props = defineProps({ T: { type: Object, required: true } })
const mode = ref('paint')
const samples = ref([])
const hit = ref(false)
const phase = ref('idle') // idle | waiting | go | early
const area = ref(null)
let cue = 0, cueAt = 0, hitTimer = 0, raf = 0
const stats = computed(() => delayStats(samples.value))
const options = computed(() => [{ value: 'paint', label: props.T.latency.paint, icon: 'touch_app' }, { value: 'react', label: props.T.latency.react, icon: 'timer' }])
const keep = (ms) => { samples.value = [...samples.value.slice(-199), ms] }
function paint(e) {
  const t0 = e.timeStamp
  hit.value = true; clearTimeout(hitTimer); hitTimer = setTimeout(() => { hit.value = false }, 140)
  // the frame that carries the change, then the next task: the earliest moment the window knows the frame is out
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => { setTimeout(() => keep(Math.max(0, performance.now() - t0)), 0) })
}
function begin() {
  clearTimeout(cue); phase.value = 'waiting'; area.value?.focus()
  cue = setTimeout(async () => { phase.value = 'go'; await nextTick(); raf = requestAnimationFrame(() => { cueAt = performance.now() }) }, cueDelay(Math.random()))
}
function press(e) {
  if (e.type === 'keydown' && (e.repeat || e.key === 'Tab')) return
  if (e.type === 'keydown') e.preventDefault()
  if (mode.value === 'paint') return paint(e)
  if (phase.value === 'waiting') { clearTimeout(cue); phase.value = 'early' } else if (phase.value === 'go' && cueAt) { keep(Math.max(0, e.timeStamp - cueAt)); phase.value = 'idle'; cueAt = 0 }
}
function pick(v) { mode.value = v; clearTimeout(cue); phase.value = 'idle'; samples.value = [] }
const reset = () => { samples.value = []; clearTimeout(cue); phase.value = 'idle'; cueAt = 0 }
const rows = computed(() => { const s = stats.value; const L = props.T.latency; const f = (v) => `${v.toFixed(1)} ${L.ms}`; return s ? [[L.last, f(s.last)], [L.mean, f(s.mean)], [L.best, f(s.best)], [L.worst, f(s.worst)], [L.spread, f(s.spread)], [L.count, String(s.count)]] : [] })
const say = computed(() => (mode.value === 'paint' ? props.T.latency.area : props.T.latency[phase.value === 'idle' ? 'idle' : phase.value === 'waiting' ? 'waiting' : phase.value === 'go' ? 'go' : 'early']))
onBeforeUnmount(() => { clearTimeout(cue); clearTimeout(hitTimer); cancelAnimationFrame(raf) })
</script>

<template>
  <section class="m-tt__tool">
    <p class="m-tt__note">{{ T.latency.note }}</p>
    <MSeg :model-value="mode" :label="T.tools.latency" :options="options" @update:model-value="pick" />
    <div ref="area" class="m-tt__stage m-tt__pad m-tt__cue" :class="{ 'is-hit': hit, 'is-go': mode === 'react' && phase === 'go', 'is-early': mode === 'react' && phase === 'early' }" tabindex="0" :aria-label="say" aria-live="polite" @pointerdown="press" @keydown="press" @contextmenu.prevent>
      <span class="m-tt__hint">{{ say }}</span>
    </div>
    <div class="m-tt__row">
      <MButton v-if="mode === 'react'" :variant="phase === 'idle' || phase === 'early' ? 'filled' : 'tonal'" icon="play_arrow" :disabled="phase === 'waiting' || phase === 'go'" @click="begin">{{ T.start }}</MButton>
      <MButton variant="text" icon="restart_alt" :disabled="!samples.length" @click="reset">{{ T.reset }}</MButton>
    </div>
    <dl v-if="rows.length" class="m-tt__stats"><div v-for="[k, v] in rows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div></dl>
  </section>
</template>
