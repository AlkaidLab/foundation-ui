import { onBeforeUnmount, onMounted, watch } from 'vue'

// A page that lives in the control panel's frame cannot dim the window around it: its modal and its scrim stop at the edge of the frame. Every modal component (a dialog, a
// sheet, the first-run window) therefore tells the shell when it opens and closes, with `postMessage`; the shell (MScene) lays the same scrim over the rail, the list and the
// caption bar, and gives the person the same ways out: a click on its scrim, or Esc, comes back as `foundation-modal-close` and closes the modal that is on top.
// Outside a frame (the Web UI in its own window, the shell's own modals) nothing is posted: the modal's own scrim already covers the whole window.
export const MODAL_OPEN = 'foundation-modal'
export const MODAL_CLOSE = 'foundation-modal-close'
/** The shell tells the frame where the middle of the whole window is: { dx, dy } from the middle of the frame (the centred dialogs of the page move by it). */
export const MODAL_FRAME = 'foundation-modal-frame'

/** The room a centred sheet keeps at either side of the window's middle, in CSS px (the 12 px of expressive.css). */
const SHEET_MARGIN = 24
/** The least width a centred sheet keeps before it stands in the middle of the frame instead (expressive.css). */
const SHEET_MIN = 280
/**
 * Whether a centred sheet can stand in the middle of the window and still stay inside the frame: the frame is widened by the shift on both sides, and a frame
 * that cannot hold a sheet of a usable width (a detail pane beside a wide list puts the window's middle outside the frame) makes the sheet stand in the frame.
 */
export const centresOnWindow = (frameWidth, dx) => frameWidth - 2 * Math.abs(Number(dx) || 0) - SHEET_MARGIN >= Math.min(SHEET_MIN, Math.max(0, frameWidth - 32))

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
      // where the sheet stands: in the middle of the window while the frame has the room for it, else in the middle of the frame
      document.documentElement.dataset.mFrame = centresOnWindow(document.documentElement.clientWidth, event.data.dx) ? 'fit' : 'frame'
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
