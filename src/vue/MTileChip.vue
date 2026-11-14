<script setup>
// Tile kit (docs/tile-kit.md): a chip of a tile, a state or a short fact (120 Hz, HDR 开, H.265). Tones: '' (neutral), accent, ok, warn, err.
import MIcon from './MIcon.vue'

defineProps({ label: { type: String, required: true }, icon: { type: String, default: '' }, tone: { type: String, default: '' } })
</script>

<template>
  <span class="m-tchip" :class="tone && `m-tchip--${tone}`"><MIcon v-if="icon" :name="icon" />{{ label }}</span>
</template>
