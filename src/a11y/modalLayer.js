// While a modal is open, the rest of the window does nothing: not a click, not the keyboard focus, not the wheel, not a right-click. The platform does most of it, and this file
// is the part it leaves over.
//
// What the platform does (HTML Standard 4.11.4, `showModal()`: "the document is blocked by a modal dialog", and 6.3.1, modal dialogs and inert subtrees): a `<dialog>` opened with
// showModal() goes to the top layer and everything outside it is inert: no hit-testing, no focus, no find-in-page, not exposed to assistive technology. MDN: HTMLDialogElement.showModal(),
// the `inert` global attribute, the `::backdrop` pseudo-element, Element `contextmenu` event. Every modal of this library is therefore a `<dialog>` (MDialog, MSheet, MOnboardWindow,
// MCoachMarks, the full-screen search) and none of them rebuilds the trap by hand.
//
// What it leaves over, and this file does:
//  1. A press on the backdrop (or on an inert part of the page) is still a `contextmenu` event: its target is the dialog itself. The window's own menu (MContextProvider) opened under the modal.
//  2. A `wheel` over the backdrop scrolls the page behind the dialog (the top layer chains its scroll to the viewport).
//  3. A modal of an embedded page lives in a frame: the shell cannot make itself inert from there, it marks itself (`data-modal-frame` on <html>, set by MScene) and is held to the same rules.
// So: a capture-phase guard that, while a modal is open, takes `contextmenu` and `wheel` away from everything outside the modal's surface. Inside the surface nothing changes: a field keeps
// the platform's own menu (copy, paste, spell-check), a list inside a dialog scrolls.

/** The parts of a modal that take part in it: the panel of a dialog, the window of the first run. A press outside every surface (the backdrop, the scrim) is "outside". */
// The sheet that edits the overview is its own panel (a press on its backdrop targets the dialog itself), so its surface is what is inside it: `.m-dedit--gallery > *`.
export const MODAL_SURFACE = '.m-dialog__panel, .m-sheet__panel, .m-onboard__window, .m-coach__card, .m-usearch__full, .m-dedit--gallery > *, [data-modal-surface]'
/** What makes a document "modal": an open dialog, an element that says aria-modal, or a shell that is told its frame has a modal open. */
export const MODAL_OPEN = 'dialog[open], [aria-modal="true"], [data-modal-frame]'
const EDITABLE = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="range"]), textarea, [contenteditable=""], [contenteditable="true"]'

/** True while a modal is open in this document. */
export function modalOpen(doc = typeof document !== 'undefined' ? document : null) {
  try { return !!doc?.querySelector?.(MODAL_OPEN) } catch { return false }
}
/** True when the target is inside a modal's surface (its panel); false for the backdrop, the scrim and everything that is not a modal. */
export function inModalSurface(target) {
  try { return !!target?.closest?.(MODAL_SURFACE) } catch { return false }
}
/** True when the target is a text field or an editable region (they keep the platform's own menu inside a modal). */
export function isEditable(target) {
  try { return !!target?.closest?.(EDITABLE) } catch { return false }
}

/**
 * What a right-click does while a modal is open:
 *  'app'    - no modal: the window's own menu (the caller's normal path)
 *  'native' - inside the modal on a field or a selection: the platform's menu (copy, paste, spell-check); the window's own menu is not shown
 *  'none'   - anywhere else: nothing opens (the default is prevented)
 */
export function contextPolicy({ modal, inside, editable, selection }) {
  if (!modal) return 'app'
  return inside && (editable || selection) ? 'native' : 'none'
}

/** What a wheel does: true when it must be stopped (it would scroll what is behind the modal). */
export function wheelBlocked({ modal, inside }) { return !!modal && !inside }

const installed = new WeakSet()
/** Installs the guard on a document (once). Returns a function that removes it. */
export function installModalGuard(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || installed.has(doc)) return () => {}
  installed.add(doc)
  const onContext = (event) => {
    if (!modalOpen(doc)) return
    if (inModalSurface(event.target)) return
    event.preventDefault(); event.stopPropagation()
  }
  const onWheel = (event) => {
    if (!wheelBlocked({ modal: modalOpen(doc), inside: inModalSurface(event.target) })) return
    if (event.cancelable) event.preventDefault()
    event.stopPropagation()
  }
  doc.addEventListener('contextmenu', onContext, true)
  doc.addEventListener('wheel', onWheel, { capture: true, passive: false })
  return () => {
    doc.removeEventListener('contextmenu', onContext, true); doc.removeEventListener('wheel', onWheel, { capture: true })
    installed.delete(doc)
  }
}

/**
 * `v-modal-open` on a `<dialog>` that is mounted open: it is shown modally when it is inserted and closed when it is removed, so the platform makes the rest of the
 * window inert (a `<div role="dialog" aria-modal>` with a hand-made scrim does not: the page behind it keeps its focus, its keys and its menu).
 */
export const vModalOpen = {
  mounted(el) { installModalGuard(el.ownerDocument); if (!el.open) { try { el.showModal() } catch { /* not connected yet: the next frame shows it */ requestAnimationFrame(() => { if (!el.open && el.isConnected) el.showModal() }) } } },
  beforeUnmount(el) { if (el.open) el.close() },
}
