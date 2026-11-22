// What a finger's tap is, for the controls that change the page when they are pressed (添加 in the tile gallery). A finger that scrolls a list starts on the same controls a tap ends on, so
// "the pointer went down on it and a click came" is not enough: a tile is added only when the finger lifts on the control it went down on, has moved less than TAP_SLOP, and the list
// was not scrolling (no scroll event during the press or in the TAP_QUIET before it). A mouse never goes through here: its click is always let through, as are keyboard and
// assistive-technology clicks, which have no pointer press before them.
export const TAP_SLOP = 10 // px: a finger that moves further is scrolling or dragging
export const TAP_QUIET = 150 // ms: a press that lands this soon after a scroll is the finger stopping the list, not choosing a control
export const HOLD_MS = 350 // ms: a finger that rests this long on a card (without moving) takes the tile up; before that its movement is a scroll
const CLICK_WINDOW = 700 // ms: the click that follows a lifted finger comes at once; a verdict older than this belongs to no click

/** a finger or a pen (what a mouse does is left as it was) */
export const isFinger = (e) => !!e && (e.pointerType === 'touch' || e.pointerType === 'pen')

export function createTapGuard({ now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), slop = TAP_SLOP, quiet = TAP_QUIET } = {}) {
  let lastScroll = -Infinity
  let scrolls = 0
  let press = null
  let verdict = null
  const scrolling = () => now() - lastScroll < quiet
  /** the list this guard watches scrolled (call from its `scroll` event) */
  function scrolled() { lastScroll = now(); scrolls++ }
  /** `pointerdown` on the control; true when it is a finger that is being followed */
  function down(e) {
    verdict = null; press = null
    if (!isFinger(e)) return false
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, scrolls, early: scrolling(), el: e.currentTarget || null }
    return true
  }
  /** `pointermove` on the control */
  function move(e) {
    if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > slop) press.far = true
  }
  /** `pointercancel`: the browser took the finger for a scroll */
  function cancel(e) {
    if (press && (!e || e.pointerId === press.id)) { verdict = { ok: false, at: now(), id: press.id }; press = null }
  }
  /** `pointerup`: decides whether the click that follows is a tap */
  function up(e) {
    if (!press || e.pointerId !== press.id) return
    const p = press
    press = null
    const r = p.el && p.el.getBoundingClientRect ? p.el.getBoundingClientRect() : null
    const inside = !r || (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)
    const near = Math.hypot(e.clientX - p.x, e.clientY - p.y) <= slop
    verdict = { ok: inside && near && !p.far && !p.early && p.scrolls === scrolls, at: now(), id: p.id }
  }
  /**
   * the `click` of the control: false when the press it ends was a scroll, a drag or the finger stopping a scroll. A verdict is about the click of THAT pointer only: a click without a pointer press behind it
   * (the keyboard, an assistive technology: no pointer type, no position) and a click of another pointer are let through, and a verdict that no click ever came for (the browser took the finger: pointercancel)
   * holds nothing back.
   */
  function allowClick(e) {
    const v = verdict
    if (!v || now() - v.at > CLICK_WINDOW) { verdict = null; return true }
    if (e && !e.pointerType && !e.detail) return true // keyboard / assistive technology
    if (e && e.pointerId > 0 && v.id > 0 && e.pointerId !== v.id) return true // another pointer
    verdict = null
    return v.ok
  }
  return { scrolled, down, move, cancel, up, allowClick, scrolling }
}

/**
 * A finger that went down on a gallery card, from its first movement to the lift: what it is doing is decided by what it does.
 *   - it moves more than `slop` before `holdMs`: a sideways move on a preview that has several sizes (`swipeable`) is the swipe (`onSwipe(dx)` follows it, `onTurn(dx)` at the lift when it went far enough);
 *     any other direction is a scroll of the list, which is left alone: nothing is taken, nothing is added;
 *   - it rests for `holdMs` without moving: the tile is taken up (`onHold`), and from there on its movement belongs to the drag.
 * `onEnd(mode)` is called once, when the gesture is over (mode: '', 'swipe', 'scroll' or 'held').
 */
export function fingerGesture(down, { swipeable = false, onHold, onSwipe, onTurn, onEnd = () => {}, setTimer = setTimeout, clearTimer = clearTimeout, holdMs = HOLD_MS, slop = TAP_SLOP, turnPx = 48 }) {
  let mode = ''
  let ended = false
  let timer = 0
  const finish = () => { if (ended) return; ended = true; clearTimer(timer); onEnd(mode) }
  timer = setTimer(() => { if (mode || ended) return; mode = 'held'; onHold() }, holdMs)
  return {
    get mode() { return mode },
    move(m) {
      if (ended || m.pointerId !== down.pointerId || mode === 'held') return
      const dx = m.clientX - down.clientX, dy = m.clientY - down.clientY
      if (!mode && Math.hypot(dx, dy) > slop) {
        clearTimer(timer)
        if (swipeable && Math.abs(dx) > Math.abs(dy) * 1.2) mode = 'swipe'
        else { mode = 'scroll'; finish(); return }
      }
      if (mode === 'swipe') onSwipe(dx)
    },
    up(u) {
      if (ended || u.pointerId !== down.pointerId) return
      const dx = u.clientX - down.clientX
      const was = mode
      finish()
      if (was === 'swipe' && u.type === 'pointerup' && Math.abs(dx) > turnPx) onTurn(dx)
    },
  }
}

/**
 * While a finger or a pen carries a tile the list under it must not follow: touchmove is cancelled (a finger), the list is set to overflow-y hidden and the card to touch-action none (every input
 * device, a pen that sends no touch events included), and a scroll that still happens is pinned back on each pointermove. Every call has its own listeners, so one gesture's release never takes another
 * gesture's away. Returns the release.
 */
export function holdLock({ doc, scroller = null, card = null }) {
  const freeze = (t) => { if (t.cancelable) t.preventDefault() }
  const top = scroller ? scroller.scrollTop : 0
  const pin = () => { if (scroller && scroller.scrollTop !== top) scroller.scrollTop = top }
  const was = { overflowY: scroller ? scroller.style.overflowY : '', touchAction: card ? card.style.touchAction : '' }
  doc.addEventListener('touchmove', freeze, { passive: false })
  doc.addEventListener('pointermove', pin)
  if (scroller) scroller.style.overflowY = 'hidden'
  if (card) card.style.touchAction = 'none'
  let released = false
  return () => {
    if (released) return
    released = true
    doc.removeEventListener('touchmove', freeze); doc.removeEventListener('pointermove', pin)
    if (scroller) scroller.style.overflowY = was.overflowY
    if (card) card.style.touchAction = was.touchAction
  }
}
