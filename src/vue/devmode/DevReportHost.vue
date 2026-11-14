<script setup>
import DevReport from './DevReport.vue'
import DevSignIn from './DevSignIn.vue'

// Mounted once at the root of a product, next to MErrorHost: draws the report sheet and the sign-in sheet (devReport.js decides when they open).
defineProps({ locale: { type: String, default: 'zh' } })
</script>

<template>
  <DevReport :locale="locale" />
  <DevSignIn :locale="locale" />
</template>
