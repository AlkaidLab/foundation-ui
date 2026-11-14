<script setup>
import { computed } from 'vue'
import { breakText } from './breakText.js'

// An address or URL as one run of text that breaks only at its joints (see breakText.js); the copy of the selection is the plain text. The element that holds it keeps its own font.
const props = defineProps({ text: { type: String, default: '' } })
const parts = computed(() => breakText(props.text))
</script>

<template><span class="m-breaktext"><template v-for="(part, i) in parts" :key="i">{{ part }}<wbr v-if="i < parts.length - 1" /></template></span></template>
