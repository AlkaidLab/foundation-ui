// The spring tokens: their cubic-bezier() stand-ins for engines without linear(), and springs.css (the tokens alone, for the panel windows without tokens.css).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SPRINGS, SPRING_FALLBACKS, springValue, settleSeconds } from '../src/tokens/motion.js'

const tokens = readFileSync(new URL('../src/tokens/tokens.css', import.meta.url), 'utf8')
const springs = readFileSync(new URL('../src/tokens/springs.css', import.meta.url), 'utf8')
const bezier = (x1, y1, x2, y2) => (x) => {
  let lo = 0, hi = 1
  for (let i = 0; i < 40; i++) { const t = (lo + hi) / 2; if (3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3 < x) lo = t; else hi = t }
  const t = (lo + hi) / 2
  return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3
}

test('each fallback cubic-bezier follows its spring within 0.06, and an effects curve never passes 1', () => {
  assert.deepEqual(Object.keys(SPRING_FALLBACKS), Object.keys(SPRINGS))
  for (const [name, spring] of Object.entries(SPRINGS)) {
    const f = bezier(...SPRING_FALLBACKS[name].match(/[\d.]+/g).map(Number))
    const T = settleSeconds(spring)
    let worst = 0, peak = 0
    for (let i = 0; i <= 100; i++) { const x = i / 100, y = f(x); worst = Math.max(worst, Math.abs(y - springValue(spring, x * T))); peak = Math.max(peak, y) }
    assert.ok(worst < 0.06, `${name} ${worst}`)
    if (name.endsWith('Effects')) assert.ok(peak <= 1.0001, `${name} overshoots ${peak}`)
  }
})

test('tokens.css and springs.css replace linear() by the fallbacks where it is not supported', () => {
  for (const css of [tokens, springs]) {
    const block = css.slice(css.indexOf('@supports not (transition-timing-function: linear(0, 1))'))
    assert.ok(block.length > 0)
    for (const curve of Object.values(SPRING_FALLBACKS)) assert.ok(block.includes(curve))
  }
})

test('springs.css has the springs of tokens.css, and no spring transition under reduced motion', () => {
  const values = (css) => Object.fromEntries([...css.slice(0, css.indexOf('@supports')).matchAll(/(--m-spring-[a-z-]+): ([^;]+);/g)].map((m) => [m[1], m[2]]))
  const t = values(tokens), s = values(springs)
  assert.equal(Object.keys(s).length, 12)
  for (const [k, v] of Object.entries(s)) assert.equal(t[k], v, k)
  const reduced = springs.slice(springs.indexOf('@media (prefers-reduced-motion: reduce)'))
  for (const k of Object.keys(s).filter((k) => k.endsWith('-duration'))) assert.match(reduced, new RegExp(`${k}: 0s;`))
})
