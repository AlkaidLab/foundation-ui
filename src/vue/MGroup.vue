<script setup>
defineProps({
  /** Separate cards instead of one connected list. */
  spaced: { type: Boolean, default: false },
})
</script>

<template>
  <div class="m-group" :class="{ 'm-group--spaced': spaced }" role="list">
    <slot />
  </div>
</template>
