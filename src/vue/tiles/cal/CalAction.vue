<script setup>
// Calibration round: an action (添加应用). The whole tile is the button: a Google Home favourites tile / an Android 16 QS tile:
// the tonal container, the glyph at the top left, the action's name at the bottom left. Nothing else.
import { computed } from 'vue'
import MIcon from '../../MIcon.vue'
import MWords from '../../MWords.vue'
import MTileShape from '../../MTileShape.vue'

const props = defineProps({ card: { type: Object, required: true } })
const emit = defineEmits(['act'])
const d = computed(() => props.card.data || {})
</script>

<template>
  <button type="button" class="m-tile m-cal m-cala m-b3ac" :class="{ 'is-quiet': card.quiet }" data-size="s" data-accent="secondary" @click="emit('act', { type: d.act, value: d.value })">
    <header class="m-calm__head"><MIcon :name="d.icon" :fill="d.icon === 'stop'" /><span class="m-calm__title"><MWords :text="d.title" /></span></header>
    <MTileShape class="m-b3ac__hero" :icon="d.icon" shape="cookie" size="56px" tone="tonal" />
  </button>
</template>
