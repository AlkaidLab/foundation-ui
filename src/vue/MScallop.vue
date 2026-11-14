<script setup>
// A scalloped (wavy-edged) shape that turns slowly while something waits, faster while it works. It carries an icon or a few characters.
defineProps({
  size: { type: Number, default: 72 },
  busy: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
</script>

<template>
  <span class="m-scallop" :class="{ 'is-busy': busy }" role="status" :aria-label="label || undefined" :style="{ '--sc': `${size}px` }">
    <span class="m-scallop__shape" aria-hidden="true" />
    <span class="m-scallop__inner"><slot /></span>
  </span>
</template>
