<script>
export const tileIds = ['current-app']
</script>

<script setup>
// 正在玩 as calibrated in round 31 (tiles/cal/CalNow.vue): the cover is the one focal element.
import { designProps, sizeOf } from './tileData.js'
import MTileEmpty from '../MTileEmpty.vue'
import CalNow from './cal/CalNow.vue'

defineProps(designProps)
const emit = defineEmits(['act'])
</script>

<template>
  <section v-if="empty" class="m-tile m-cal" :data-size="sizeOf(card)"><MTileEmpty :icon="empty.icon" :title="empty.title" :text="empty.value" :action="empty.action" :size="sizeOf(card)" @act="(a) => emit('act', a)" /></section>
  <CalNow v-else :card="card" />
</template>
