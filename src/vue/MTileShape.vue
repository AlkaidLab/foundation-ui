<script setup>
// Tile kit (docs/tile-kit.md): an expressive shape of the Material 3 shape library (shapes.css: cookie, clover, gem, sunny, burst, squircle, circle) holding an icon:
// the hero of a tile that has no chart, no art and no number to show, and the badge of one that has. `shape` empty: the shape of the tile's group ([data-group], dash.css).
// Tones: container (the accent's container, the default), solid (the accent itself), tonal (the accent at a low opacity over the card, for a shape that bleeds off an edge).
import MIcon from './MIcon.vue'
import { SHAPES } from './tileMotion.js'

defineProps({
  icon: { type: String, default: '' },
  shape: { type: String, default: '' },
  /** a CSS length: the side of the shape; the icon is half of it */
  size: { type: String, default: '56px' },
  tone: { type: String, default: 'container' },
})
</script>

<template>
  <span class="m-tshape" :class="`m-tshape--${tone}`" :style="{ '--ts': size, ...(SHAPES[shape] ? { '--ts-shape': SHAPES[shape] } : {}) }" aria-hidden="true"><MIcon v-if="icon" :name="icon" /><slot /></span>
</template>
