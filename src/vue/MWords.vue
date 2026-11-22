<script setup>
import { computed } from 'vue'
import { wordsOf } from './tileWords.js'

// A text of a tile whose words are kept whole when it wraps (tileWords.js). A plain text node when there is nothing to keep.
const props = defineProps({ text: { type: String, default: '' } })
const words = computed(() => wordsOf(props.text))
</script>

<template><template v-if="words"><span v-for="(w, i) in words" :key="i" class="m-tile__word">{{ w }}</span></template><template v-else>{{ text }}</template></template>
