<script setup>
import { computed } from 'vue'

// Wavy progress for work of known length (indeterminate when `value` is null). Use MLoading for short waits.
const props = defineProps({
  value: { type: Number, default: null }, // 0..1
  circular: { type: Boolean, default: false },
  flat: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
const p = computed(() => (props.value == null ? null : Math.min(1, Math.max(0, props.value))))
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
  <div v-if="!circular" class="m-wave" :class="{ 'm-wave--flat': flat, 'm-wave--indeterminate': p == null }" role="progressbar" :aria-label="label || undefined" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="p == null ? undefined : Math.round(p * 100)">
    <span v-if="p != null" class="m-wave__active" :style="{ width: `calc(${p * 100}% - 4px)` }"><i /></span>
    <span v-else class="m-wave__active m-wave__active--run"><i /></span>
    <span v-if="p != null" class="m-wave__track" :style="{ left: `calc(${p * 100}% + 4px)` }" />
    <span v-else class="m-wave__track m-wave__track--run" />
    <b class="m-wave__stop" />
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
