<script setup>
import { computed, onMounted, watch } from 'vue'
import MButton from '../MButton.vue'
import MDialog from '../MDialog.vue'
import MIcon from '../MIcon.vue'
import { useCountdown } from '../useCountdown.js'
import { confirmLabel } from './installerModel.js'

// The question before an install into a folder that only has a warning (installer-dir: a parent that others can replace, a user folder): what is wrong, the folder and the safe place, and a
// button that counts down before it can be pressed, like the other risky questions (MResetConfirm). The safe place is the primary choice. The host asks the same of the answer: it takes
// "install anyway" only after the same seconds, so a page that counts wrong cannot skip them.
const props = defineProps({ model: { type: Object, default: null }, locale: { type: String, default: 'zh' } })
const emit = defineEmits(['action'])
const open = computed(() => !!props.model)
const countdown = useCountdown(props.model?.seconds || 5)
// the countdown runs in the window only (a page that is rendered to text starts no timer)
onMounted(() => { if (open.value) countdown.begin() })
watch(open, (value) => { if (value) countdown.begin(); else countdown.end() })
const label = computed(() => (props.model ? confirmLabel(props.locale, props.model, countdown.remaining.value) : ''))
const canInstall = computed(() => countdown.ready.value)
const cancel = () => emit('action', { type: 'cancel-dir-risk' })
</script>

<template>
  <MDialog v-if="model" :model-value="true" :title="model.title" icon="warning" tone="warning" persistent data-inst-confirm @cancel="cancel" @update:model-value="cancel">
    <p class="m-dialog__message">{{ model.text }}</p>
    <dl class="m-inst__confirm-paths">
      <div><dt>{{ model.pathLabel }}</dt><dd>{{ model.path }}</dd></div>
      <div v-if="model.safePath"><dt>{{ model.safeLabel }}</dt><dd>{{ model.safePath }}</dd></div>
    </dl>
    <template #actions>
      <MButton variant="text" @click="cancel">{{ model.cancel }}</MButton>
      <MButton variant="tonal" :disabled="!canInstall" data-inst-confirm-install @click="canInstall && emit('action', { type: 'confirm-dir-risk' })">{{ label }}</MButton>
      <MButton v-if="model.safePath" variant="filled" data-inst-confirm-safe @click="emit('action', { type: 'use-safe-dir' })">{{ model.safe }}</MButton>
    </template>
  </MDialog>
</template>
