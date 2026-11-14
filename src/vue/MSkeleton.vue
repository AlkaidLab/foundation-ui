<script setup>
import MPageLoading from './MPageLoading.vue'

// Kept for the pages that name it: the same skeleton as every loading page, one group of `rows` rows.
defineProps({ rows: { type: Number, default: 3 } })
</script>

<template>
  <MPageLoading :rows="rows" :groups="1" :delay="120" />
</template>
