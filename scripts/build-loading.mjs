// Generates src/css/loading.css: the M3 Expressive loading indicator (Compose Material3 LoadingIndicator.kt, LoadingIndicatorDefaults):
// the indeterminate sequence SoftBurst, Cookie9Sided, Pentagon, Pill, Sunny, Cookie4Sided, Oval; a morph to the next shape starts every 650 ms
// (MorphIntervalMillis) on a spring of damping 0.6 and stiffness 200, the shape turns a further 90 degrees with each morph on the same spring,
// and the whole indicator turns once every 4666 ms (GlobalRotationDurationMillis), linearly. Three nested layers, three animations:
//   .m-loading__spin  m-loading-turn  4666 ms linear            the global rotation
//   .m-loading__step  m-loading-step  4 x 650 ms               +90 degrees per morph, the raw spring (it overshoots: the bounce)
//   .m-loading__shape m-loading-morph 7 x 650 ms               clip-path to the next shape, the spring held at 1 (Compose coerces the morph progress)
// The shapes are the 96-point polygons of the shape library, scaled so that every one of them stays inside the indicator while it turns
// (LoadingIndicator calculateScaleFactor), in a 38 px of 48 px box (LoadingIndicatorTokens ActiveSize / ContainerWidth).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { shapeOutline, samplePolygon, toClipPath } from './material-shapes.mjs'
import { SHAPE_POINTS } from './build-shapes.mjs'
import { springValue } from '../src/tokens/motion.js'

export const LOADING_SEQUENCE = ['soft-burst', 'cookie-9-sided', 'pentagon', 'pill', 'sunny', 'cookie-4-sided', 'oval']
export const MORPH_INTERVAL_MS = 650
export const GLOBAL_ROTATION_MS = 4666
export const MORPH_SPRING = { damping: 0.6, stiffness: 200 }
export const ACTIVE_SCALE = 38 / 48

// Compose ends this spring at a visibility threshold of 0.1 and snaps; here it runs until it is within 1 % of the target, still inside the 650 ms
export function morphSettleMs(spring = MORPH_SPRING, epsilon = 0.01) {
  let last = 0
  for (let t = 0; t <= 2; t += 0.001) if (Math.abs(1 - springValue(spring, t)) > epsilon) last = t
  return Math.round((last + 0.001) * 1000)
}
const springLinear = (T, clamp) => {
  const pts = []
  for (let i = 0; i <= 40; i++) { const v = i === 40 ? 1 : springValue(MORPH_SPRING, (T / 1000) * (i / 40)); pts.push(+(clamp ? Math.min(1, v) : v).toFixed(4)) }
  return `linear(${pts.join(', ')})`
}
export function loadingPolygons() {
  const polys = LOADING_SEQUENCE.map((n) => samplePolygon(shapeOutline(n), SHAPE_POINTS))
  const maxR = Math.max(...polys.flat().map((p) => Math.hypot(p.x - 0.5, p.y - 0.5)))
  const k = 0.5 / maxR
  return polys.map((poly) => poly.map((p) => ({ x: 0.5 + (p.x - 0.5) * k, y: 0.5 + (p.y - 0.5) * k })))
}
// the component itself, here so that a window can load the indicator alone (foundation-ui/css/loading.css); colour: --m-loading-color, else primary
const COMPONENT = "/* The indicator (LoadingIndicatorTokens: 48 px container, 38 px indicator): three layers, the global turn, the +90deg spring step per morph, the shape morph.\n   Paused while not seen, the morph held beyond the sixth indicator on screen (MLoading). */\n.m-loading { --m-size: 48px; width: var(--m-size); height: var(--m-size); display: inline-grid; place-items: center; contain: layout paint; }\n.m-loading__spin, .m-loading__step { display: grid; place-items: center; width: 100%; height: 100%; }\n.m-loading__spin { animation: m-loading-turn 4666ms linear infinite; }\n.m-loading__step { animation: m-loading-step 2600ms linear infinite; }\n.m-loading__shape { width: 79.17%; height: 79.17%; background: var(--m-loading-color, var(--md-sys-color-primary, currentColor)); clip-path: var(--m-loading-rest); animation: m-loading-morph 4550ms linear infinite; }\n.m-loading.is-paused :is(.m-loading__spin, .m-loading__step, .m-loading__shape), .m-loading.is-still .m-loading__shape { animation-play-state: paused; }\n.m-loading--contained { border-radius: 50%; background: var(--md-sys-color-primary-container); } .m-loading--contained .m-loading__shape { background: var(--m-loading-color, var(--md-sys-color-on-primary-container)); }\n/* reduced motion where motion.css is not loaded (the panel windows that load only this file): no turn, the slow fade of a busy indicator */\n@media (prefers-reduced-motion: reduce) {\n  html:not([data-motion='full']) :is(.m-loading__spin, .m-loading__step) { animation: none; }\n  html:not([data-motion='full']) .m-loading__shape { animation: m-loading-busy 2s ease-in-out infinite; }\n}\nhtml[data-motion='reduced'] :is(.m-loading__spin, .m-loading__step) { animation: none; }\nhtml[data-motion='reduced'] .m-loading__shape { animation: m-loading-busy 2s ease-in-out infinite; }\n@keyframes m-loading-busy { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }\n"
const pct = (ms, period) => `${+((100 * ms) / period).toFixed(3)}%`

