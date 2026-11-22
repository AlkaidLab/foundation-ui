<script setup>
// Tile kit (docs/tile-kit.md): the header row of a tile: its icon in the accent, its title, an optional end (a chip, a peak) and the chevron that opens its sheet.
import MIcon from './MIcon.vue'
import MWords from './MWords.vue'

const props = defineProps({ icon: { type: String, default: '' }, title: { type: String, default: '' }, chevron: { type: Boolean, default: false }, chevronLabel: { type: String, default: '' } })
// A title of Chinese or Japanese text that has to wrap breaks between its words, not inside one ('使用基地 / 虚拟显示器', not '使用基地虚 / 拟显示器'): each word is kept whole (MWords).
const emit = defineEmits(['open'])
</script>

<template>
  <header class="m-tile__head">
    <MIcon v-if="icon" :name="icon" />
    <span><MWords :text="title" /></span>
    <slot />
    <button v-if="chevron" type="button" class="m-tile__more" :aria-label="chevronLabel || title" @click.stop="emit('open')"><MIcon name="chevron_right" /></button>
  </header>
</template>
