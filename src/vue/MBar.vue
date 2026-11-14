<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'

// Thick bar with the value inside (battery style): memory, CPU, GPU. `value` 0..1.
// The label is drawn twice, once over the track and once over the fill (clipped to it), so it reads at any fill.
const props = defineProps({
  value: { type: Number, required: true },
  icon: { type: String, default: '' },
  text: { type: String, default: '' },
  tone: { type: String, default: 'primary' },
  label: { type: String, default: '' },
})
const pct = computed(() => Math.round(Math.min(1, Math.max(0, props.value)) * 100))
</script>

<template>
  <div class="m-bar-thick" :class="`m-bar-thick--${tone}`" role="progressbar" :aria-label="label || undefined" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="pct">
    <span class="m-bar-thick__fill" :style="{ width: `${pct}%` }" />
    <span class="m-bar-thick__content"><MIcon v-if="icon" :name="icon" /><span class="m-bar-thick__text">{{ text }}</span><b>{{ pct }}%</b></span>
    <span class="m-bar-thick__content m-bar-thick__content--on" aria-hidden="true" :style="{ clipPath: `inset(0 ${100 - pct}% 0 0 round 22px)` }"><MIcon v-if="icon" :name="icon" /><span class="m-bar-thick__text">{{ text }}</span><b>{{ pct }}%</b></span>
  </div>
</template>
