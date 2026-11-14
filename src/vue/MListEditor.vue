<script setup>
import { ref } from 'vue'
import MIcon from './MIcon.vue'
import MIconButton from './MIconButton.vue'

// A short list of values as editable rows: every row is a field with a remove button, the last row adds. `validate`
// returns an error text (or '') for a typed value; a row that fails stays, marked, and the list is not changed by it.
const model = defineModel({ type: Array, default: () => [] })
const props = defineProps({
  label: { type: String, default: '' },
  addLabel: { type: String, default: 'Add' },
  removeLabel: { type: String, default: 'Remove' },
  placeholder: { type: String, default: '' },
  suffix: { type: String, default: '' },
  max: { type: Number, default: 0 },
  validate: { type: Function, default: () => '' },
  emptyText: { type: String, default: '' },
  icon: { type: String, default: '' },
})
const draft = ref('')
const error = ref('')
function add() {
  const value = draft.value.trim()
  if (!value) return
  const problem = props.validate(value, model.value)
  if (problem) { error.value = problem; return }
  error.value = ''
  model.value = [...model.value, value]
  draft.value = ''
}
const remove = (index) => { model.value = model.value.filter((_, i) => i !== index) }
const edit = (index, event) => {
  const value = event.target.value.trim()
  const problem = value ? props.validate(value, model.value.filter((_, i) => i !== index)) : ''
  if (!value || problem) { event.target.value = model.value[index]; error.value = problem; return }
  error.value = ''
  model.value = model.value.map((v, i) => (i === index ? value : v))
}
</script>

<template>
  <div class="m-list" role="group" :aria-label="label">
    <p v-if="!model.length && emptyText" class="m-list__empty">{{ emptyText }}</p>
    <div v-for="(value, index) in model" :key="`${index}:${value}`" class="m-list__row">
      <MIcon v-if="icon" :name="icon" />
      <input class="m-list__input m-input" :value="value" :aria-label="`${label} ${index + 1}`" @change="edit(index, $event)" />
      <span v-if="suffix" class="m-list__suffix">{{ suffix }}</span>
      <MIconButton icon="close" :label="removeLabel" @click="remove(index)" />
    </div>
    <form v-if="!max || model.length < max" class="m-list__row m-list__row--add" @submit.prevent="add">
      <MIcon name="add" />
      <input v-model="draft" class="m-list__input m-input" :placeholder="placeholder || addLabel" :aria-label="addLabel" :aria-invalid="!!error || undefined" />
      <MIconButton icon="check" tonal :label="addLabel" :disabled="!draft.trim()" @click="add" />
    </form>
    <p v-if="error" class="m-list__error" role="alert">{{ error }}</p>
  </div>
</template>
