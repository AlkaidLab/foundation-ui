<script setup>
import MIcon from '../MIcon.vue'

// A filter chip: a tonal fill and a check when chosen. No outline ring.
defineProps({
  label: { type: String, required: true },
  pressed: { type: Boolean, default: false },
  count: { type: [Number, String], default: '' },
  icon: { type: String, default: '' },
})
defineEmits(['click'])
</script>

<template>
  <button type="button" class="dm-fchip" :aria-pressed="pressed" @click="$emit('click')">
    <MIcon v-if="pressed" name="check" />
    <MIcon v-else-if="icon" :name="icon" />
    {{ label }}<b v-if="count !== ''">{{ count }}</b>
  </button>
</template>
