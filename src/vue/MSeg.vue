<script setup>
import { ref, watch } from 'vue'
import MIcon from './MIcon.vue'

// Connected button group (one choice) or toggle button group (`multiple`). Inner corners 8, outer corners full,
// a selected button is fully round and a pressed one grows, as in Material 3 Expressive.
const model = defineModel({ type: [String, Number, Boolean, Array], default: '' })
const props = defineProps({
  /** [{ value, label, icon?, disabled? }] */
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** show only the icon of options that have one (the label stays as accessible name and tooltip) */
  iconOnly: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
  size: { type: String, default: 'md' }, // sm | md | lg
  /** the chosen option is shown and its answer is still on its way: the chosen button breathes (the busy fade) and a press waits */
  pending: { type: Boolean, default: false },
})
const root = ref(null)
// the button that was just chosen settles with a small spring (Material 3 Expressive); the flag is gone after the animation
const popped = ref(null)
let popTimer = 0
watch(model, (value, before) => {
  if (props.multiple) { const added = (value || []).find((v) => !(before || []).includes(v)); popped.value = added ?? null } else popped.value = value
  clearTimeout(popTimer)
  popTimer = setTimeout(() => { popped.value = null }, 520)
})
const checked = (value) => (props.multiple ? model.value.includes(value) : model.value === value)
function pick(value) {
  if (props.pending) return
  if (props.multiple) model.value = model.value.includes(value) ? model.value.filter((v) => v !== value) : [...model.value, value]
  else model.value = value
}
function move(delta, current) {
  const enabled = props.options.map((o, i) => ({ o, i })).filter(({ o }) => !o.disabled)
  const at = enabled.findIndex(({ o }) => o.value === current)
  const next = enabled[(at + delta + enabled.length) % enabled.length]
  if (!props.multiple) model.value = next.o.value
  root.value?.querySelectorAll('button')[next.i]?.focus()
}
</script>

<template>
  <div ref="root" class="m-seg" :class="[{ 'm-seg--block': block, 'is-pending': pending }, size !== 'md' && `m-seg--${size}`]" :role="multiple ? 'group' : 'radiogroup'" :aria-label="label || undefined" :aria-busy="pending || undefined">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="m-seg__btn"
      :role="multiple ? undefined : 'radio'"
      :aria-checked="multiple ? undefined : checked(option.value)"
      :aria-pressed="multiple ? checked(option.value) : undefined"
      :tabindex="multiple || checked(option.value) || !options.some((o) => checked(o.value)) ? 0 : -1"
      :disabled="disabled || option.disabled"
      :aria-label="option.label"
      :title="option.label"
      :data-tip="iconOnly && option.icon ? option.label : undefined"
      :data-pop="popped !== null && popped === option.value ? '' : undefined"
      @click="pick(option.value)"
      @keydown.right.prevent="move(1, option.value)"
      @keydown.down.prevent="move(1, option.value)"
      @keydown.left.prevent="move(-1, option.value)"
      @keydown.up.prevent="move(-1, option.value)"
    >
      <MIcon v-if="option.icon" :name="option.icon" />
      <span v-if="!iconOnly || !option.icon" class="m-seg__label">{{ option.label }}</span>
    </button>
  </div>
</template>
