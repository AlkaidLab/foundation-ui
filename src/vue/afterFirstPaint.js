// The frame a page is mounting in is the one that is judged (docs/perf-budgets.md: the work of a frame ≤ 10 ms, no long frame), so work that can wait one
// frame must not be built inside it. `afterFirstPaint(run)` calls `run` once the frame the caller mounted in has been painted: the requestAnimationFrame
// callback still runs before that frame's layout and paint, so the call is handed to a timer, which the renderer answers only once the frame is out
// (HTML Standard 8.1.7.1, event loop processing model, m3e-whatwg-html-eventloop-20261106; the same rule as `afterPaint` of useAppearance.js). A window
// that paints no frame at all (hidden, minimized) is not held forever: `run` happens after `fallbackMs` anyway.
export function afterFirstPaint(run, fallbackMs = 120) {
  let done = false
  const go = () => { if (done) return; done = true; run() }
  let timer = setTimeout(go, fallbackMs)
  let frame = 0
  if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(() => { clearTimeout(timer); timer = setTimeout(go, 0) })
  /** Stops the pending call (a component that unmounted before its frame was painted). */
  return () => { done = true; clearTimeout(timer); if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame) }
}
