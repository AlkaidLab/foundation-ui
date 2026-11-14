// The first opening of a dialog rasterises its panel for the first time (the blurred 64 px shadow of its elevation above all): 50 to 67 ms of the compositor on the Skyward panel, 17 to 25 ms from the
// second opening on, with the very same shadow, so what the first opening pays is a one-time warm-up and not the cost of every frame. Once, at idle, a copy of the panel is painted for half a second at
// 1 % opacity, where nobody sees it, so that the first real opening finds the work done (measured on fresh instances: 50, 58, 67 ms without it, 25, 25, 33 ms with it). Nothing of the dialog itself is
// changed: no class, no timing of its own, the focus and the Esc are as they were.
let started = false

/** Called by every dialog and sheet when it is mounted; only the first call does anything. */
export function warmDialogRaster() {
  if (started || typeof document === 'undefined') return
  started = true
  const paint = () => {
    try { if (navigator.scheduling?.isInputPending?.() || document.hidden) { setTimeout(paint, 1000); return } } catch { /* no such API */ }
    const probe = document.createElement('div')
    probe.className = 'm-dialog__panel m-dialog__warm'
    probe.setAttribute('aria-hidden', 'true')
    probe.inert = true
    probe.style.cssText = 'position:fixed;left:50%;top:50%;width:600px;height:420px;margin:-210px 0 0 -300px;opacity:.01;pointer-events:none;z-index:2147483000;animation:none'
    document.body.appendChild(probe)
    setTimeout(() => probe.remove(), 500)
  }
  setTimeout(paint, 4000 + Math.random() * 4000)
}
