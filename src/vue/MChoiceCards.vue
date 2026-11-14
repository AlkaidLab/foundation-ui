<script setup>
import MIcon from './MIcon.vue'

// Tier 1 choice with a preview: one large card per option, the card draws what the option does (slot `art`, or an icon).
// The chosen card is filled and its icon turns round; a card gives in under the finger. A radio group for the keyboard.
const model = defineModel({ type: [String, Number, Boolean], default: '' })
const props = defineProps({
  /** [{ value, label, text?, icon?, disabled? }] */
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  columns: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
})
function onKey(event, index) {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  if (!(event.key in keys)) return
  event.preventDefault()
  const enabled = props.options.filter((o) => !o.disabled)
  const at = enabled.findIndex((o) => o.value === props.options[index].value)
  const next = enabled[(at + keys[event.key] + enabled.length) % enabled.length]
  model.value = next.value
  event.currentTarget.parentElement.querySelectorAll('button')[props.options.indexOf(next)]?.focus()
}
</script>

<template>
  <div class="m-cards" role="radiogroup" :aria-label="label" :style="columns ? { '--m-cards-cols': columns } : null">
    <button
      v-for="(option, index) in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      class="m-cards__card"
      :class="{ 'is-on': option.value === model }"
      :aria-checked="option.value === model"
      :tabindex="option.value === model || (model === '' && index === 0) ? 0 : -1"
      :disabled="disabled || option.disabled"
      @click="model = option.value"
      @keydown="onKey($event, index)"
    >
      <span class="m-cards__art"><slot name="art" :option="option" :selected="option.value === model"><MIcon :name="option.icon || 'tune'" fill /></slot></span>
      <span class="m-cards__label">{{ option.label }}</span>
      <small v-if="option.text" class="m-cards__text">{{ option.text }}</small>
      <MIcon v-if="option.value === model" class="m-cards__mark" name="check_circle" fill />
    </button>
  </div>
</template>
