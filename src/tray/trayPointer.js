import { computed } from 'vue'
import { trackTransform } from './trayPager.js'

// The pointer side of the tray menu (MTrayMenu): presses, ripples, swipes, the hold that opens edit mode. One factory, one set of closures per menu; the component hands in what it owns.
//   c = { root, viewport, track (refs), nav, props, emit, isPager, canEdit, editing, toggleEdit, pageEl, go, back, input (ref: 'mouse' | 'touch'), densityFix(touchy) }
export function useTrayPointer(c) {
  const { root, viewport, track, nav, props, emit, isPager, canEdit, editing, toggleEdit, pageEl, go, back, input } = c
  // ---- pointers ----
  // One sequence per pointer, from press to release, and what it turns into:
  //   a press on a button      the state layer is there on the frame of the press (CSS :active, no transition for a finger) and a ripple spreads from the contact point (a finger or a pen; a mouse is as it was)
  //   a move of more than 10 px  the press is cancelled and is no click (a finger); it is a swipe, a scroll or nothing, never a tile
  //   horizontal (pager)       the track follows the finger, a rubber band at the ends, a flick or a short swipe turns the page
  //   horizontal from the left edge (stack, a finger)  the page follows and goes back
  //   vertical toward the taskbar (a finger)  the card follows and a swipe of 56 px or a flick closes the menu (bottom or top taskbar; left or right: a swipe outward on a stack page)
  //   a hold of 600 ms on a tile (a finger)  edit mode, with a ring that fills in the meantime
  // A slider's own drag and the layout editor are not ours. The root is touch-action: none, so nothing is taken by the browser; the editor's list is the one thing that scrolls (pan-y).
  let g = null // the sequence now
  let last = null // the sequence before (its click is still to come)
  const MOVE_SLOP = 8 // px: more than this and a press is a gesture
  const EDGE = 24 // px from the card's left edge where an edge swipe starts
  const PAGE_TRIGGER_FRACTION = 0.2
  const PAGE_TRIGGER_MAX_PX = 72
  const FLICK = 0.35 // px per ms: a flick this fast turns the page whatever the distance
  const CLOSE_PX = 56, CLOSE_FLICK = 0.5, HOLD_MS = 600
  const PRESSABLE = '.m-tray__row, .m-tray__btn, .m-tray__tile-main, .m-tray__tile-drill, .m-tray__ibtn, .m-tray__back, .m-tray__update, .m-tray__line, .m-tray__segb, .m-tray__supchip, .m-tray__dot, .m-trayed__btn, .m-trayed__chip, .m-trayed__text'
  const band = (over, size) => (1 - 1 / ((Math.abs(over) * 0.55) / size + 1)) * size * Math.sign(over) // the iOS rubber band: it gives, and gives less
  const placeTrack = (dx = 0) => { if (track.value) track.value.style.transform = trackTransform(nav.index, dx) } // the track is at the page's index, plus the finger's offset
  const toward = computed(() => ({ bottom: [0, 1], top: [0, -1], left: [-1, 0], right: [1, 0] })[props.edge] || [0, 1]) // the direction of the taskbar
  const closable = computed(() => (props.edge === 'top' || props.edge === 'bottom' ? true : !isPager.value))

  function ripple(el, e) {
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const d = 2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y))
    const wrap = document.createElement('span')
    wrap.className = 'm-tray__rip'; wrap.setAttribute('aria-hidden', 'true')
    const dot = document.createElement('i')
    dot.style.cssText = `left:${x}px;top:${y}px;width:${d}px;height:${d}px`
    wrap.appendChild(dot); el.appendChild(wrap)
    return wrap
  }
  function endRipple(wrap) { if (!wrap) return; wrap.classList.add('is-out'); setTimeout(() => wrap.remove(), 280) }
  function cancelPress() {
    if (!g) return
    g.pressEl?.removeAttribute('data-pressed') // a press that has become a swipe is no press
    endRipple(g.rip); g.rip = null
    cancelHold()
  }
  function cancelHold() { if (g?.hold) { clearTimeout(g.hold.timer); g.hold.ring.remove(); g.hold = null } }
  function startHold(e, tile) {
    const r = tile.getBoundingClientRect()
    const ring = document.createElement('span')
    ring.className = 'm-tray__hold'; ring.setAttribute('aria-hidden', 'true')
    ring.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px`
    ring.innerHTML = '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /></svg>'
    tile.appendChild(ring)
    g.hold = { ring, timer: setTimeout(fireHold, HOLD_MS) }
  }
  function fireHold() {
    if (!g?.hold) return
    g.hold.ring.remove(); g.hold = null
    g.mode = 'held'; g.moved = true
    cancelPress()
    try { navigator.vibrate?.(12) } catch { /* no haptics here */ }
    if (!editing.value && canEdit.value) toggleEdit()
  }
  const viewportW = () => viewport.value?.offsetWidth || 1

  function onDown(e) {
    const touchy = e.pointerType === 'touch' || e.pointerType === 'pen'
    input.value = touchy ? 'touch' : 'mouse'
    if (g || (e.pointerType === 'mouse' && e.button !== 0)) return
    const exempt = !!e.target.closest?.('.m-tray__sl, .m-trayed')
    const pressEl = e.target.closest?.(PRESSABLE) || null
    const rect = root.value.getBoundingClientRect()
    g = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: e.timeStamp, vx: 0, vy: 0, mode: '', touchy, exempt, moved: false, pressEl, rip: null, hold: null, firstPress: !c.corrected(),
      edge: touchy && !isPager.value && nav.canBack && e.clientX - rect.left <= EDGE }
    if (touchy && pressEl && !pressEl.disabled) { pressEl.setAttribute('data-pressed', ''); g.rip = ripple(pressEl, e) } // the pressed layer is set here, on the frame of the press: the browser sets :active for a finger only after its show-press delay
    const tile = e.target.closest?.('.m-tray__tile')
    if (touchy && tile && isPager.value && canEdit.value && !editing.value) startHold(e, tile)
  }
  function onMove(e) {
    if (e.pointerType === 'mouse' && input.value === 'touch') input.value = 'mouse'
    if (!g || e.pointerId !== g.id) return
    const dx = e.clientX - g.x, dy = e.clientY - g.y
    const dt = e.timeStamp - g.lt
    if (dt > 0) { g.vx = 0.7 * ((e.clientX - g.lx) / dt) + 0.3 * g.vx; g.vy = 0.7 * ((e.clientY - g.ly) / dt) + 0.3 * g.vy } // px per ms, smoothed
    g.lx = e.clientX; g.ly = e.clientY; g.lt = e.timeStamp
    const dist = Math.hypot(dx, dy)
    if (g.touchy && !g.moved && dist > MOVE_SLOP) { g.moved = true; cancelPress() }
    if (g.exempt || g.mode === 'none' || g.mode === 'held') return
    if (!g.mode) {
      if (!g.touchy) return
      if (dist < MOVE_SLOP) return
      const horizontal = Math.abs(dx) > Math.abs(dy)
      const out = toward.value[1] ? dy * toward.value[1] : dx * toward.value[0] // how far toward the taskbar
      if (horizontal && g.edge && dx > 0) g.mode = 'back'
      else if (horizontal && isPager.value && g.touchy) g.mode = 'page' // a mouse keeps the original swipe: no follow, decided on release (below)
      else if (g.touchy && !g.edge && closable.value && out > 0 && (horizontal === !toward.value[1])) g.mode = 'close'
      else g.mode = 'none'
      if (g.mode === 'none') return
      try { root.value.setPointerCapture(e.pointerId) } catch { /* the pointer is gone */ }
      if (g.mode === 'page') track.value?.classList.add('is-drag')
      if (g.mode === 'back') g.page = pageEl()
      cancelHold()
      emit('drag', true)
    }
    const w = viewportW()
    if (g.mode === 'page') {
      const atStart = nav.index === 0 && dx > 0, atEnd = nav.index === props.model.order.length - 1 && dx < 0
      placeTrack(atStart || atEnd ? band(dx, w) : dx)
    } else if (g.mode === 'back' && g.page) {
      const x = Math.max(0, dx)
      g.page.style.transition = 'none'; g.page.style.transform = `translateX(${x}px)`; g.page.style.opacity = String(Math.max(0, 1 - x / (w * 0.9)))
    } else if (g.mode === 'close') {
      const along = toward.value[1] ? dy * toward.value[1] : dx * toward.value[0]
      const d = band(Math.max(0, along), 240)
      root.value.style.transition = 'none'
      root.value.style.transform = toward.value[1] ? `translateY(${d * toward.value[1]}px)` : `translateX(${d * toward.value[0]}px)`
      root.value.style.opacity = String(Math.max(0.2, 1 - d / 160))
    }
  }
  function finish(e) {
    const d = g
    g = null; last = d
    if (!d) return
    endRipple(d.rip); cancelHold()
    d.pressEl?.removeAttribute('data-pressed')
    if (d.firstPress) { c.firstPressDone(); const next = d.touchy; requestAnimationFrame(() => c.densityFix(next)) } // after the click that this press may be
    if (d.mode && d.mode !== 'none' && d.mode !== 'held') emit('drag', false)
    try { root.value.releasePointerCapture(d.id) } catch { /* already released */ }
    return d
  }
  function onUp(e) {
    if (!g || e.pointerId !== g.id) return
    const d = finish(e)
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    const w = viewportW()
    if (!d.touchy && !d.exempt && isPager.value && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(nav.index + (dx < 0 ? 1 : -1)) // the mouse swipe of the original: 48 px, mostly along
    if (d.mode === 'page') {
      let to = nav.index
      if (Math.abs(d.vx) > FLICK || Math.abs(dx) > Math.min(w * PAGE_TRIGGER_FRACTION, PAGE_TRIGGER_MAX_PX)) to = nav.index + (((Math.abs(d.vx) > FLICK ? d.vx : dx) < 0) ? 1 : -1)
      to = Math.max(0, Math.min(props.model.order.length - 1, to))
      track.value.classList.remove('is-drag')
      if (to !== nav.index) go(to) // the index moves, and the watch puts the track there: from where the finger let go, on the spring
      else placeTrack(0)
    } else if (d.mode === 'back' && d.page) {
      const out = dx > w * 0.3 || d.vx > FLICK
      d.page.style.transition = 'transform 170ms var(--m-spring-fast-spatial), opacity 170ms linear'
      if (out) { d.page.style.transform = `translateX(${Math.max(dx, 0) + w * 0.25}px)`; d.page.style.opacity = '0'; setTimeout(back, 120) }
      else { d.page.style.transform = ''; d.page.style.opacity = '' }
    } else if (d.mode === 'close') {
      const along = toward.value[1] ? dy * toward.value[1] : dx * toward.value[0]
      const speed = toward.value[1] ? d.vy * toward.value[1] : d.vx * toward.value[0]
      const st = root.value.style
      if (along > CLOSE_PX || speed > CLOSE_FLICK) {
        st.transition = 'transform 160ms var(--m-spring-fast-spatial), opacity 160ms linear'
        st.transform = toward.value[1] ? `translateY(${toward.value[1] * 120}px)` : `translateX(${toward.value[0] * 120}px)`; st.opacity = '0'
        setTimeout(() => emit('close'), 150)
      } else { st.transition = 'transform 220ms var(--m-spring-fast-spatial), opacity 160ms linear'; st.transform = ''; st.opacity = '' }
    }
  }
  function onCancel(e) {
    if (!g || e.pointerId !== g.id) return
    const d = finish(e)
    if (d.mode === 'page') { track.value.classList.remove('is-drag'); placeTrack(0) }
    if (d.mode === 'back' && d.page) { d.page.style.transform = ''; d.page.style.opacity = '' }
    if (d.mode === 'close') { root.value.style.transform = ''; root.value.style.opacity = '' }
  }
  // the click that follows a gesture is not a press: a finger that moved more than the slop, a drag of the pager, the hold that opened edit mode
  const onClickCapture = (e) => { const d = g || last; if (d && (d.mode === 'page' || d.mode === 'held' || d.mode === 'back' || d.mode === 'close' || (d.touchy && d.moved))) { e.preventDefault(); e.stopPropagation() } }

  return { onDown, onMove, onUp, onCancel, onClickCapture, placeTrack }
}
