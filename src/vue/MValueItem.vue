<script setup>
import { computed, ref, useAttrs } from 'vue'
import { redactKindOf } from '../devmode/shot.js'
import MItem from './MItem.vue'
import MIcon from './MIcon.vue'
import MValueDialog from './MValueDialog.vue'

defineOptions({ inheritAttrs: false })

// Android's EditTextPreference as a list row: the title, the current value as the supporting line, a pencil at the end.
// Tapping the row opens MValueDialog with the one field; the help (the ⓘ of a boxed field) is the line in that dialog.
const model = defineModel({ type: [String, Number], default: '' })
const props = defineProps({
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  suffix: { type: String, default: '' },
  /** shown as the value while the setting is empty (the default, or 'automatic') */
  placeholder: { type: [String, Number], default: '' },
  help: { type: String, default: '' },
  /** a problem to show on the row regardless of the value (from the page) */
  error: { type: String, default: '' },
  check: { type: Function, default: null },
  min: { type: [Number, String], default: undefined },
  max: { type: [Number, String], default: undefined },
  step: { type: [Number, String], default: undefined },
  disabled: { type: Boolean, default: false },
  okLabel: { type: String, default: 'OK' },
  cancelLabel: { type: String, default: 'Cancel' },
  emptyText: { type: String, default: '' },
  /** shown instead of 0 (a number where 0 means automatic) */
  zeroText: { type: String, default: '' },
  browse: { type: Function, default: null },
  browseLabel: { type: String, default: 'Browse' },
  browseIcon: { type: String, default: 'folder_open' },
  icon: { type: String, default: '' },
})
const attrs = useAttrs()
// the row and the dialog's field are marked for the screenshot redaction when the setting's key says it holds a name, an address, a path or a serial (an explicit data-redact wins)
const redact = computed(() => String(attrs['data-redact'] || redactKindOf(attrs['data-cfg']) || '') || undefined)
const open = ref(false)
const empty = computed(() => model.value === undefined || model.value === null || model.value === '')
const problem = computed(() => props.error || (!empty.value && props.check ? props.check(model.value) : '') || '')
const valueText = computed(() => {
  if (empty.value) return String(props.placeholder || props.emptyText || '')
  if (props.zeroText && Number(model.value) === 0) return props.zeroText
  const text = props.type === 'password' ? '••••••••' : String(model.value)
  return props.suffix ? `${text} ${props.suffix}` : text
})
const shown = computed(() => (problem.value ? `${valueText.value} · ${problem.value}` : valueText.value))
</script>

<template>
  <MItem v-bind="$attrs" :data-redact="redact" action :icon="icon" :title="label" :value="shown" :disabled="disabled" :class="{ 'm-item--invalid': !!problem, 'm-item--empty': empty && !problem }" @click="open = true">
    <template #trail><MIcon class="m-item__edit" name="edit" /></template>
  </MItem>
  <MValueDialog :redact="redact" v-model="model" v-model:open="open" :title="label" :type="type" :suffix="suffix" :placeholder="String(placeholder)" :help="help" :check="check" :min="min" :max="max" :step="step" :ok-label="okLabel" :cancel-label="cancelLabel" :browse="browse" :browse-label="browseLabel" :browse-icon="browseIcon" />
</template>
