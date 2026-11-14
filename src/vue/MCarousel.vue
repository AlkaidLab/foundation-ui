<script setup>
// Carousel: a row of cards that snaps while scrolling, the first one wider (multi-browse).
defineProps({ label: { type: String, default: '' } })
</script>

<template>
  <div class="m-carousel" role="region" :aria-label="label || undefined" tabindex="0"><slot /></div>
</template>
