<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { vModalOpen } from '../a11y/modalLayer.js'
import { useModalBridge } from './useModalBridge.js'
import { useHistoryClose } from './useHistoryClose.js'

/**
 * The window of the first run (the welcome guide of the control panel, the setup wizard of the Web UI): a modal over the one scrim of every modal, so the page underneath stays faintly visible.
 * Two presentations: 'sheet' (it rises from the bottom edge, rounded at the top, about 90 % of the width and height) and 'dialog' (it floats, touching no edge, the same size).
 * On a compact window (under 600 wide) both are the whole screen. The steps, their copy and the mascot belong to the content that goes in the default slot; the content
 * lays itself out as a column: header and progress at the top, the body scrolling, the actions at the foot (.m-onboard styles the guide's and the wizard's parts for it).
 * `?onboard=dialog` or `?onboard=sheet` in the address overrides the presentation (to compare the two).
 * It is a `<dialog>` shown with showModal() (v-modal-open): the platform makes the page behind it inert (no click, no focus, no keys), and src/a11y/modalLayer.js takes the right-click and the wheel away
 * from the backdrop. A hand-made `div role=dialog aria-modal` left the page behind it with its focus, its shortcuts and its own context menu.
 */
const props = defineProps({
  mode: { type: String, default: 'dialog' }, // 'dialog' | 'sheet'
  label: { type: String, default: '' },
  /** Esc closes (the guide skips); the wizard asks first, so it turns this off */
  escCloses: { type: Boolean, default: true },
})
const emit = defineEmits(['close'])
// the window is open as long as it is mounted; the shell dims what is around it when it lives in a frame
useModalBridge(() => true, () => { if (props.escCloses) emit('close') })
// the mouse's Back button closes it like Esc (the window has an entry of its own in the history, as a sheet has); one that asks before it closes (escCloses off) has none
// it is present from its first frame on, but not at setup: a sheet that is open at setup is "open from the page's first moment" and takes no entry (useHistoryClose); a window the person opened is an entry
const present = ref(false)
onMounted(() => { present.value = true })
useHistoryClose(present, () => { if (props.escCloses) emit('close') }, () => !props.escCloses)
onBeforeUnmount(() => { present.value = false })
const root = ref(null)
const shown = computed(() => {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('onboard') : null
  return q === 'dialog' || q === 'sheet' ? q : props.mode
})
const dlg = ref(null)
let opener = null
let alive = true
// Esc: the dialog's own `cancel` and, for a focus that is on nothing, the keydown here; a question asked inside the window (another open dialog) is answered first. The platform may also
// close a dialog without a cancel (a second Esc without a press in between): the `close` event then does the same, once.
function onCancel() { if (props.escCloses) emit('close') }
const othersOpen = () => [...document.querySelectorAll('dialog[open]')].some((d) => d !== dlg.value)
function onKey(event) {
  if (!dlg.value?.open || othersOpen()) return
  if (event.key === 'Escape') { event.preventDefault(); onCancel(); return }
  if (event.key !== 'Tab' || !root.value) return
  // Tab wraps inside the window (the platform would hand the focus to the browser's own chrome after the last control)
  const nodes = [...root.value.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null)
  if (!nodes.length) return
  const first = nodes[0], last = nodes[nodes.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === root.value || !dlg.value.contains(document.activeElement))) { last.focus(); event.preventDefault() }
  else if (!event.shiftKey && (document.activeElement === last || !dlg.value.contains(document.activeElement))) { first.focus(); event.preventDefault() }
}
function onClosed() {
  if (!alive) return
  if (props.escCloses) emit('close')
  nextTick(() => { if (alive && dlg.value && !dlg.value.open) dlg.value.showModal() })
}
onMounted(async () => {
  opener = document.activeElement
  document.addEventListener('keydown', onKey, true)
  document.documentElement.classList.add('m-onboarding')
  await nextTick(); root.value?.focus()
})
onBeforeUnmount(() => {
  alive = false
  document.removeEventListener('keydown', onKey, true)
  document.documentElement.classList.remove('m-onboarding')
  if (opener instanceof HTMLElement) opener.focus()
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dlg" v-modal-open class="m-onboard" :class="`m-onboard--${shown}`" :aria-label="label || undefined" @cancel.prevent="onCancel" @close="onClosed">
      <div class="m-onboard__scrim" aria-hidden="true" />
      <div ref="root" class="m-onboard__window" tabindex="-1"><slot /></div>
    </dialog>
  </Teleport>
</template>
