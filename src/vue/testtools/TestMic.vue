<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MButton from '../MButton.vue'
import MNotice from '../MNotice.vue'
import { createPeakHold, levelDb, meterShare, peakDb } from '../../testtools/logic.js'

// 麦克风电平: the raw level of a microphone (echo cancellation, noise suppression and auto gain off). Nothing is asked until Start is pressed; stopping, switching device and leaving the page end the stream.
const props = defineProps({ T: { type: Object, required: true } })
const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
const state = ref('idle') // idle | asking | on
const error = ref('')
const devices = ref([])
const deviceId = ref('')
const level = ref(-90), peak = ref(-90), quiet = ref(null), clips = ref(0)
const info = ref({ rate: 0, channels: 0 })
const bar = ref(null), mark = ref(null)
const hold = createPeakHold()
let stream = null, ctx = null, analyser = null, buf = null, raf = 0, shown = 0
const ERRORS = { NotAllowedError: 'denied', SecurityError: 'denied', NotFoundError: 'none', OverconstrainedError: 'none', NotReadableError: 'busy', AbortError: 'busy' }
const fmt = (db) => (db <= -89 ? '−∞' : db.toFixed(1))
const hardware = computed(() => devices.value.length > 1)
async function list() { try { devices.value = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput' && d.deviceId) } catch { devices.value = [] } }
function halt() {
  cancelAnimationFrame(raf); raf = 0
  stream?.getTracks().forEach((t) => { t.onended = null; t.stop() }); stream = null
  ctx?.close?.().catch(() => {}); ctx = null; analyser = null
}
async function start(id = deviceId.value) {
  if (!supported) { error.value = 'unsupported'; return }
  halt(); error.value = ''; state.value = 'asking'
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: id ? { exact: id } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
  } catch (e) { state.value = 'idle'; error.value = ERRORS[e?.name] || 'none'; return }
  const track = stream.getAudioTracks()[0]
  deviceId.value = track?.getSettings().deviceId || id
  track.onended = () => { halt(); state.value = 'idle'; error.value = 'none' }
  const AC = window.AudioContext || window.webkitAudioContext
  ctx = new AC(); await ctx.resume()
  analyser = ctx.createAnalyser(); analyser.fftSize = 2048; buf = new Float32Array(analyser.fftSize)
  ctx.createMediaStreamSource(stream).connect(analyser)
  info.value = { rate: ctx.sampleRate, channels: track?.getSettings().channelCount || 1 }
  hold.reset(); level.value = peak.value = -90; quiet.value = null; clips.value = 0; state.value = 'on'
  await list()
  raf = requestAnimationFrame(tick)
}
function tick(t) {
  if (!analyser) return
  analyser.getFloatTimeDomainData(buf)
  const rms = levelDb(buf), top = peakDb(buf), held = hold.push(top, t)
  if (bar.value) bar.value.style.clipPath = `inset(0 ${(100 - meterShare(rms) * 100).toFixed(1)}% 0 0)`
  if (mark.value) mark.value.style.transform = `translateX(${(meterShare(held) * 100).toFixed(1)}%)`
  if (top >= -0.1) clips.value += 1
  if (t - shown > 100) { shown = t; level.value = rms; peak.value = held; if (rms > -89) quiet.value = quiet.value === null ? rms : Math.min(quiet.value, rms) }
  raf = requestAnimationFrame(tick)
}
function stop() { halt(); state.value = 'idle'; level.value = peak.value = -90; if (bar.value) bar.value.style.clipPath = 'inset(0 100% 0 0)' }
const onChange = () => { if (state.value === 'on') list() }
onMounted(() => navigator.mediaDevices?.addEventListener?.('devicechange', onChange))
onBeforeUnmount(() => { navigator.mediaDevices?.removeEventListener?.('devicechange', onChange); halt() })
const rows = computed(() => { const M = props.T.mic; return [[M.level, `${fmt(level.value)} ${M.db}`], [M.peak, `${fmt(peak.value)} ${M.db}`], [M.quiet, quiet.value === null ? '–' : `${fmt(quiet.value)} ${M.db}`], [M.clip, String(clips.value)], [M.rate, info.value.rate ? `${info.value.rate} ${M.hz}` : '–'], [M.channels, info.value.channels ? String(info.value.channels) : '–']] })
</script>

<template>
  <section class="m-tt__tool">
    <p class="m-tt__note">{{ T.mic.note }}</p>
    <MNotice v-if="!supported" tone="warn">{{ T.mic.unsupported }}</MNotice>
    <MNotice v-else-if="error" tone="error">{{ T.mic[error] }}</MNotice>
    <div class="m-tt__row">
      <MButton v-if="state !== 'on'" icon="mic" :loading="state === 'asking'" :disabled="!supported" @click="start()">{{ T.mic.start }}</MButton>
      <MButton v-else variant="tonal" icon="close" @click="stop">{{ T.mic.stop }}</MButton>
    </div>
    <div class="m-tt__meter" role="meter" :aria-label="T.mic.level" aria-valuemin="-60" aria-valuemax="0" :aria-valuenow="Math.max(-60, Math.round(level))" :class="{ 'is-clip': peak >= -0.1 }">
      <i ref="bar" class="m-tt__level" /><i ref="mark" class="m-tt__peak" />
      <ol class="m-tt__scale" aria-hidden="true"><li v-for="d in [-60, -40, -20, -10, 0]" :key="d" :style="{ left: `${meterShare(d) * 100}%` }">{{ d }}</li></ol>
    </div>
    <div v-if="hardware" class="m-tt__chips" role="group" :aria-label="T.mic.device">
      <MButton v-for="d in devices" :key="d.deviceId" size="sm" :variant="d.deviceId === deviceId ? 'filled' : 'tonal'" :disabled="state === 'asking'" @click="start(d.deviceId)">{{ d.label || T.mic.defaultDevice }}</MButton>
    </div>
    <dl class="m-tt__stats"><div v-for="[k, v] in rows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div></dl>
  </section>
</template>
