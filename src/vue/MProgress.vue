<script setup>
import { computed, ref, watch } from 'vue'
import { createShown, isDone, isFlat } from './waveProgress.js'

// Wavy progress for work of known length (indeterminate when `value` is null). Use MLoading for short waits.
const props = defineProps({
  value: { type: Number, default: null }, // 0..1
  circular: { type: Boolean, default: false },
  flat: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
const p = computed(() => (props.value == null ? null : Math.min(1, Math.max(0, props.value))))
// The value that is drawn. While the length is unknown the bar shows the waiting state and the determinate parts fade out; when the value is known again the bar starts from
// no progress and moves to it (Compose LinearWavyProgressIndicator: "the indeterminate lines leave the track and the indicator then animates from no progress to the returned
// value"), instead of cutting from one drawing to the other. A value that only changes (up, or back down) is drawn at once and eased by the width transition.
const shown = ref(p.value ?? 0)
const later = (fn, ms) => (ms ? setTimeout(fn, ms) : typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => requestAnimationFrame(fn)) : setTimeout(fn, 32))
const drawn = createShown(p.value, (v) => { shown.value = v }, later)
watch(p, (v) => drawn.feed(v))
// WavyProgressIndicatorDefaults.indicatorAmplitude: no wave at 10 % and below or at 95 % and above, the full wave in between (the change takes 500 ms, as in Compose)
const flatNow = computed(() => props.flat || isFlat(shown.value))
// a track shorter than the gap and the stop dot is not drawn: the finished bar has no track and no stop indicator
const done = computed(() => isDone(shown.value))
// circular (CircularProgressIndicatorTokens, Compose Material3): 48 px with the wave (WaveSize), stroke 4, amplitude 1.6, wavelength 15:
// a centre line of radius 24 - 2 - 1.6 = 20.4 carries 8 waves (2 pi 20.4 / 8 = 16.0, the nearest whole number of waves to a wavelength of 15)
const wave = computed(() => {
  const n = 8, amp = props.flat ? 0 : 1.6, r = 20.4, pts = []
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * Math.PI * 2 - Math.PI / 2
    const rr = r + amp * Math.sin(a * n)
    pts.push(`${(24 + rr * Math.cos(a)).toFixed(2)} ${(24 + rr * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
})
</script>

<template>
  <div v-if="!circular" class="m-wave" :class="{ 'm-wave--flat': flat, 'm-wave--indeterminate': p == null, 'is-flat': flatNow, 'is-done': done }" role="progressbar" :aria-label="label || undefined" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="p == null ? undefined : Math.round(p * 100)">
    <span class="m-wave__active" :style="{ width: `calc(${shown * 100}% - 4px)` }"><i /><em class="m-wave__flat" /></span>
    <span class="m-wave__track" :style="{ left: `calc(${shown * 100}% + 4px)` }" />
    <b class="m-wave__stop" />
    <!-- waiting (the length is not known): one wave segment travels along and the track fills what is left on both sides of it, with a gap; the group moves as one body, so the track is never drawn behind the wave -->
    <span class="m-wave__run" aria-hidden="true"><span class="m-wave__group"><span class="m-wave__seg"><i /></span><span class="m-wave__tl" /><span class="m-wave__tr" /></span></span>
  </div>
  <!-- indeterminate (ProgressIndicator.kt circularIndeterminate*): the arc grows from 10 % to 87 % and back in 6 s while the whole turns 1080 degrees
       linearly and jumps a further 90 degrees every 1.5 s; no track (circularIndeterminateTrackColor is transparent) -->
  <svg v-else class="m-wave-circle" :class="{ 'm-wave-circle--spin': p == null }" viewBox="0 0 48 48" role="progressbar" :aria-label="label || undefined" :aria-valuenow="p == null ? undefined : Math.round(p * 100)">
    <template v-if="p != null">
      <circle class="m-wave-circle__track" cx="24" cy="24" r="20.4" pathLength="100" :stroke-dasharray="`${Math.max(0, 100 - p * 100 - 6)} 200`" :stroke-dashoffset="-(p * 100 + 3)" />
      <path class="m-wave-circle__active" :d="wave" pathLength="100" :stroke-dasharray="`${p * 100} 200`" />
    </template>
    <g v-else class="m-wave-circle__turn"><g class="m-wave-circle__jump"><path class="m-wave-circle__active m-wave-circle__arc" :d="wave" pathLength="100" /></g></g>
  </svg>
</template>
