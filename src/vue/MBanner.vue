<script setup>
import MIcon from './MIcon.vue'

// Banner: a real problem that needs a decision. Put the actions in the `actions` slot (text buttons).
defineProps({
  icon: { type: String, default: 'warning' },
  tone: { type: String, default: 'warn' }, // warn | error | info | tertiary
})
</script>

<template>
  <div class="m-banner" :class="`m-banner--${tone}`" role="alert">
    <MIcon class="m-banner__icon" :name="icon" fill />
    <div class="m-banner__text"><slot /></div>
    <div v-if="$slots.actions" class="m-banner__actions"><slot name="actions" /></div>
  </div>
</template>
