<script setup>
// A DualSense lightbar as the settings set it: a glowing bar in the chosen colour, dark when off, a slow colour sweep when the game decides.
defineProps({
  color: { type: String, default: '' },
  mode: { type: String, default: 'fixed' }, // fixed | off | game
  label: { type: String, default: '' },
})
</script>

<template>
  <div class="m-lightbar" :class="`m-lightbar--${mode}`" role="img" :aria-label="label" :style="mode === 'fixed' && color ? { '--lb': color } : undefined">
    <span class="m-lightbar__bar" />
    <span v-if="label" class="m-lightbar__label">{{ label }}</span>
  </div>
</template>
