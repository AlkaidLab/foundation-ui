<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import { useModalBridge } from './useModalBridge.js'
import { warmDialogRaster } from './warmDialogRaster.js'

const open = defineModel({ type: Boolean, default: false })
const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  tone: { type: String, default: 'warning' },
  /** a press on the backdrop does not close it (Escape still does) */
  persistent: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel'])
const dialog = ref(null)
const body = ref(null)
// the title and the actions stay; the body scrolls inside the dialog, with a fade at the edge that has more content
const fade = ref('')
function updateFade() {
  const el = body.value
  if (!el) return
  const top = el.scrollTop > 2
  const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
  fade.value = top && bottom ? 'both' : top ? 'top' : bottom ? 'bottom' : ''
}
let watcher = null
onMounted(() => {
  warmDialogRaster()
  if (typeof ResizeObserver !== 'undefined' && body.value) { watcher = new ResizeObserver(updateFade); watcher.observe(body.value) }
  if (typeof MutationObserver !== 'undefined' && body.value) { const m = new MutationObserver(updateFade); m.observe(body.value, { childList: true, subtree: true }); const stop = watcher; watcher = { disconnect() { stop?.disconnect(); m.disconnect() } } }
})
let opener = null

watch(open, async (value) => {
  await nextTick()
  const el = dialog.value
  if (!el) return
  if (value && !el.open) {
    opener = document.activeElement
    el.showModal()
    nextTick(updateFade)
  } else if (!value && el.open) {
    el.close()
  }
}, { immediate: true, flush: 'post' })

const onCancel = (event) => {
  event.preventDefault()
  open.value = false
  emit('cancel')
}
const onClose = () => {
  if (open.value) open.value = false
  if (opener instanceof HTMLElement) opener.focus()
}
useModalBridge(open, () => { open.value = false })
const onBackdrop = (event) => {
  if (!props.persistent && event.target === dialog.value) onCancel(event)
}
onBeforeUnmount(() => { watcher?.disconnect(); if (dialog.value?.open) dialog.value.close() })
</script>

<template>
  <dialog ref="dialog" class="m-dialog" :aria-labelledby="'m-dialog-title'" @cancel="onCancel" @close="onClose" @click="onBackdrop">
    <div class="m-dialog__panel">
      <div v-if="icon" class="m-dialog__icon" :class="tone !== 'warning' && `m-dialog__icon--${tone}`"><MIcon :name="icon" fill /></div>
      <h2 id="m-dialog-title" class="m-dialog__title">{{ title }}</h2>
      <div ref="body" class="m-dialog__body" :data-fade="fade || undefined" @scroll.passive="updateFade"><slot /></div>
      <div class="m-dialog__actions"><slot name="actions" /></div>
    </div>
  </dialog>
</template>
