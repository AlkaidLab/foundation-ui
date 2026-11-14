<script setup>
import MIcon from './MIcon.vue'

// Floating action buttons above the first section, as on Android's app info page.
// actions: [{ id, label, icon, tone?: 'danger', disabled? }]
defineProps({ actions: { type: Array, required: true } })
const emit = defineEmits(['action'])
</script>

<template>
  <div class="m-actions" role="group">
    <button v-for="a in actions" :key="a.id" type="button" class="m-actions__btn" :class="a.tone && `m-actions__btn--${a.tone}`" :disabled="a.disabled" @click="emit('action', a)">
      <MIcon :name="a.icon" /><span>{{ a.label }}</span>
    </button>
  </div>
</template>
