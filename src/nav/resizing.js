// Resizing is not animated. While the window changes size (a drag, a maximize, a snap, a move to another monitor, a change of the Windows scale) every layout is what the size says in the same frame and
// nothing slides towards it: `html.m-resizing` switches every CSS transition off (layout.css), and the shell does not start the animation of a rail or a list for a change the resize caused.
// There is no timer and no debounce: the signal is raised in the frame of the first change (the window's resize event comes before the layout of that frame) and drops in the first frame that follows
// one without a change.
const listeners = new Set()
let on = false
let seen = 0
let raf = 0
let target = null
let changedAt = -Infinity // the time of the last change of the signal, up or down
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const request = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16))

function set(next) {
  if (next === on) return
  on = next; changedAt = now()
  try { target?.classList.toggle('m-resizing', next) } catch { /* no document */ }
  for (const fn of listeners) fn(next)
}
function tick() {
  raf = 0
  if (seen > 0) { seen = 0; raf = request(tick) } else set(false)
}
/** A change of size was seen (the frame is being laid out right now). */
export function noteResize() {
  if (!target && typeof document !== 'undefined') target = document.documentElement
  seen += 1
  set(true)
  if (!raf) raf = request(tick)
}
export const isResizing = () => on
/** A resize is on, or ended less than `ms` ago: what a resize causes a little late (a sheet or a bar that measures itself after the window did) is still the resize's: nothing slides for it. */
export const resizedWithin = (ms) => on || now() - changedAt < ms
/** fn(true) when a resize starts, fn(false) in the first frame without a change. Returns the function that stops it. */
export function watchResizing(fn) { listeners.add(fn); return () => listeners.delete(fn) }
let bound = false
/** The window's own events: its resize (before the layout of the frame) and the visual viewport's (a page zoom). */
export function trackWindowResize(win = typeof window !== 'undefined' ? window : null) {
  if (!win || bound) return
  bound = true
  win.addEventListener('resize', noteResize)
  win.visualViewport?.addEventListener?.('resize', noteResize)
}
/** for tests */
export function resetResizing(doc = null) { on = false; seen = 0; raf = 0; target = doc; listeners.clear(); bound = false; changedAt = -Infinity }
