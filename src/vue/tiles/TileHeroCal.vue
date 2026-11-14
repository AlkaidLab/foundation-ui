<script>
export const tileIds = ['hero']
</script>

<script setup>
// 本主机 as calibrated in round 31 (tiles/cal/CalHero.vue). The person's two choices in 个性化 (appearance.js): heroStyle 柔和 (default) or 实色, and heroArt
// (while streaming the card takes its colours from the game's cover; default on). The facts: F1 while idle, F2 while streaming.
import { designProps } from './tileData.js'
import { computed } from 'vue'
import CalHero from './cal/CalHero.vue'
import { useAppearance } from '../useAppearance.js'

defineProps(designProps)
const emit = defineEmits(['act'])
const ap = useAppearance()
const variant = computed(() => (ap.state.heroStyle === 'solid' ? 1 : 2))
</script>

<template>
  <CalHero :card="card" :texts="texts" :variant="variant" :tint="ap.state.heroArt !== false" facts="auto" @act="(a) => emit('act', a)" />
</template>
