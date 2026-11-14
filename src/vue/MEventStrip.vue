<script setup>
import { computed } from 'vue'
// Events on a time axis as marks (dropped frames, errors, session starts). events: [{ at (0..1 of the span), label, tone: warn|err|info }]
const props = defineProps({ events: { type: Array, default: () => [] }, height: { type: Number, default: 24 }, label: { type: String, default: '' }, empty: { type: String, default: '' } })
const marks = computed(() => props.events.filter((e) => Number.isFinite(e.at) && e.at >= 0 && e.at <= 1))
</script>
<template>
  <div class="m-estrip" :style="{ height: `${height}px` }" role="list" :aria-label="label">
    <span v-if="!marks.length" class="m-estrip__empty">{{ empty }}</span>
    <i v-for="(e, k) in marks" :key="k" role="listitem" class="m-estrip__mark" :class="e.tone && `m-estrip__mark--${e.tone}`" :style="{ left: `${e.at * 100}%` }" :title="e.label" />
  </div>
</template>
