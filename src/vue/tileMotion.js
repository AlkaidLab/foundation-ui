// Tile kit (docs/tile-kit.md): the M3 motion springs for animations started from script, and the shape morph.
// The springs are the tokens of tokens.css (--m-spring-<speed>-<scheme>: a linear() easing and its duration): spatial for things that move or change shape,
// effects for colour and opacity (m3.material.io/styles/motion/overview/how-it-works). Read once from the document, with the token values as the fallback.
const FALLBACK = { 'fast-spatial': 348, 'default-spatial': 412, 'slow-spatial': 568, 'fast-effects': 138, 'default-effects': 212, 'slow-effects': 300 }
const cache = new Map()
/** { easing, duration } of a spring: 'fast-spatial', 'default-spatial', 'slow-spatial', 'fast-effects', 'default-effects', 'slow-effects'. */
export function springOf(name = 'default-spatial') {
  if (cache.has(name)) return cache.get(name)
  let easing = 'cubic-bezier(0.2, 0, 0, 1)', duration = FALLBACK[name] || 400
  try {
    const cs = getComputedStyle(document.documentElement)
    const e = cs.getPropertyValue(`--m-spring-${name}`).trim(); const d = parseFloat(cs.getPropertyValue(`--m-spring-${name}-duration`))
    if (e) easing = e
    if (Number.isFinite(d)) duration = d
  } catch { /* no document: the fallback */ }
  const v = { easing, duration }
  cache.set(name, v)
  return v
}
// literal token names (the token test reads every var() of the sources)
export const SHAPES = Object.freeze({ circle: 'var(--m-shape-circle)', cookie: 'var(--m-shape-cookie)', clover: 'var(--m-shape-clover)', gem: 'var(--m-shape-gem)', sunny: 'var(--m-shape-sunny)', burst: 'var(--m-shape-burst)', squircle: 'var(--m-shape-squircle)' })
const reduced = () => { const m = document.documentElement.dataset.motion; return m === 'reduced' || (m !== 'full' && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) }
/**
 * Morph an element's clip-path from one library shape to another on the slow spatial spring (a state change: idle -> streaming). The shapes are 48-point polygons,
 * so any two interpolate. Returns the Animation (null under reduced motion: the end shape is set at once). MTileShape morphs by itself when its `shape` changes.
 */
export function morphShape(el, from, to, spring = 'slow-spatial') {
  const a = SHAPES[from] || from, b = SHAPES[to] || to
  if (!el) return null
  el.style.clipPath = b
  if (reduced() || !el.animate) return null
  const cs = getComputedStyle(el)
  const start = (() => { el.style.clipPath = a; const v = getComputedStyle(el).clipPath; el.style.clipPath = b; return v })()
  const end = cs.clipPath
  const { easing, duration } = springOf(spring)
  return el.animate([{ clipPath: start }, { clipPath: end }], { duration, easing })
}
