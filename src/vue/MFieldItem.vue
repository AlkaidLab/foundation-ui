<script setup>
import { computed } from 'vue'
import MInfo from './MInfo.vue'
import MIcon from './MIcon.vue'

// A field of a form (the account of the first run, a password change, an editor): the plain outlined field on the surface it sits on,
// no row around it. The info icon sits inside the field at its end; the icon prop sits inside it at its start. A group that holds only fields is a form (the fields keep a gap).
// A field in a group with rows (MItem, MSwitchItem, MChoiceItem) is a row of that group: the same card, corners and 2 px seam (notify.css), so the group stays one piece.
// A setting that is only shown as a value, and edited in a dialog, is MValueItem instead.
const model = defineModel({ type: [String, Number], default: '' })
const props = defineProps({
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  supporting: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  suffix: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: '' },
  name: { type: String, default: '' },
  min: { type: [Number, String], default: undefined },
  max: { type: [Number, String], default: undefined },
  step: { type: [Number, String], default: undefined },
  /** help text behind an info icon inside the field */
  info: { type: String, default: '' },
  /** a plain outline icon inside the field, at its start (the key of a secret) */
  icon: { type: String, default: '' },
})
const hint = computed(() => props.error || props.supporting)
</script>

<template>
  <div class="m-fieldrow">
    <md-outlined-text-field
      class="m-field"
      :label="label"
      :type="type"
      :value="model"
      :name="name || undefined"
      :required="required || undefined"
      :autocomplete="autocomplete || undefined"
      :supporting-text="hint"
      :error="!!error || undefined"
      :error-text="error"
      :disabled="disabled || undefined"
      :suffix-text="suffix"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :step="step"
      @input="model = type === 'number' && $event.target.value !== '' ? Number($event.target.value) : $event.target.value"
    >
      <span slot="container" class="m-field__fill" aria-hidden="true" />
      <MIcon v-if="icon" slot="leading-icon" :name="icon" />
      <MInfo v-if="info" slot="trailing-icon" class="m-fieldrow__info" :text="info" />
    </md-outlined-text-field>
  </div>
</template>
