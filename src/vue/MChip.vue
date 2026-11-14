<script setup>
import MIcon from './MIcon.vue'

defineProps({
  tone: { type: String, default: 'neutral' }, // neutral | ok | info | warn | error | tertiary
  icon: { type: String, default: '' },
  // a picture in place of the icon (a brand mark, e.g. the Sparxie character); drawn as an image so the bundle carries no path data
  image: { type: String, default: '' },
})
</script>

<template>
  <span class="m-chip" :class="tone !== 'neutral' && `m-chip--${tone}`">
    <img v-if="image" class="m-chip__img" :src="image" alt="" aria-hidden="true" draggable="false">
    <MIcon v-else-if="icon" :name="icon" fill />
    <span v-if="image" class="m-chip__label"><slot /></span>
    <slot v-else />
  </span>
</template>
