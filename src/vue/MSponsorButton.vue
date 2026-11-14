<script setup>
import { ref } from 'vue'
import MIconButton from './MIconButton.vue'
import MSupportSheet from './MSupportSheet.vue'

// A small heart in the rail foot, always there, never a popup: it opens the sponsor sheet only when pressed.
defineProps({
  label: { type: String, default: 'Support the developers' },
  title: { type: String, default: 'Support the developers' },
  sections: { type: Array, default: () => [] },
  closeLabel: { type: String, default: 'Close' },
})
const emit = defineEmits(['open'])
const open = ref(false)
</script>

<template>
  <span class="m-sponsor-btn"><MIconButton icon="favorite" :label="label" @click="open = true" /><MSupportSheet v-model="open" :title="title" :sections="sections" :close-label="closeLabel" @open="(it) => emit('open', it)" /></span>
</template>
