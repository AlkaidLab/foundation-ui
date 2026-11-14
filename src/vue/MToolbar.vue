<script setup>
// Floating toolbar: a pill of related actions that floats above the content; the optional FAB sits at its end.
// tone: '' (standard, SurfaceContainer) | vibrant (PrimaryContainer; `primary` is the older name)
defineProps({ label: { type: String, default: '' }, tone: { type: String, default: '' } })
</script>

<template>
  <div class="m-toolbar" :class="tone && `m-toolbar--${tone}`" role="toolbar" :aria-label="label || undefined">
    <div class="m-toolbar__bar"><slot /></div>
    <div v-if="$slots.fab" class="m-toolbar__fab"><slot name="fab" /></div>
  </div>
</template>
