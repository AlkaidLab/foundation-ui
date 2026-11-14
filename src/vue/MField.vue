<script setup>
const model = defineModel({ type: [String, Number], default: '' })
defineProps({
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  supporting: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  suffix: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  /** lines of a multi-line field (type="textarea") */
  rows: { type: Number, default: 0 },
})
</script>

<template>
  <md-outlined-text-field
    class="m-field"
    :label="label"
    :type="type"
    :value="model"
    :supporting-text="error || supporting"
    :error="!!error"
    :error-text="error"
    :disabled="disabled"
    :suffix-text="suffix"
    :placeholder="placeholder"
    :rows="rows || undefined"
    @input="model = $event.target.value"
  >
    <span slot="container" class="m-field__fill" aria-hidden="true" />
  </md-outlined-text-field>
</template>

