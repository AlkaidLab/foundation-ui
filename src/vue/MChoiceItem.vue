<script setup>
import { computed, ref, useId } from 'vue'
import MItem from './MItem.vue'
import MDialog from './MDialog.vue'
import MButton from './MButton.vue'
import MPickSheet from './MPickSheet.vue'

defineOptions({ inheritAttrs: false })

// Android's ListPreference: the row shows the current value; tapping opens a dialog with one radio row per option,
// and choosing one applies it and closes the dialog.
const model = defineModel({ type: [String, Number, Boolean], default: '' })
const props = defineProps({
  title: { type: String, required: true },
  /** [{ value, label, text? }] */
  options: { type: Array, required: true },
  icon: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  cancelLabel: { type: String, default: 'Cancel' },
  /** help text, shown above the options in the dialog */
  help: { type: String, default: '' },
  /** a longer list than this opens a sheet with a search field instead of the dialog */
  sheetFrom: { type: Number, default: 7 },
  searchLabel: { type: String, default: 'Search' },
  emptyText: { type: String, default: 'Nothing found' },
  closeLabel: { type: String, default: 'Close' },
})
const sheet = computed(() => props.options.length > props.sheetFrom)
const open = ref(false)
const group = useId()
const current = computed(() => props.options.find((o) => o.value === model.value)?.label ?? '')
const choose = (value) => {
  model.value = value
  open.value = false
}
</script>

<template>
  <MItem v-bind="$attrs" action :icon="icon" :title="title" :value="current" :disabled="disabled" @click="open = true">
    <template v-if="$slots.trail" #trail><slot name="trail" /></template>
  </MItem>
  <MPickSheet v-if="sheet" v-model="model" v-model:open="open" :title="title" :options="options" :help="help" :search-label="searchLabel" :empty-text="emptyText" :close-label="closeLabel" :search-from="sheetFrom" />
  <Teleport v-else to="body">
  <MDialog v-model="open" :title="title">
    <p v-if="help" class="m-choice__help">{{ help }}</p>
    <div class="m-choice" role="radiogroup" :aria-label="title">
      <label v-for="option in options" :key="String(option.value)" class="m-choice__row">
        <md-radio :name="group" :value="String(option.value)" :checked="option.value === model" touch-target="wrapper" @change="choose(option.value)" />
        <span class="m-choice__text"><span>{{ option.label }}</span><small v-if="option.text">{{ option.text }}</small></span>
      </label>
    </div>
    <template #actions><MButton variant="text" @click="open = false">{{ cancelLabel }}</MButton></template>
  </MDialog>
  </Teleport>
</template>
