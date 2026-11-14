<script setup>
import { computed } from 'vue'

// A Material analogue clock: a tonal face, sixty ticks (the hours long and heavy), numerals at the quarters, a primary hour hand and a thinner minute hand, a tertiary seconds hand that
// sweeps with the milliseconds, a cap in the middle. `at` is the time in ms (the page owns the timer); `seconds` shows the seconds hand. It is a picture of the time: the page's own readout
// carries the words, so the dial is hidden from assistive technology.
const props = defineProps({
  at: { type: Number, default: 0 },
  seconds: { type: Boolean, default: true },
  /** the hand of seconds jumps once a second instead of sweeping */
  step: { type: Boolean, default: false },
  size: { type: Number, default: 280 },
})
const date = computed(() => new Date(props.at))
const sec = computed(() => date.value.getSeconds() + (props.step ? 0 : date.value.getMilliseconds() / 1000))
const min = computed(() => date.value.getMinutes() + sec.value / 60)
const hour = computed(() => (date.value.getHours() % 12) + min.value / 60)
const ticks = Array.from({ length: 60 }, (_, i) => i)
const QUARTERS = [[12, 0, -66], [3, 66, 0], [6, 0, 66], [9, -66, 0]]
</script>

<template>
  <svg class="m-dial" :width="size" :height="size" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
    <circle class="m-dial__face" r="98" />
    <line v-for="i in ticks" :key="i" class="m-dial__tick" :class="{ 'is-hour': i % 5 === 0 }" x1="0" :y1="i % 5 === 0 ? -86 : -88" x2="0" :y2="i % 5 === 0 ? -76 : -83" :transform="`rotate(${i * 6})`" />
    <text v-for="[n, x, y] in QUARTERS" :key="n" class="m-dial__num" :x="x" :y="y" text-anchor="middle" dominant-baseline="central">{{ n }}</text>
    <line class="m-dial__hand m-dial__hand--h" x1="0" y1="8" x2="0" y2="-46" :transform="`rotate(${hour * 30})`" />
    <line class="m-dial__hand m-dial__hand--m" x1="0" y1="10" x2="0" y2="-68" :transform="`rotate(${min * 6})`" />
    <g v-if="seconds" :transform="`rotate(${sec * 6})`"><line class="m-dial__sec" x1="0" y1="18" x2="0" y2="-74" /><circle class="m-dial__sec-dot" cy="-74" r="4.5" /></g>
    <circle class="m-dial__cap" r="6" />
  </svg>
</template>

<style>
.m-dial { display: block; max-width: 100%; height: auto; }
.m-dial__face { fill: var(--md-sys-color-surface-container-high); }
.m-dial__tick { stroke: var(--md-sys-color-outline); stroke-width: 1.2; stroke-linecap: round; } .m-dial__tick.is-hour { stroke: var(--md-sys-color-on-surface); stroke-width: 3; }
.m-dial__num { fill: var(--md-sys-color-on-surface-variant); font: 600 14px var(--m-font-display); font-variant-numeric: tabular-nums; }
.m-dial__hand { stroke-linecap: round; } .m-dial__hand--h { stroke: var(--md-sys-color-primary); stroke-width: 8; } .m-dial__hand--m { stroke: var(--md-sys-color-on-surface); stroke-width: 5; }
.m-dial__sec { stroke: var(--md-sys-color-tertiary); stroke-width: 2.4; stroke-linecap: round; } .m-dial__sec-dot { fill: var(--md-sys-color-tertiary); }
.m-dial__cap { fill: var(--md-sys-color-surface); stroke: var(--md-sys-color-primary); stroke-width: 3; }
</style>
