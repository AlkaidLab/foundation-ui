<script setup>
import MIcon from './MIcon.vue'
import MLoading from './MLoading.vue'

// Expressive switch: track 52 x 32, handle 24 with a 16 px check or cross, 28 while pressed.
// `pending`: the new position is already shown and the answer is still on its way; the handle carries the loading indicator, and a press waits for the answer (it is not `disabled`, so nothing greys out).
const model = defineModel({ type: Boolean, default: false })
const props = defineProps({
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  pending: { type: Boolean, default: false },
})
const toggle = () => { if (!props.pending) model.value = !model.value }
</script>

<template>
  <button type="button" role="switch" class="m-switch" :class="{ 'is-pending': pending }" :aria-checked="model" :aria-label="label || undefined" :aria-busy="pending || undefined" :disabled="disabled" @click="toggle">
    <span class="m-switch__handle">
      <MIcon class="m-switch__icon m-switch__icon--on" name="check" />
      <MIcon class="m-switch__icon m-switch__icon--off" name="close" />
      <MLoading v-if="pending" class="m-switch__busy" size="16px" />
    </span>
  </button>
</template>
