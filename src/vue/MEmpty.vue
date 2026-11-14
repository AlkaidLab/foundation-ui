<script setup>
import MIcon from './MIcon.vue'

defineProps({
  icon: { type: String, default: 'info' },
  title: { type: String, required: true },
  text: { type: String, default: '' },
})
</script>

<template>
  <div class="m-empty">
    <div class="m-empty__icon"><MIcon :name="icon" fill /></div>
    <div class="m-empty__title">{{ title }}</div>
    <div v-if="text">{{ text }}</div>
    <slot />
  </div>
</template>
