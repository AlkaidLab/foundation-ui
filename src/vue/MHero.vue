<script setup>
import MIcon from './MIcon.vue'

defineProps({
  tone: { type: String, default: 'primary' }, // primary | tertiary | success | neutral
  icon: { type: String, default: 'info' },
  title: { type: String, required: true },
  text: { type: String, default: '' },
})
</script>

<template>
  <section class="m-hero" :class="tone !== 'primary' && `m-hero--${tone}`">
    <div class="m-hero__shape"><MIcon :name="icon" fill /></div>
    <div class="m-hero__body">
      <h2 class="m-hero__title">{{ title }}</h2>
      <p v-if="text" class="m-hero__text">{{ text }}</p>
      <div v-if="$slots.chips" class="m-hero__chips"><slot name="chips" /></div>
    </div>
    <div v-if="$slots.default" class="m-hero__action"><slot /></div>
  </section>
</template>
