<script setup>
import MItem from './MItem.vue'
import MSwitch from './MSwitch.vue'
import MInfo from './MInfo.vue'

const model = defineModel({ type: Boolean, default: false })
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  icon: { type: String, default: '' },
  tone: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** the change is shown and its answer is still on its way (the switch carries the indicator) */
  pending: { type: Boolean, default: false },
  /** help text behind an info icon next to the switch */
  info: { type: String, default: '' },
  /** what the row can be pinned to the overview as (see MItem) */
  pin: { type: Object, default: null },
})
</script>

<template>
  <MItem :title="title" :text="text" :icon="icon" :tone="tone" :disabled="disabled" :pin="pin">
    <template #trail><MInfo v-if="info" :text="info" /><slot name="extra" /><MSwitch v-model="model" :label="title" :disabled="disabled" :pending="pending" /></template>
  </MItem>
</template>
