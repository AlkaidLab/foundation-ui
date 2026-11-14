<script setup>
// Tile kit (docs/tile-kit.md): the art of a game or an application: its cover when the host has one; without one the app's own icon (its image, or the glyph of a
// built-in app) on surface-container-high, else a neutral glyph (tileCover.js): never a gradient, never an initial letter.
// Give `item` (coverOf()) or just `name`, `cover` and `icon`. The element fills the box it is given (size it from outside: height and aspect-ratio, a radius).
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import { coverOf } from './tileCover.js'
import { coverOk } from './coverOk.js'

const props = defineProps({ item: { type: Object, default: null }, name: { type: String, default: '' }, cover: { type: String, default: '' }, icon: { type: String, default: '' } })
// a picture that is not a cover (a pixel, a file that does not load: coverOk.js) is the icon
const c = computed(() => { const v = props.item || coverOf({ name: props.name, cover: props.cover, icon: props.icon }); return v.cover && !coverOk(v.cover) ? coverOf({ name: v.name, icon: props.item?.icon || props.icon }) : v })
</script>

<template>
  <i class="m-tcover" :class="c.cover ? 'has-art' : 'is-icon'" :style="c.cover ? { backgroundImage: `url(${c.cover})` } : undefined" aria-hidden="true">
    <img v-if="!c.cover && c.iconUrl" class="m-tcover__img" :src="c.iconUrl" alt="" />
    <MIcon v-else-if="!c.cover" class="m-tcover__glyph" :name="c.glyph" />
  </i>
</template>
