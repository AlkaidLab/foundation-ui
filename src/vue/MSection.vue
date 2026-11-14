<script setup>
import MInfo from './MInfo.vue'

// A section label (small, primary colour, no background). A description is help text: with a title it sits behind an
// info icon next to the label; without one it stays a plain line.
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>

<template>
  <section class="m-section">
    <div v-if="title || $slots.action" class="m-section__head">
      <h2 class="m-section__title">{{ title }}<MInfo v-if="title && description" class="m-section__info" :text="description" /></h2>
      <slot name="action" />
    </div>
    <p v-if="description && !title" class="m-section__desc">{{ description }}</p>
    <slot />
  </section>
</template>
