// The loading indicator of LoadingIndicator.kt (Compose Material3): IndeterminateIndicatorPolygons, MorphIntervalMillis 650, GlobalRotationDurationMillis 4666,
// a spring of damping 0.6 / stiffness 200 per morph with +90 degrees, 38 of 48 px; paused while not seen, at most six morphing at once.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LOADING_SEQUENCE, MORPH_INTERVAL_MS, GLOBAL_ROTATION_MS, loadingCss, loadingPolygons, morphSettleMs } from '../scripts/build-loading.mjs'
import { SHAPE_POINTS } from '../scripts/build-shapes.mjs'

const css = readFileSync(new URL('../src/css/loading.css', import.meta.url), 'utf8')
const vue = readFileSync(new URL('../src/vue/MLoading.vue', import.meta.url), 'utf8')
const frames = (name) => css.slice(css.indexOf(`@keyframes ${name} {`), css.indexOf('\n}', css.indexOf(`@keyframes ${name} {`)))

test('the sequence is the indeterminate one of LoadingIndicatorDefaults, in its order', () => {
  assert.deepEqual(LOADING_SEQUENCE, ['soft-burst', 'cookie-9-sided', 'pentagon', 'pill', 'sunny', 'cookie-4-sided', 'oval'])
  assert.equal(MORPH_INTERVAL_MS, 650)
  assert.equal(GLOBAL_ROTATION_MS, 4666)
})

test('a morph every 650 ms, settled before the next; seven morphs per cycle; four 90-degree steps; one turn in 4666 ms', () => {
  const T = morphSettleMs()
  assert.ok(T > 300 && T < MORPH_INTERVAL_MS, `${T}`)
  const morph = frames('m-loading-morph'), step = frames('m-loading-step')
  assert.equal((morph.match(/clip-path: polygon/g) || []).length, 14)
  assert.equal((step.match(/rotate\(/g) || []).length, 8)
  for (let k = 0; k < 7; k++) assert.ok(morph.includes(`${+((100 * k * 650) / 4550).toFixed(3)}% { clip-path`), `morph ${k}`)
  for (let k = 1; k <= 4; k++) assert.ok(step.includes(`rotate(${k * 90}deg)`))
  assert.match(css, /\.m-loading__spin \{ animation: m-loading-turn 4666ms linear infinite; \}/)
  assert.match(css, /\.m-loading__step \{ animation: m-loading-step 2600ms linear infinite; \}/)
  assert.match(css, /animation: m-loading-morph 4550ms linear infinite;/)
  assert.equal(css, loadingCss())
})

test('the shape stays inside the indicator as it turns, morphs point to point (96 points), 38 of 48 px', () => {
  for (const poly of loadingPolygons()) {
    assert.equal(poly.length, SHAPE_POINTS)
    for (const p of poly) assert.ok(Math.hypot(p.x - 0.5, p.y - 0.5) <= 0.5001)
  }
  assert.match(css, /\.m-loading__shape \{ width: 79\.17%; height: 79\.17%;[^}]*clip-path: var\(--m-loading-rest\)/)
  // the morph never overshoots the shape (Compose coerces the progress); the step turns on the raw spring (overshoot: the bounce)
  const easings = [...frames('m-loading-morph').matchAll(/linear\(([^)]*)\)/g)].map((m) => m[1].split(', ').map(Number))
  assert.ok(easings.length && easings.every((e) => Math.max(...e) <= 1))
  assert.ok([...frames('m-loading-step').matchAll(/linear\(([^)]*)\)/g)].some((m) => Math.max(...m[1].split(', ').map(Number)) > 1.05))
})

test('paused while not seen; beyond six seen indicators the shape holds still; reduced motion stops the turns', () => {
  assert.match(vue, /export const MAX_MORPHING = 6/)
  assert.match(vue, /useOnScreen\(el\)/)
  assert.match(css, /\.m-loading\.is-paused :is\(\.m-loading__spin, \.m-loading__step, \.m-loading__shape\), \.m-loading\.is-still \.m-loading__shape \{ animation-play-state: paused; \}/)
  const motion = readFileSync(new URL('../src/css/motion.css', import.meta.url), 'utf8')
  assert.equal((motion.match(/:is\(\.m-loading__spin, \.m-loading__step\) \{ animation: none !important; \}/g) || []).length, 2)
})
