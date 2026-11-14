// Which input the person used last. The focus indicator (Material 3: a 3 dp outline, 2 dp away, in the shape of the element) is for the keyboard:
// a dialog that puts the focus on its first button when it opens, or a click, shows none. `html[data-modality]` is 'keyboard' after a key
// that moves the focus or presses something, and 'pointer' after the mouse, a pen or a finger (and before anything was done at all).
const KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' ', 'Spacebar'])

/** 'keyboard' | 'pointer' | null (the event says nothing about it) */
export function modalityOf(event) {
  if (!event) return null
  if (event.type === 'keydown') return KEYS.has(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey ? 'keyboard' : null
  if (event.type === 'pointerdown' || event.type === 'mousedown' || event.type === 'touchstart') return 'pointer'
  return null
}

let installed = false
export function installModality(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || installed) return
  installed = true
  const root = doc.documentElement
  if (!root.dataset.modality) root.dataset.modality = 'pointer'
  const on = (event) => { const next = modalityOf(event); if (next && root.dataset.modality !== next) root.dataset.modality = next }
  for (const type of ['keydown', 'pointerdown', 'mousedown', 'touchstart']) doc.addEventListener(type, on, { capture: true, passive: true })
}