export function loadingCss() {
  const T = morphSettleMs()
  const polys = loadingPolygons().map(toClipPath)
  const n = polys.length, morphPeriod = n * MORPH_INTERVAL_MS, stepPeriod = 4 * MORPH_INTERVAL_MS
  const shapeEase = springLinear(T, true), turnEase = springLinear(T, false)
  let css = `/* Generated by scripts/build-loading.mjs; do not edit. The loading indicator of LoadingIndicator.kt: ${n} shapes, a spring morph every ${MORPH_INTERVAL_MS} ms (settles in ${T} ms), +90deg per morph, one turn per ${GLOBAL_ROTATION_MS} ms. */\n`
  // components.css runs them: m-loading-turn ${GLOBAL_ROTATION_MS}ms, m-loading-step ${stepPeriod}ms, m-loading-morph ${morphPeriod}ms (test/loading.test.js checks the three agree)
  css += `:root { --m-loading-rest: ${polys[0]}; }\n`
  css += '@keyframes m-loading-morph {\n'
  for (let k = 0; k < n; k++) {
    const t0 = k * MORPH_INTERVAL_MS
    css += `  ${pct(t0, morphPeriod)} { clip-path: ${polys[k]}; animation-timing-function: ${shapeEase}; }\n`
    css += `  ${pct(t0 + T, morphPeriod)}${k === n - 1 ? ', 100%' : ''} { clip-path: ${polys[(k + 1) % n]}; animation-timing-function: linear; }\n` // held until the next morph
  }
  css += '}\n@keyframes m-loading-step {\n'
  for (let k = 0; k < 4; k++) {
    const t0 = k * MORPH_INTERVAL_MS
    css += `  ${pct(t0, stepPeriod)} { transform: rotate(${k * 90}deg); animation-timing-function: ${turnEase}; }\n`
    css += `  ${pct(t0 + T, stepPeriod)}${k === 3 ? ', 100%' : ''} { transform: rotate(${(k + 1) * 90}deg); animation-timing-function: linear; }\n`
  }
  css += '}\n@keyframes m-loading-turn { to { transform: rotate(360deg); } }\n'
  css += COMPONENT
  return css
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = loadingCss()
  fs.writeFileSync(path.join(here, '../src/css/loading.css'), css)
  console.log('loading.css', css.length, 'bytes, morph settles in', morphSettleMs(), 'ms')
}
