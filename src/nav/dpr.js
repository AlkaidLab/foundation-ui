// The pixel ratio of a window changes when it moves to a monitor with another scale, when the Windows scale is changed or when the page is zoomed. No resize event is sure to come with it,
// so the shell listens for the ratio itself: a `(resolution: Xdppx)` media query matches only while the ratio is X, so it fires on the first change and is bound again for the new value.
export function watchPixelRatio(callback, { win = typeof window !== 'undefined' ? window : null } = {}) {
  if (!win || typeof win.matchMedia !== 'function') return () => {}
  let query = null
  let stopped = false
  const bind = () => {
    query = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`)
    query.addEventListener('change', onChange)
  }
  function onChange() {
    query.removeEventListener('change', onChange)
    if (stopped) return
    callback(win.devicePixelRatio)
    bind()
  }
  bind()
  return () => { stopped = true; query?.removeEventListener('change', onChange) }
}
