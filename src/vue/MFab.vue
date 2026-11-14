<script setup>
import MIcon from './MIcon.vue'

defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  extended: { type: Boolean, default: false },
  /** in the flow (a toolbar's FAB), not fixed to the corner of the window */
  inline: { type: Boolean, default: false },
})
</script>

<template>
  <button type="button" class="m-fab" :class="{ 'm-fab--extended': extended, 'm-fab--inline': inline }" :aria-label="label" :title="label">
    <MIcon :name="icon" /><span v-if="extended">{{ label }}</span>
  </button>
</template>
