<script>
export const tileIds = ['clients-online']
</script>

<script setup>
// 在线客户端 as calibrated in round 31 (tiles/cal/CalOnline.vue); its empty state is the kit's.
import MTileEmpty from '../MTileEmpty.vue'
import CalOnline from './cal/CalOnline.vue'
import { sizeOf, designProps } from './tileData.js'

defineProps(designProps)
const emit = defineEmits(['act'])
</script>

<template>
  <section v-if="empty" class="m-tile m-cal" :data-size="sizeOf(card)"><MTileEmpty :icon="empty.icon" :title="empty.title" :text="empty.value" :action="empty.action" :size="sizeOf(card)" @act="(a) => emit('act', a)" /></section>
  <CalOnline v-else :card="card" :texts="texts" />
</template>
