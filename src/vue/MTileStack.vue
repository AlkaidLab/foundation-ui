<script setup>
// Tile kit (docs/tile-kit.md): a stack of covers (games, apps: fanned cards, the first on top, as in the Photos and TV widgets) or of avatars (devices, clients:
// overlapping circles ringed in the card colour, as in the Batteries widget). Items: { cover?, letter?, icon?, tone? }; `more` adds a +n bubble.
import { coverOk, coverStyle } from './coverOk.js'
import MIcon from './MIcon.vue'

defineProps({
  items: { type: Array, default: () => [] },
  kind: { type: String, default: 'avatars' },
  more: { type: Number, default: 0 },
  /** a CSS length: the height of a cover or the side of an avatar */
  size: { type: String, default: '48px' },
})
</script>

<template>
  <div class="m-tstack" :class="`m-tstack--${kind}`" :data-n="items.length" :style="{ '--tst': size }" aria-hidden="true">
    <i v-for="(c, i) in items" :key="i" :class="[`i${i}`, c.tone && `is-${c.tone}`]" :style="coverStyle(c.cover)"><MIcon v-if="!coverOk(c.cover) && c.icon" :name="c.icon" /><template v-else-if="!coverOk(c.cover)">{{ c.letter }}</template></i>
    <b v-if="more">+{{ more }}</b>
  </div>
</template>
