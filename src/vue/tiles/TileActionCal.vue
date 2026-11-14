<script>
export const tileIds = ['act-add-app']
</script>

<script setup>
// 添加应用 as calibrated in round 31 (tiles/cal/CalAction.vue): the whole tile is the button.
import { designProps } from './tileData.js'
import CalAction from './cal/CalAction.vue'

defineProps(designProps)
const emit = defineEmits(['act'])
</script>

<template>
  <CalAction :card="card" @act="(a) => emit('act', a)" />
</template>
