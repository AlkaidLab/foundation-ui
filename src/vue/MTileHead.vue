<script setup>
// Tile kit (docs/tile-kit.md): the header row of a tile: its icon in the accent, its title, an optional end (a chip, a peak) and the chevron that opens its sheet.
import MIcon from './MIcon.vue'

defineProps({ icon: { type: String, default: '' }, title: { type: String, default: '' }, chevron: { type: Boolean, default: false }, chevronLabel: { type: String, default: '' } })
const emit = defineEmits(['open'])
</script>

<template>
  <header class="m-tile__head">
    <MIcon v-if="icon" :name="icon" />
    <span>{{ title }}</span>
    <slot />
    <button v-if="chevron" type="button" class="m-tile__more" :aria-label="chevronLabel || title" @click.stop="emit('open')"><MIcon name="chevron_right" /></button>
  </header>
</template>
