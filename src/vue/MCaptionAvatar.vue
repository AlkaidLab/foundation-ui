<script setup>
import { computed } from 'vue'
import { avatarState, pixelSize } from './captionAvatar.js'

// A character's pixel avatar as a button of the caption bar: one click opens what it stands for (the assistant). It is a picture of a character, so it keeps its own colours
// (never recoloured to the theme) and is drawn at a whole number of device pixels per source pixel. A quiet state sits at its corner: nothing when idle, a pulsing dot while the
// character is thinking, a solid dot while an answer waits.
const props = defineProps({
  /** the sprite, a grid x grid image */
  src: { type: String, required: true },
  grid: { type: Number, default: 16 },
  label: { type: String, required: true },
  thinking: { type: Boolean, default: false },
  unread: { type: Boolean, default: false },
  /** what the state says, spoken and as the tooltip (e.g. `thinking`, `answer`); idle uses the label alone */
  stateLabels: { type: Object, default: () => ({}) },
})
defineEmits(['click'])
const state = computed(() => avatarState(props))
const size = computed(() => pixelSize(props.grid, 34, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1))
const tip = computed(() => (state.value === 'idle' ? props.label : `${props.label} · ${props.stateLabels[state.value] || ''}`.replace(/ · $/, '')))
</script>

<template>
  <button type="button" class="m-caption-avatar" :class="`is-${state}`" :aria-label="tip" :data-tip="tip" :aria-busy="state === 'thinking' || undefined" @click="$emit('click')">
    <img class="m-caption-avatar__img" :src="src" alt="" draggable="false" :style="{ width: `${size.css}px`, height: `${size.css}px` }" />
    <i v-if="state !== 'idle'" class="m-caption-avatar__state" aria-hidden="true" />
  </button>
</template>
