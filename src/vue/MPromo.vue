<script setup>
import MIcon from './MIcon.vue'

// Promotional card: a call to action. Fully round tertiary pill, the icon in a light circle, bold title, one or two
// short lines, a caret. Use it only for real calls to action (download, support).
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  icon: { type: String, default: 'open_in_new' },
  href: { type: String, default: '' },
  tone: { type: String, default: 'tertiary' }, // tertiary | primary | secondary
})
const emit = defineEmits(['click'])
</script>

<template>
  <component :is="href ? 'a' : 'button'" class="m-promo" :class="`m-promo--${tone}`" :href="href || undefined" :type="href ? undefined : 'button'" @click="emit('click', $event)">
    <span class="m-promo__icon"><slot name="icon"><MIcon :name="icon" /></slot></span>
    <span class="m-promo__body"><b>{{ title }}</b><span v-if="text">{{ text }}</span></span>
    <MIcon class="m-promo__caret" name="chevron_right" />
  </component>
</template>
