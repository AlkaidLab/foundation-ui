<script setup>
import { computed } from 'vue'
import MButton from './MButton.vue'
import MDialog from './MDialog.vue'
import { useDialogs } from '../dialog/store.js'

// The place of the questions of the window (useDialogs().ask): mount once in the shell. The same dialog as the save confirmation: headline, the sentence,
// the buttons at the end in the order cancel, confirm (a danger confirm for an error or `danger`).
const props = defineProps({ locale: { type: String, default: 'en' } })
const dialogs = useDialogs()
const current = computed(() => dialogs.state.queue[0] || null)
const zh = computed(() => String(props.locale).startsWith('zh'))
const ICON = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle' }
const open = computed({
  get: () => !!current.value,
  set: (value) => { if (!value && current.value) dialogs.settle(current.value.id, 'close') },
})
</script>

<template>
  <MDialog v-if="current" :key="current.id" v-model="open" :title="current.title || (zh ? '请确认' : 'Confirm')" :icon="ICON[current.type] || ''" :tone="current.type === 'error' ? 'error' : current.type === 'info' || current.type === 'success' ? 'info' : 'warning'" :persistent="current.persistent">
    <p class="m-dialog__message">{{ current.message }}</p>
    <template #actions>
      <MButton v-if="current.cancel" variant="text" @click="dialogs.settle(current.id, 'cancel')">{{ current.cancelText || current.cancelButtonText || (zh ? '取消' : 'Cancel') }}</MButton>
      <MButton :variant="current.danger || current.type === 'error' ? 'danger' : 'filled'" @click="dialogs.settle(current.id, 'confirm')">{{ current.confirmText || current.confirmButtonText || (zh ? '确定' : 'OK') }}</MButton>
    </template>
  </MDialog>
</template>
