<script>
export const tileIds = ['fps', 'bitrate', 'cpu', 'gpu', 'memory']
</script>

<script setup>
// The metric family as calibrated in round 31 (tiles/cal/CalMetric.vue: the 帧率 中 of df9ac45, refined), drawn in the product; its empty state is the kit's.
import MTileEmpty from '../MTileEmpty.vue'
import CalMetric from './cal/CalMetric.vue'
import { sizeOf, designProps } from './tileData.js'

defineProps(designProps)
const emit = defineEmits(['act'])
</script>

<template>
  <section v-if="empty" class="m-tile m-cal" :data-size="sizeOf(card)"><MTileEmpty :icon="empty.icon" :title="empty.title" :text="empty.value" :action="empty.action" :size="sizeOf(card)" @act="(a) => emit('act', a)" /></section>
  <CalMetric v-else :card="card" :texts="texts" :chevron="chevron" @act="(a) => emit('act', a)" />
</template>
