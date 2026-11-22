<script setup>
import MIcon from './MIcon.vue'

// The page after the last tile of a stack that offers one: a tile that belongs with the others, one press to add it (MDashStack.vue; drawn alone and as the neighbour of a swipe).
defineProps({
  suggestion: { type: Object, required: true },
  texts: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['act'])
</script>

<template>
  <div class="m-dstack__sug">
    <span class="m-dstack__sugtag">{{ texts.stackSuggestTag || '建议' }}</span>
    <span class="m-dstack__sugicon" aria-hidden="true"><MIcon :name="suggestion.icon || 'add'" /></span>
    <b class="m-dstack__sugtitle">{{ suggestion.title }}</b>
    <span class="m-dstack__sugbtns">
      <button type="button" class="m-dpill m-dpill--fill" data-stack-suggest="add" @click.stop="emit('act', 'add')"><MIcon name="add" />{{ texts.stackSuggestAdd || '加入' }}</button>
      <button type="button" class="m-dstack__sugx" data-stack-suggest="hide" :aria-label="texts.stackSuggestHide || '不再建议'" :title="texts.stackSuggestHide || '不再建议'" @click.stop="emit('act', 'hide')"><MIcon name="close" /></button>
    </span>
  </div>
</template>
