// Pressed state on the frame of the press, for a finger or a pen. `:active` for touch is set only after the browser's show-press delay (and not
// at all while it still waits to see whether the touch becomes a scroll), so the state layer came late. `data-pressed` is set on the control
// at pointerdown and taken off at pointerup / pointercancel (a scroll that starts cancels the pointer). src/css/touch-pressed.css holds the
// `[data-pressed]` twin of every `:active` rule (scripts/gen-touch-pressed.mjs); a mouse never goes through here and keeps `:active`.
// The tray has its own layer for this (src/tray/trayPointer.js) and is not touched.
const PRESSABLE = 'button, a[href], summary, [role=button], [role=switch], [role=tab], [role=menuitem], [role=checkbox], [role=radio], [role=option], [data-press]'

/** the control a press lands on, or null (disabled controls and the tray, which sets its own, do not take it) */
export function pressTarget(node) {
  const el = node && node.closest ? node.closest(PRESSABLE) : null
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('.m-tray, .m-tray-host')) return null
  return el
}

const installed = new WeakSet()
export function installTouchPress(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || installed.has(doc)) return
  installed.add(doc)
  let held = null
  const release = () => { if (held) { held.removeAttribute('data-pressed'); held = null } }
  doc.addEventListener('pointerdown', (event) => {
    release()
    if (event.pointerType === 'mouse') return
    const el = pressTarget(event.target)
    if (!el) return
    held = el
    el.setAttribute('data-pressed', '')
  }, { capture: true, passive: true })
  for (const type of ['pointerup', 'pointercancel', 'dragstart', 'contextmenu']) doc.addEventListener(type, release, { capture: true, passive: true })
  doc.defaultView?.addEventListener('blur', release)
}
