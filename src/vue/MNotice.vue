<script setup>
import MIcon from './MIcon.vue'

defineProps({
  tone: { type: String, default: 'info' }, // info | warn | error
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
})
const defaults = { info: 'info', warn: 'warning', error: 'error' }
</script>

<template>
  <div class="m-notice" :class="tone !== 'info' && `m-notice--${tone}`" :role="tone === 'error' ? 'alert' : 'status'">
    <MIcon :name="icon || defaults[tone]" fill />
    <div class="m-notice__body">
      <span v-if="title" class="m-notice__title">{{ title }}</span>
      <span><slot /></span>
    </div>
    <slot name="action" />
  </div>
</template>
