<script setup>
// The latency test clock (toolbox, 延迟测试时钟). Photograph the host screen and the client's stream of it together: latency = host reading −
// client reading. Every frame (requestAnimationFrame) writes three text nodes and one transform, nothing else: the time HH:MM:SS.mmm in tabular digits (its width
// never changes), the sweep bar across the second (readable in a blurry photo), the frame counter; the refresh rate and the frame interval (the error of a reading)
// every half second. The face is opaque and drawn in pure white on black or black on white (the photo modes), with no transition, blur or translucency.
// standalone: the face alone, filling its window (the panel's window on the streamed display); Esc emits close.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MButton from './MButton.vue'
import MIcon from './MIcon.vue'
import MSeg from './MSeg.vue'
import { createClock, deltaRing, formatClock, frameStats, sweepOf } from '../latency/clock.js'
import { latencyClockTexts } from '../latency/texts.js'

const props = defineProps({
  locale: { type: String, default: 'zh' },
  texts: { type: Object, default: () => ({}) },
  /** the face alone, filling the window */
  standalone: { type: Boolean, default: false },
  /** the product can put the clock full screen on the display the stream captures (the panel) */
  canStream: { type: Boolean, default: false },
  /** the external test page kept as a secondary link */
  externalUrl: { type: String, default: 'https://yangkile.github.io/D-lay/' },
  /** 'dark' (white on black) or 'light' (black on white); empty: the one chosen last */
  mode: { type: String, default: '' },
})
const emit = defineEmits(['fullscreen-stream', 'open-external', 'close'])
const T = computed(() => latencyClockTexts(props.locale, props.texts))

const KEY = 'foundation-ui.latency.mode'
const stored = () => { try { return globalThis.localStorage?.getItem(KEY) || '' } catch { return '' } }
const photo = ref(props.mode || stored() || 'dark')
watch(() => props.mode, (m) => { if (m) photo.value = m })
watch(photo, (m) => { try { globalThis.localStorage?.setItem(KEY, m) } catch { /* storage unavailable */ } })
const modes = computed(() => [{ value: 'dark', label: T.value.photoDark }, { value: 'light', label: T.value.photoLight }])

const face = ref(null), time = ref(null), mark = ref(null), frames = ref(null), hz = ref(null), interval = ref(null)
const clock = createClock()
const ring = deltaRing(120)
let raf = 0, last = 0, count = 0, statsAt = 0
const node = (el) => el?.firstChild
function tick(t) {
  const ms = clock.read()
  const tn = node(time.value); if (tn) tn.data = formatClock(ms)
  if (mark.value) mark.value.style.transform = `translate3d(${(sweepOf(ms) * 100).toFixed(2)}%, 0, 0)`
  count += 1; const fn = node(frames.value); if (fn) fn.data = String(count)
  if (last) ring.push(t - last)
  last = t
  if (t - statsAt >= 500) {
    statsAt = t
    const s = frameStats(ring.values())
    const hn = node(hz.value), inn = node(interval.value)
    if (s && hn) hn.data = `${s.hz.toFixed(1)} Hz`
    if (s && inn) inn.data = `${s.interval.toFixed(1)} ms`
  }
  raf = requestAnimationFrame(tick)
}
const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick) } }
const stop = () => { cancelAnimationFrame(raf); raf = 0 }
// a hidden page gets no frames: stop, and take a new anchor when it is shown again
const onVisible = () => { if (document.hidden) stop(); else { clock.resync(); ring.clear(); start() } }
const onKey = (e) => { if (props.standalone && e.key === 'Escape') emit('close') }
onMounted(() => { start(); document.addEventListener('visibilitychange', onVisible); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { stop(); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('keydown', onKey) })

const fullscreen = () => { const el = face.value; if (el?.requestFullscreen) el.requestFullscreen().catch(() => {}) }
const TICKS = Array.from({ length: 10 }, (_, i) => i)
</script>

<template>
  <section class="m-lclock" :class="{ 'is-standalone': standalone }">
    <div ref="face" class="m-lclock__face" :class="`is-${photo}`" role="timer" :aria-label="T.title">
      <!-- the per-frame nodes: their text is written by tick(), never by Vue (v-once) -->
      <div v-once ref="time" class="m-lclock__time" aria-hidden="true">00:00:00.000</div>
      <div class="m-lclock__sweep" aria-hidden="true">
        <div class="m-lclock__track"><i v-once ref="mark" class="m-lclock__mark" /></div>
        <ol class="m-lclock__ticks"><li v-for="i in TICKS" :key="i">{{ i }}</li></ol>
      </div>
      <dl class="m-lclock__stats">
        <div><dt>{{ T.frames }}</dt><dd v-once ref="frames">0</dd></div>
        <div><dt>{{ T.refresh }}</dt><dd v-once ref="hz">–</dd></div>
        <div><dt>{{ T.interval }}</dt><dd v-once ref="interval">–</dd></div>
      </dl>
      <span v-if="standalone" class="m-lclock__exit">{{ T.exit }}</span>
    </div>
    <template v-if="!standalone">
      <div class="m-lclock__bar">
        <MSeg v-model="photo" :label="T.photoMode" :options="modes" />
        <span class="m-lclock__actions">
          <MButton v-if="canStream" icon="cast" @click="emit('fullscreen-stream', { mode: photo })">{{ T.fullscreenStream }}</MButton>
          <MButton :variant="canStream ? 'tonal' : 'filled'" icon="aspect_ratio" @click="fullscreen">{{ T.fullscreen }}</MButton>
        </span>
      </div>
      <section class="m-lclock__guide">
        <h3>{{ T.guideTitle }}</h3>
        <ol><li v-for="(s, i) in T.steps" :key="i">{{ s }}</li></ol>
        <p class="m-lclock__note">{{ T.note }}</p>
        <MButton variant="text" icon="open_in_new" @click="emit('open-external', externalUrl)">{{ T.external }}</MButton>
      </section>
    </template>
  </section>
</template>
