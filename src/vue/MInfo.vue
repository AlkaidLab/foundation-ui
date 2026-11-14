<script setup>
import { useId } from 'vue'
import MIcon from './MIcon.vue'

// Help lives behind an info icon: hover, focus or tap shows it, nothing sits inline.
defineProps({ text: { type: String, required: true } })
const id = useId()
</script>

<template>
  <span class="m-info">
    <button type="button" class="m-info__btn" :aria-label="text" :aria-describedby="id" :data-tip="text"><MIcon name="info" /></button>
    <span :id="id" role="tooltip" class="m-info__tip">{{ text }}</span>
  </span>
</template>
