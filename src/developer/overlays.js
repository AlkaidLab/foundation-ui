// The overlays of 开发者选项 that need only the page: layout bounds, a flash on every element the page changes, and the speed scale of the animations (the way Android's animator
// scale works: 5x is five times slower, 0.5x twice as fast). Pure parts here, the DOM part installs them.

export const OUTLINE_CLASS = 'm-dev-outline'
export const FLASH_CLASS = 'm-dev-flash'
export const OVERLAY_STYLE_ID = 'm-dev-overlay-style'

export const overlayCss = () => `
html.${OUTLINE_CLASS} *:not(#m-dev-hud):not(#m-dev-hud *) { outline: 1px solid rgb(255 64 129 / .55) !important; outline-offset: -1px; }
html.${OUTLINE_CLASS} *:hover:not(#m-dev-hud) { outline-color: rgb(255 193 7 / .95) !important; }
@keyframes m-dev-flash { from { outline: 2px solid rgb(255 23 68 / .95); background-color: rgb(255 23 68 / .12); } to { outline: 2px solid rgb(255 23 68 / 0); background-color: transparent; } }
.${FLASH_CLASS} { animation: m-dev-flash 450ms ease-out; }
#m-dev-hud { position: fixed; top: 6px; right: 6px; z-index: 2147483000; pointer-events: none; font: 11px/1.45 ui-monospace, Consolas, monospace; color: #e8ffe8; background: rgb(0 0 0 / .72); border-radius: 6px; padding: 5px 8px; white-space: pre; }
#m-dev-hud .m-dev-mark { display: inline-block; width: 6px; height: 10px; margin-right: 2px; background: #ff5252; vertical-align: -1px; }
`

/** The playback rate that makes animations `scale` times as slow. */
export const playbackRateFor = (scale) => (scale > 0 ? 1 / scale : 1)

/** Sets the rate on the animations that do not have it yet. Returns how many were changed. */
export function applyAnimationScale(animations, scale) {
  const rate = playbackRateFor(scale)
  let changed = 0
  for (const animation of animations) {
    if (!animation || typeof animation.updatePlaybackRate !== 'function') continue
    if (animation.playbackRate !== rate) { animation.updatePlaybackRate(rate); changed += 1 }
  }
  return changed
}

/**
 * The elements that changed get the flash class for `ms`. A burst flashes the same element once; at most `limit` elements per call.
 * `later(fn, ms)` is setTimeout (replaceable).
 */
export function createFlasher({ later = (fn, ms) => setTimeout(fn, ms), ms = 480, limit = 150 } = {}) {
  const live = new Set()
  return {
    flash(elements) {
      let n = 0
      for (const el of elements) {
        if (n >= limit) break
        if (!el || !el.classList || live.has(el)) continue
        live.add(el); n += 1
        el.classList.remove(FLASH_CLASS)
        void el.offsetWidth // restart the animation of an element that flashed before
        el.classList.add(FLASH_CLASS)
        later(() => { el.classList.remove(FLASH_CLASS); live.delete(el) }, ms)
      }
      return n
    },
    get live() { return live.size },
  }
}

/** The element a mutation record is about (a text node counts for its parent); the HUD and the flashing elements are not "changes". */
export function mutatedElements(records, ignore = (el) => el.id === 'm-dev-hud' || el.closest?.('#m-dev-hud')) {
  const out = new Set()
  for (const r of records) {
    const el = r.target?.nodeType === 1 ? r.target : r.target?.parentElement
    if (!el || ignore(el)) continue
    if (r.type === 'attributes' && r.attributeName === 'class' && r.target.classList?.contains(FLASH_CLASS)) continue
    out.add(el)
  }
  return out
}

/** The DOM part: installs what the flags say, and removes what they do not. `update(flags)` can be called again; `stop()` takes everything off. */
export function installOverlays(doc = document, win = window) {
  let style = null
  let mutObserver = null
  let flasher = null
  let animHandler = null
  let scale = 1
  const root = () => doc.documentElement
  function ensureStyle() { if (style) return; style = doc.createElement('style'); style.id = OVERLAY_STYLE_ID; style.textContent = overlayCss(); doc.head.appendChild(style) }
  function update(flags) {
    const wantFlash = !!flags.flashes
    const wantAnim = flags.animScale !== 1
    if (flags.outlines || wantFlash || flags.hud || flags.longTasks || flags.mutations) ensureStyle()
    root().classList.toggle(OUTLINE_CLASS, !!flags.outlines)
    if (wantFlash && !mutObserver && typeof win.MutationObserver === 'function') {
      flasher = createFlasher()
      mutObserver = new win.MutationObserver((records) => flasher.flash(mutatedElements(records)))
      mutObserver.observe(root(), { subtree: true, childList: true, attributes: true, characterData: true })
    } else if (!wantFlash && mutObserver) { mutObserver.disconnect(); mutObserver = null; flasher = null }
    scale = flags.animScale
    if (wantAnim && !animHandler) {
      animHandler = () => { if (typeof doc.getAnimations === 'function') applyAnimationScale(doc.getAnimations(), scale) }
      for (const type of ['transitionrun', 'animationstart']) doc.addEventListener(type, animHandler, true)
    }
    if (typeof doc.getAnimations === 'function') applyAnimationScale(doc.getAnimations(), wantAnim ? scale : 1)
    if (!wantAnim && animHandler) { for (const type of ['transitionrun', 'animationstart']) doc.removeEventListener(type, animHandler, true); animHandler = null }
  }
  function stop() { update({ outlines: false, flashes: false, animScale: 1 }); style?.remove(); style = null }
  return { update, stop }
}
