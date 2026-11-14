<script>
export const tileIds = ['quick']
</script>

<script setup>
// 快捷操作 as calibrated in round 31 (tiles/cal/CalQuick.vue): one row of Quick Settings pills.
import { designProps } from './tileData.js'
import CalQuick from './cal/CalQuick.vue'

defineProps(designProps)
const emit = defineEmits(['act'])
</script>

<template>
  <CalQuick :card="card" @act="(a) => emit('act', a)" />
</template>
