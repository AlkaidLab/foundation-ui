<script setup>
import MIcon from './MIcon.vue'
import MSwitch from './MSwitch.vue'

// Control strip: one segmented group with a label, then one switch card each. All real controls, applied as they change.
defineProps({
  label: { type: String, default: '' },
  icon: { type: String, default: 'gamepad' },
  options: { type: Array, default: () => [] }, // [{ value, label, icon }]
  value: { type: [String, Number], default: '' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['update:value'])
</script>

<template>
  <div class="m-dstrip m-dcard">
    <MIcon class="m-dstrip__icon" :name="icon" />
    <span class="m-dstrip__label">{{ label }}</span>
    <div class="m-dseg" role="radiogroup" :aria-label="label">
      <button v-for="o in options" :key="o.value" type="button" role="radio" class="m-dseg__btn" :aria-checked="o.value === value" :disabled="busy" @click="emit('update:value', o.value)"><MIcon v-if="o.icon" :name="o.icon" />{{ o.label }}</button>
    </div>
  </div>
</template>
