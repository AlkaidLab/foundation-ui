<script setup>
import MIcon from './MIcon.vue'

// Presets as chips. One choice (v-model is the value) or several (`multiple`, v-model is an array). A chosen chip
// shows a check. Chips wrap; the set is a group for the keyboard and for assistive technology.
const model = defineModel({ type: [String, Number, Array], default: '' })
const props = defineProps({
  /** [{ value, label, icon? }] */
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  multiple: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const on = (value) => (props.multiple ? model.value.some((v) => String(v) === String(value)) : String(model.value) === String(value))
function pick(value) {
  if (!props.multiple) { model.value = value; return }
  model.value = on(value) ? model.value.filter((v) => String(v) !== String(value)) : [...model.value, value]
}
</script>

<template>
  <div class="m-chipset" role="group" :aria-label="label">
    <button v-for="option in options" :key="String(option.value)" type="button" class="m-chipset__chip" :class="{ 'is-on': on(option.value) }" :aria-pressed="on(option.value)" :disabled="disabled" @click="pick(option.value)">
      <MIcon v-if="on(option.value)" name="check" />
      <MIcon v-else-if="option.icon" :name="option.icon" />
      {{ option.label }}
    </button>
  </div>
</template>
