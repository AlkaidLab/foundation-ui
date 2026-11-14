<script setup>
import { computed } from 'vue'

/**
 * A bar inside a table cell or a row: value over max as a rounded track and fill, with the number beside it. tone: '' | ok | warn | err, or
 * `thresholds` [{ at (0..1), tone }] to colour the fill by how full it is. `marker` (0..1) draws a target tick on the track.
 */
const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 1 },
  text: { type: String, default: '' },
  tone: { type: String, default: '' },
  thresholds: { type: Array, default: () => [] },
  marker: { type: Number, default: null },
  label: { type: String, default: '' },
  width: { type: Number, default: 0 },
})
const frac = computed(() => (props.max > 0 && Number.isFinite(props.value) ? Math.max(0, Math.min(1, props.value / props.max)) : 0))
const kind = computed(() => props.tone || [...props.thresholds].sort((a, b) => a.at - b.at).reduce((t, x) => (frac.value >= x.at ? x.tone : t), ''))
</script>

<template>
  <span class="m-ibar" :class="kind && `m-ibar--${kind}`" :style="width ? { width: `${width}px` } : undefined" role="meter" :aria-valuenow="Math.round(frac * 100)" aria-valuemin="0" aria-valuemax="100" :aria-label="label || undefined">
    <span class="m-ibar__track"><i class="m-ibar__fill" :style="{ width: `${frac * 100}%` }" /><b v-if="marker !== null" class="m-ibar__mark" :style="{ left: `${Math.max(0, Math.min(1, marker)) * 100}%` }" /></span>
    <em v-if="text" class="m-ibar__text">{{ text }}</em>
  </span>
</template>
