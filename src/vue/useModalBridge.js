import { onBeforeUnmount, onMounted, watch } from 'vue'

// A page that lives in the control panel's frame cannot dim the window around it: its modal and its scrim stop at the edge of the frame. Every modal component (a dialog, a
// sheet, the first-run window) therefore tells the shell when it opens and closes, with `postMessage`; the shell (MScene) lays the same scrim over the rail, the list and the
// caption bar, and gives the person the same ways out: a click on its scrim, or Esc, comes back as `foundation-modal-close` and closes the modal that is on top.
// Outside a frame (the Web UI in its own window, the shell's own modals) nothing is posted: the modal's own scrim already covers the whole window.
export const MODAL_OPEN = 'foundation-modal'
export const MODAL_CLOSE = 'foundation-modal-close'
/** The shell tells the frame where the middle of the whole window is: { dx, dy } from the middle of the frame (the centred dialogs of the page move by it). */
export const MODAL_FRAME = 'foundation-modal-frame'

/** The ids of the modals that are open in the frames, after one message of a frame ({ id, open }). Pure, so the shell's bookkeeping can be tested. */
export const modalsAfter = (ids, data) => {
  const next = new Set(ids)
  if (data && typeof data.id === 'string') { if (data.open) next.add(data.id); else next.delete(data.id) }
  return next
}
/** A frame that is hidden (the person went to a page of the shell) or has loaded another page has no modal any more: nothing stays behind to hold the shell's scrim. */
export const modalsAfterFrameGone = () => new Set()

const closers = []
let listening = false
let counter = 0

const inFrame = () => typeof window !== 'undefined' && window.parent && window.parent !== window

function listen() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || !event.data) return
    if (event.data.type === MODAL_FRAME) {
      const set = (name, value) => document.documentElement.style.setProperty(name, `${Number.isFinite(value) ? Math.round(value) : 0}px`)
      set('--m-frame-dx', event.data.dx); set('--m-frame-dy', event.data.dy)
      return
    }
    if (event.data.type !== MODAL_CLOSE) return
    const top = closers[closers.length - 1]
    if (top) top.close()
  })
}

/** Tell the shell about a modal: `open` is a ref (or getter) of its state, `close` closes it (the same as its own scrim does). */
export function useModalBridge(open, close) {
  const id = `m${++counter}-${Math.random().toString(36).slice(2, 8)}`
  const entry = { id, close }
  const post = (value) => { if (inFrame()) window.parent.postMessage({ type: MODAL_OPEN, id, open: !!value }, '*') }
  const sync = (value) => {
    const at = closers.indexOf(entry)
    if (value && at < 0) closers.push(entry)
    else if (!value && at >= 0) closers.splice(at, 1)
    post(value)
  }
  onMounted(() => { listen(); watch(open, sync, { immediate: true }) })
  onBeforeUnmount(() => sync(false))
}
