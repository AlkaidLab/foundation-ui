// The scrollbar rule of css/scrollbar.css, as text, for the shadow roots the page's own rules cannot reach (the Material Web menu keeps its list in one). The rules inside the braces are the
// same as the block `/* shadow:begin */ ... /* shadow:end */` of scrollbar.css (test/scrollbar.test.js keeps the two equal).

export const SCROLLBAR_RULES = `*::-webkit-scrollbar { width: var(--m-sb-size, 12px); height: var(--m-sb-size, 12px); background: transparent; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-corner { background: transparent; }
*::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
*::-webkit-scrollbar-thumb { background-color: transparent; background-clip: padding-box; border: 4px solid transparent; border-radius: 9999px; min-height: 48px; min-width: 48px; transition: background-color 240ms linear; }
*[data-sb-on]::-webkit-scrollbar-thumb { background-color: var(--m-sb-thumb); }
*::-webkit-scrollbar-thumb:hover { background-color: var(--m-sb-thumb-hover); border-width: 2px; }
*::-webkit-scrollbar-thumb:active { background-color: var(--m-sb-thumb-active); border-width: 2px; }`

export const SCROLLBAR_SHEET = `@media (hover: hover) and (pointer: fine) and (not (forced-colors: active)) { @supports selector(::-webkit-scrollbar) {\n${SCROLLBAR_RULES}\n} }`

let sheet = null

/** How long the thumb stays after the last scroll of its container. */
export const SCROLLBAR_FADE_MS = 1000
const timers = new WeakMap()
/**
 * The thumb of a container is shown while it scrolls and fades out SCROLLBAR_FADE_MS after the last scroll: a capture listener (scroll does not bubble) puts `data-sb-on` on the container that
 * scrolled and takes it off again; the transition and the colour are in the rule above. `root` is the document or a shadow root.
 */
export function watchScrolling(root) {
  if (!root || typeof root.addEventListener !== 'function') return false
  root.addEventListener('scroll', (event) => {
    let el = event.target
    if (el && el.nodeType === 9) el = el.documentElement
    if (!el || el.nodeType !== 1) return
    el.setAttribute('data-sb-on', '')
    clearTimeout(timers.get(el))
    timers.set(el, setTimeout(() => { timers.delete(el); el.removeAttribute('data-sb-on') }, SCROLLBAR_FADE_MS))
  }, { capture: true, passive: true })
  return true
}
if (typeof document !== 'undefined' && !globalThis.__mScrollbarFade) { globalThis.__mScrollbarFade = true; watchScrolling(document) }

/** Gives a shadow root the scrollbar rule of the product. Safe to call more than once and where constructable style sheets do not exist (it does nothing there). */
export function adoptScrollbar(root) {
  if (!root || typeof CSSStyleSheet === 'undefined' || !('adoptedStyleSheets' in root)) return false
  try {
    if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(SCROLLBAR_SHEET) }
    if (!root.adoptedStyleSheets.includes(sheet)) { root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]; watchScrolling(root) }
    return true
  } catch { return false }
}

/** A function ref for a Material Web element that keeps a scroll container in its shadow root (md-menu). */
export function scrollbarRef(el) {
  if (!el || typeof customElements === 'undefined') return
  const tag = el.localName
  Promise.resolve(customElements.whenDefined(tag)).then(() => Promise.resolve(el.updateComplete).then(() => adoptScrollbar(el.shadowRoot))).catch(() => {})
}
