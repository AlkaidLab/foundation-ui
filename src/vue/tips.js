import { reducedMotion } from '../appearance/motion.js'
// Tooltips: one box in the top layer (Popover API) for every element with [data-tip] and every info button. The box is a child of the body, so a card, a
// row or a scroll area can neither cover nor clip it. Shows after a short hover or on keyboard focus, hides on leave, scroll, press and Escape; an info
// button also toggles it by a press of any kind (mouse click, tap, pen): help is reachable without hovering, and what a press opened stays until the next press, Escape,
// scroll or the focus leaving, also after the pointer has left it. The text is read from `data-tip`.
let box = null
let timer = 0
let current = null
let pinned = false

const reduce = () => reducedMotion()
function ensure() {
  if (box) return box
  box = document.createElement('div')
  box.className = 'm-tipbox'
  box.setAttribute('role', 'tooltip')
  if ('popover' in box) box.setAttribute('popover', 'manual')
  else box.style.zIndex = '2147483647'
  document.body.appendChild(box)
  return box
}
function place(target) {
  const el = ensure()
  const r = target.getBoundingClientRect()
  const w = el.offsetWidth
  const h = el.offsetHeight
  const pad = 8
  let top = r.bottom + 6
  if (top + h > innerHeight - pad) top = Math.max(pad, r.top - h - 6)
  let left = r.left + r.width / 2 - w / 2
  // data-tip-side="start": beside the target, towards the start edge (the close button of a dialog: below it the tip would cover the first line)
  if (target.getAttribute('data-tip-side') === 'start' && r.left - w - 6 >= pad) { left = r.left - w - 6; top = r.top + (r.height - h) / 2 }
  left = Math.min(Math.max(pad, left), Math.max(pad, innerWidth - w - pad))
  el.style.top = `${Math.round(top)}px`
  el.style.left = `${Math.round(left)}px`
}
export function showTip(target, text = target.getAttribute('data-tip')) {
  if (!text) return
  const el = ensure()
  clearTimeout(timer)
  current = target
  el.textContent = text
  if ('showPopover' in el && !el.matches(':popover-open')) el.showPopover()
  el.style.top = '0px'
  el.style.left = '0px'
  place(target)
  el.classList.add('is-on')
  if (reduce()) el.style.transition = 'none'
}
export function hideTip() {
  clearTimeout(timer)
  current = null
  pinned = false
  if (!box) return
  box.classList.remove('is-on')
  if ('hidePopover' in box && box.matches(':popover-open')) box.hidePopover()
}
/** What a press on `target` does while `current` shows a tip: an info button toggles its tip, a press anywhere else closes it. */
export function pressAction(current, target) {
  if (!target || !target.classList || !target.classList.contains('m-info__btn')) return 'hide'
  return current === target ? 'hide' : 'show'
}
/** A focus change that must not close a tip: the press that opened it is moving the focus onto its own button (the old focus loses it first). */
export function focusKeepsTip(pinned, current, related) {
  return !!(pinned && current && related && (related === current || (current.contains && current.contains(related))))
}
const tipTarget = (event) => (event.target instanceof Element ? event.target.closest('[data-tip]') : null)
let installed = false
export function installTips() {
  if (installed || typeof document === 'undefined') return
  installed = true
  const arm = (event, delay) => {
    const t = tipTarget(event)
    if (!t || t === current) return
    clearTimeout(timer)
    timer = setTimeout(() => showTip(t), delay)
  }
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'touch') arm(e, 450) }, true)
  document.addEventListener('pointerout', (e) => { const t = tipTarget(e); if (t && !t.contains(e.relatedTarget) && !pinned) hideTip() }, true)
  // a focus that arrives while a dialog is still opening (its panel scales in) would place the tip at the moving button: wait until the button holds still for a few frames
  const armStable = (event) => {
    const t = tipTarget(event)
    if (!t || t === current) return
    clearTimeout(timer)
    let last = ''
    let still = 0
    let frames = 0
    const step = () => {
      if (document.activeElement !== t && !t.contains(document.activeElement)) return
      const r = t.getBoundingClientRect()
      const key = `${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.width)}`
      still = key === last ? still + 1 : 0
      last = key
      if (still >= 3 || ++frames > 90) showTip(t)
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  document.addEventListener('focusin', (e) => { if (e.target instanceof Element && e.target.matches(':focus-visible')) armStable(e) }, true)
  document.addEventListener('focusout', (e) => { if (!focusKeepsTip(pinned, current, e.relatedTarget)) hideTip() }, true)
  document.addEventListener('pointerdown', (e) => {
    const t = tipTarget(e)
    // a press on an info button toggles its text (mouse, touch and pen alike); any other press closes it
    if (pressAction(current, t) === 'show') { showTip(t); pinned = true; return }
    hideTip()
  }, true)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip() }, true)
  addEventListener('scroll', hideTip, true)
  addEventListener('resize', hideTip)
}
