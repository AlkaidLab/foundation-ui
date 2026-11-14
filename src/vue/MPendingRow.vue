<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import { valueText } from '../pending/texts.js'

// One change as a row: the name, and the old value (muted outline chip) → the new value (tonal chip). A value that does not fit is cut with an ellipsis and
// carries its whole text as the tooltip.
const props = defineProps({ entry: { type: Object, required: true }, texts: { type: Object, required: true } })
const side = (which) => {
  const e = props.entry
  const text = (which === 'after' ? e.afterText : e.beforeText) ?? valueText(which === 'after' ? e.after : e.before, props.texts)
  return { text, tip: text.length > 14 ? text : undefined }
}
const before = computed(() => side('before'))
const after = computed(() => side('after'))
</script>

<template>
  <li class="m-prow" :class="{ 'm-prow--invalid': entry.invalid }">
    <span class="m-prow__label">{{ entry.label }}</span>
    <span class="m-prow__vals">
      <span class="m-vchip m-vchip--old" :data-tip="before.tip">{{ before.text }}</span>
      <MIcon name="arrow_forward" />
      <span class="m-vchip" :class="entry.invalid ? 'm-vchip--bad' : 'm-vchip--new'" :data-tip="after.tip">{{ after.text }}</span>
    </span>
    <span v-if="entry.invalid" class="m-prow__error" role="alert"><MIcon name="error" fill />{{ entry.invalid.message }}</span>
    <slot name="action" />
  </li>
</template>
