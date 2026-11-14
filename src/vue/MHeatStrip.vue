<script setup>
import { computed } from 'vue'
import { heatLevels } from '../charts/chartMath.js'
// Calendar heat strip: one cell per day, five levels of the primary colour (sessions over the last 30 days). days: [{ label, value }]
const props = defineProps({ days: { type: Array, default: () => [] }, cell: { type: Number, default: 14 }, label: { type: String, default: '' }, empty: { type: String, default: '' } })
const levels = computed(() => heatLevels(props.days.map((d) => d.value)))
</script>
<template>
  <div class="m-heat" role="list" :aria-label="label" :style="{ '--cell': `${cell}px` }">
    <span v-if="!days.length" class="m-estrip__empty">{{ empty }}</span>
    <i v-for="(d, k) in days" :key="k" role="listitem" class="m-heat__cell" :data-l="levels[k]" :title="`${d.label}: ${d.value}`" tabindex="-1" />
  </div>
</template>
