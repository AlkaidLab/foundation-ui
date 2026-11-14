<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import MDialog from './MDialog.vue'
import MButton from './MButton.vue'
import MIconButton from './MIconButton.vue'

// The dialog of a text or number setting (Android's EditTextPreference): the help above, one outlined field with its
// validation, 取消 / 确定. Nothing reaches the model until 确定; Enter confirms, and a value the host would refuse keeps 确定 off.
const open = defineModel('open', { type: Boolean, default: false })
const model = defineModel({ type: [String, Number], default: '' })
const props = defineProps({
  /** the data-redact mark of the field's row (the setting holds a name, an address, a path or a serial) */
  redact: { type: String, default: undefined },
  title: { type: String, required: true },
  type: { type: String, default: 'text' },
  suffix: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  /** what the setting does: the line above the field */
  help: { type: String, default: '' },
  /** (value) => message | '' ; the host's rule for this setting */
  check: { type: Function, default: null },
  min: { type: [Number, String], default: undefined },
  max: { type: [Number, String], default: undefined },
  step: { type: [Number, String], default: undefined },
  okLabel: { type: String, default: 'OK' },
  cancelLabel: { type: String, default: 'Cancel' },
  /** a function that returns a chosen path or '' ; shows a browse button next to the field */
  browse: { type: Function, default: null },
  browseLabel: { type: String, default: 'Browse' },
  browseIcon: { type: String, default: 'folder_open' },
})
const draft = ref('')
const field = ref(null)
const commitValue = (text) => {
  if (props.type === 'number') return text === '' ? '' : (Number.isFinite(Number(text)) ? Number(text) : text)
  return props.type === 'password' ? text : text.trim()
}
const problem = computed(() => (props.check ? props.check(commitValue(draft.value)) || '' : ''))
watch(open, async (value) => {
  if (!value) return
  draft.value = model.value === undefined || model.value === null ? '' : String(model.value)
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(() => resolve()))
  field.value?.focus?.()
  field.value?.select?.()
}, { immediate: true })
function apply() {
  if (problem.value) return
  model.value = commitValue(draft.value)
  open.value = false
}
async function pick() {
  const chosen = await props.browse()
  if (chosen) draft.value = chosen
}
</script>

<template>
  <Teleport to="body">
    <MDialog v-model="open" :title="title">
      <p v-if="help" class="m-vdialog__help">{{ help }}</p>
      <div class="m-vdialog__row" :data-redact="redact">
        <md-outlined-text-field
          ref="field"
          class="m-field m-vdialog__field"
          :label="title"
          :type="type"
          :value="draft"
          :suffix-text="suffix"
          :placeholder="placeholder"
          :min="min"
          :max="max"
          :step="step"
          :error="!!problem || undefined"
          :error-text="problem"
          @input="draft = $event.target.value"
          @keydown.enter.prevent="apply"
        >
          <span slot="container" class="m-field__fill" aria-hidden="true" />
        </md-outlined-text-field>
        <MIconButton v-if="browse" :icon="browseIcon" tonal :label="browseLabel" @click="pick" />
      </div>
      <template #actions>
        <MButton variant="text" @click="open = false">{{ cancelLabel }}</MButton>
        <MButton variant="text" :disabled="!!problem" @click="apply">{{ okLabel }}</MButton>
      </template>
    </MDialog>
  </Teleport>
</template>
