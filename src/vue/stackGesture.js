// The gestures of a smart stack (MDashStack.vue), pure and tested. The model is Apple's Smart Stack: a vertical swipe on the stack turns it (iPhone guide: "swipe up and down through it"), the page dots show
// where it is, the page still scrolls from anywhere else (docs/authority/source-index.tsv: m3e-apple-iphone-widgets-guide, m3e-apple-hig-widgets). Apple documents no scroll
// gesture for the stacks of the Mac, so the Mac behaviour here (a two-finger vertical scroll or a mouse wheel over the stack steps it by one member per gesture) is the platform's observed convention, written
// as rules that never take a scroll away from the page:
//  - touch: the first movement decides. Vertical and the stack can turn that way: the stack takes the finger (the page does not scroll). Sideways, or vertical towards an end the stack cannot turn past
//    while the page can still scroll that way: the page's. A finger that began as a page scroll is never taken over.
//  - wheel: a gesture is a run of wheel events with gaps under WHEEL_GAP_MS. The stack owns the gesture only when it began over the stack after a quiet moment (a pointer that slides under a scroll in
//    progress, or a momentum tail, belongs to the page) and only when the stack can step that way; it steps once, then ignores the rest of the gesture (the momentum of a trackpad).
export const WHEEL_GAP_MS = 140
export const WHEEL_MIN_PX = 18 // a gesture must carry this much before it is taken as a step
export const SWIPE_SLOP_PX = 6
export const SWIPE_COMMIT = 0.3 // of the stack's height
export const SWIPE_FLICK = 0.5 // px per ms

/** deltaY of a wheel event in pixels (lines and pages as the browser means them) */
export const wheelPx = (e, height = 400) => {
  const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1
  return { x: (e.deltaX || 0) * k, y: (e.deltaY || 0) * k }
}

/**
 * One wheel gesture at a time. `handle(event, at, prevAt, canStep)` for each wheel event over the stack: `at` its time, `prevAt` the time of the wheel event before it anywhere on the page.
 * Returns { own, step }: `own` the stack takes the event (preventDefault), `step` -1 or 1 once per gesture (1: next member, finger or wheel moving down the page).
 */
export function createWheelGesture({ gap = WHEEL_GAP_MS, minPx = WHEEL_MIN_PX } = {}) {
  let phase = 'idle' // idle | undecided | stack | page
  let acc = 0
  return {
    get phase() { return phase },
    handle(e, at, prevAt, canStep, height = 400) {
      const quiet = at - prevAt >= gap
      if (quiet) { phase = 'undecided'; acc = 0 } else if (phase === 'idle') phase = 'page'
      if (phase === 'page' || phase === 'idle') return { own: false, step: 0 }
      if (phase === 'stack') return { own: true, step: 0 }
      const d = wheelPx(e, height)
      // a stack turns up and down: a sideways gesture is the page's (the browser's own horizontal scroll or its back and forward swipe)
      if (Math.abs(d.x) > Math.abs(d.y)) { phase = 'page'; return { own: false, step: 0 } }
      acc += d.y
      // the way it goes is known from the first event: past an end the page scrolls, even before the gesture has carried enough to count as a step
      if (acc !== 0 && !canStep(acc > 0 ? 1 : -1)) { phase = 'page'; return { own: false, step: 0 } }
      if (Math.abs(acc) < minPx) return { own: true, step: 0 }
      const dir = acc > 0 ? 1 : -1
      phase = 'stack'
      return { own: true, step: dir }
    },
    reset() { phase = 'idle'; acc = 0 },
  }
}

/**
 * What a finger that has moved (dx, dy) from where it went down is doing. '' not yet (under the slop), 'swipe' the stack's, 'page' the page's.
 * `dir` is the way the stack would turn (1: finger up, next member). `canTurn(dir)`: the stack has a member that way. `pageCanScroll(dir)`: the page can still scroll the way the finger goes.
 * `touch`: a mouse or pen has no page to scroll under it, so it always has the stack.
 */
export function swipeIntent(dx, dy, { canTurn, pageCanScroll, touch = true, slop = SWIPE_SLOP_PX, ratio = 1.15 }) {
  if (Math.hypot(dx, dy) < slop) return ''
  if (Math.abs(dy) < Math.abs(dx) * ratio) return touch ? 'page' : ''
  const dir = dy < 0 ? 1 : -1
  if (!touch) return 'swipe'
  if (canTurn(dir)) return 'swipe'
  return pageCanScroll(dir) ? 'page' : 'swipe'
}

/** Resistance past an end: the page follows the finger a little, less and less (it never goes further than `max`) */
export const rubber = (y, max) => (y === 0 ? 0 : Math.sign(y) * max * (1 - 1 / (Math.abs(y) / (max * 2.2) + 1)))

/** On the lift: the member to go to (1, -1) or 0 for a spring back. `y` is the offset of the page (negative: moved up), `vy` the velocity in px per ms (negative: up), `h` the height of the stack. */
export function swipeVerdict(y, vy, h, { canTurn }) {
  const dir = y < 0 ? 1 : -1
  if (y === 0 || !canTurn(dir)) return 0
  const flick = Math.abs(vy) >= SWIPE_FLICK && Math.sign(vy) === Math.sign(y) && Math.abs(y) > 10
  return Math.abs(y) >= h * SWIPE_COMMIT || flick ? dir : 0
}

/** Velocity (px per ms) from the last samples [{ t, y }] of a finger, over the last 100 ms */
export function velocityOf(samples, now) {
  const s = samples.filter((p) => now - p.t <= 100)
  if (s.length < 2) return 0
  const a = s[0], b = s[s.length - 1]
  return b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0
}
