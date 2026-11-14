<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import MIcon from './MIcon.vue'
import { PIN_ROWS, pinAppend, pinBackspace, pinComplete, pinDots, pinKeyAction } from './pinpad.js'

// PIN entry: a row of dots (entered ones filled, the next one a morphing cookie shape, the rest outlined) above a
// circular keypad. Digits on the keyboard work too while the pad is on screen and no text field has the focus.
// v-model is the string of digits; `complete` fires once the last digit is in.
const model = defineModel({ type: String, default: '' })
const props = defineProps({
  length: { type: Number, default: 4 },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: 'PIN' },
  backspaceLabel: { type: String, default: 'Delete' },
})
const emit = defineEmits(['complete'])

function digit(d) {
  if (props.disabled) return
  const next = pinAppend(model.value, d, props.length)
  if (next === model.value) return
  model.value = next
  if (pinComplete(next, props.length)) emit('complete', next)
}
function back() {
  if (!props.disabled) model.value = pinBackspace(model.value)
}
const typing = (t) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.tagName.startsWith('MD-'))
function onKey(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return
  const action = pinKeyAction(event.key)
  if (!action) return
  if (action.type === 'digit') digit(action.digit)
  else back()
  event.preventDefault()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="m-pin" :class="{ 'is-disabled': disabled }">
    <div class="m-pin__dots" role="img" :aria-label="`${label}: ${model.length} / ${length}`">
      <i v-for="(state, i) in pinDots(model, length)" :key="i" class="m-pin__dot" :class="`m-pin__dot--${state}`" />
    </div>
    <div class="m-pin__pad" role="group" :aria-label="label">
      <template v-for="(row, r) in PIN_ROWS" :key="r">
        <template v-for="(key, c) in row" :key="`${r}${c}`">
          <button v-if="key === 'backspace'" type="button" class="m-pin__key m-pin__key--plain" :aria-label="backspaceLabel" :data-tip="backspaceLabel" :disabled="disabled || !model.length" @click="back"><MIcon name="backspace" /></button>
          <button v-else-if="key" type="button" class="m-pin__key" :disabled="disabled" @click="digit(key)">{{ key }}</button>
          <span v-else />
        </template>
      </template>
    </div>
  </div>
</template>
