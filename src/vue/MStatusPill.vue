<script setup>
import MIcon from './MIcon.vue'

// Status capsule ("1 app is active") with the round action buttons beside it (slot `actions`).
defineProps({
  icon: { type: String, default: 'info' },
  label: { type: String, required: true },
  tone: { type: String, default: '' }, // '' | ok | warn | error
  chevron: { type: Boolean, default: true },
  action: { type: Boolean, default: true },
})
const emit = defineEmits(['click'])
</script>

<template>
  <div class="m-statuspill-row">
    <component :is="action ? 'button' : 'div'" class="m-statuspill" :class="tone && `m-statuspill--${tone}`" :type="action ? 'button' : undefined" @click="emit('click', $event)">
      <span class="m-statuspill__dot"><MIcon :name="icon" fill /></span>
      <span class="m-statuspill__label">{{ label }}</span>
      <MIcon v-if="chevron && action" name="chevron_right" />
    </component>
    <slot name="actions" />
  </div>
</template>
