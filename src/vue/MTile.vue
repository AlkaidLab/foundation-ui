<script setup>
import MIcon from './MIcon.vue'

// A tile of the home page: a tonal icon and a title on top, the data below (numerals, gauge, sparkline, progress).
// Sizes follow the grid: 1x1, 2x1, 2x2.
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  tone: { type: String, default: '' }, // '' | primary | secondary | tertiary | success | warn | error
  size: { type: String, default: '1x1' },
  /** whole tile is a button */
  action: { type: Boolean, default: false },
  /** small status mark next to the title */
  badge: { type: String, default: '' }, // ok | warn | error | info
})
const emit = defineEmits(['click'])
</script>

<template>
  <component :is="action ? 'button' : 'div'" class="m-tile" :class="[`m-tile--${size}`, tone && `m-tile--${tone}`, { 'm-tile--action': action }]" :type="action ? 'button' : undefined" @click="emit('click', $event)">
    <header class="m-tile__head">
      <span v-if="icon" class="m-tile__icon"><MIcon :name="icon" /></span>
      <span class="m-tile__title">{{ title }}</span>
      <i v-if="badge" class="m-tile__badge" :class="`m-tile__badge--${badge}`" />
      <slot name="head" />
    </header>
    <div class="m-tile__body"><slot /></div>
    <footer v-if="$slots.foot" class="m-tile__foot"><slot name="foot" /></footer>
  </component>
</template>
