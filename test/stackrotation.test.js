// WHEN a smart stack may change: only after the page was away and is shown again, or after a long idle; never while the person uses the page (D3, 11-09)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AWAY_MS, IDLE_MS, SETTLE_MS, createPresence, createRotationDriver } from '../src/vue/stackRotation.js'
import { createStack, rotationPick, setFlags, setRotate } from '../src/vue/stackModel.js'
import { readDash } from './dashSource.js'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const MIN = 60_000

// a clock, a timer queue and an overview of one stack, driven the way dash/dashGrid.js drives them
function rig({ stackFlags = {}, rotate = true } = {}) {
  let t = 1_000_000_000_000; const timers = []
  let state = createStack({ stacks: {}, next: 1, rotate }, 'recent-games', 'bitrate', 's').state
  state = setFlags(state, 'stack:1', { ...stackFlags }); state.stacks['stack:1'].members = ['recent-games', 'bitrate']; state.stacks['stack:1'].active = 0
  const log = []; let changedAt = 0; let holding = false; let signals = { pairedCount: 2 }
  const run = () => {
    const i = rotationPick(state.stacks['stack:1'], signals, { now: t, hour: 13, lastChangeAt: changedAt, holding, enabled: state.rotate })
    if (i >= 0) { state.stacks['stack:1'].active = i; changedAt = t; log.push(t) }
  }
  const driver = createRotationDriver({ now: () => t, run, schedule: (f, ms) => { const h = { f, at: t + ms }; timers.push(h); return h }, cancel: (h) => { const k = timers.indexOf(h); if (k >= 0) timers.splice(k, 1) } })
  const advance = (ms) => { t += ms; for (const h of [...timers].filter((x) => x.at <= t)) { timers.splice(timers.indexOf(h), 1); h.f() } }
  return { driver, advance, log, state, setSignals: (s) => { signals = s }, hold: (v) => { holding = v }, changedBy: (at) => { changedAt = at - 0 }, now: () => t, stack: () => state.stacks['stack:1'] }
}

test('while the page is in use nothing turns: not in three hours, not when the host starts streaming, not with the host busy', () => {
  const r = rig()
  r.setSignals({ pairedCount: 2, streaming: true })
  for (let i = 0; i < 180; i++) { r.driver.activity(); r.advance(MIN); r.driver.tick() }
  assert.deepEqual(r.log, []); assert.equal(r.stack().active, 0)
  r.driver.show() // a focus event on a page that never left is not a re-show
  r.advance(10_000); assert.deepEqual(r.log, [])
})

test('the page was away for 15 minutes and comes back: the stack turns once, after the signals settled; a shorter glance away changes nothing', () => {
  const r = rig(); r.setSignals({ pairedCount: 2, streaming: true })
  r.driver.hide(); r.advance(AWAY_MS - MIN); r.driver.show(); r.advance(SETTLE_MS + 10)
  assert.deepEqual(r.log, [], '14 minutes away is a glance')
  r.driver.hide(); r.advance(AWAY_MS); r.driver.show()
  assert.deepEqual(r.log, [], 'not at the moment of coming back: the host\'s signals are fetched again first')
  r.advance(SETTLE_MS + 10)
  assert.equal(r.log.length, 1); assert.equal(r.stack().active, 1, 'the bitrate tile, a stream is running')
  r.driver.hide(); r.advance(2 * AWAY_MS); r.driver.show(); r.advance(SETTLE_MS + 10)
  assert.equal(r.log.length, 1, 'the member shown is the one that matters already: nothing to turn')
})

test('a person who turns the stack by hand in the moment after coming back keeps their choice: a change within 15 minutes of the last one (by hand too) is refused', () => {
  const r = rig(); r.setSignals({ pairedCount: 2, streaming: true })
  r.driver.hide(); r.advance(AWAY_MS); r.driver.show(); r.advance(500)
  r.changedBy(r.now()) // the person swiped to the first tile while the page was settling
  r.advance(SETTLE_MS)
  assert.deepEqual(r.log, [])
})

test('after 30 minutes without input the stack turns once; an hour of idle is the same stretch; any input starts the count again', () => {
  const r = rig(); r.setSignals({ pairedCount: 2, streaming: true })
  assert.equal(IDLE_MS, 30 * MIN)
  r.advance(29 * MIN); r.driver.tick(); assert.deepEqual(r.log, [])
  r.driver.activity(); r.advance(29 * MIN); r.driver.tick(); assert.deepEqual(r.log, [], 'input reset the count')
  r.advance(2 * MIN); r.driver.tick(); assert.equal(r.log.length, 1)
  r.advance(60 * MIN); r.driver.tick(); assert.equal(r.log.length, 1)
})

test('pinned, held by the pointer or the focus, or switched off for all stacks: it does not turn', () => {
  for (const [what, make, patch] of [['pinned', () => rig({ stackFlags: { smartRotate: false } })], ['all off', () => rig({ rotate: false })], ['held', () => { const r = rig(); r.hold(true); return r }]]) {
    const r = make(); r.setSignals({ pairedCount: 2, streaming: true })
    r.driver.hide(); r.advance(3 * AWAY_MS); r.driver.show(); r.advance(SETTLE_MS + 10); r.driver.tick()
    r.advance(2 * IDLE_MS); r.driver.tick()
    assert.deepEqual(r.log, [], what)
  }
})

test('coming back to the overview from another page counts as a re-show; a quick look at another page does not', () => {
  const r = rig(); r.setSignals({ pairedCount: 2, streaming: true })
  r.driver.returned(2 * MIN); r.advance(SETTLE_MS + 10); assert.deepEqual(r.log, [])
  r.driver.returned(20 * MIN); r.advance(SETTLE_MS + 10); assert.equal(r.log.length, 1)
})

test('the presence: hide keeps the first moment, show says whether it was long enough', () => {
  let t = 0; const p = createPresence({ now: () => t })
  p.hide(); t += 10 * MIN; p.hide(); t += 5 * MIN
  assert.equal(p.show(), true); assert.equal(p.show(), false, 'a second show has no hide behind it')
})

test('in the overview: no timer and no change of the plan turns a stack; the driver, the hold of the pointer and the focus, the edit mode and the switch are the only gates', () => {
  const d = readDash()
  assert.doesNotMatch(d, /setInterval\(rotateStacks/); assert.doesNotMatch(d, /watch\(planSnap, \(\) => \{ if \(stacksOn\) rotateStacks/)
  assert.match(d, /if \(!stacksOn \|\| edit\.value \|\| !stacks\.state\.rotate\) return/)
  assert.match(d, /document\.addEventListener\('visibilitychange', onVisibility\)/); assert.match(d, /window\.addEventListener\('blur', onAway\); window\.addEventListener\('focus', onBack\)/)
  assert.match(d, /holding: holding\(id\)/); assert.match(d, /holds\.has\(`\$\{id\}\|pointer`\) \|\| holds\.has\(`\$\{id\}\|focus`\)/)
  assert.match(d, /signals = \{ \.\.\.\(D\.props\.ctx\?\.signals \|\| \{\}\) \}/, 'the live signals, not the plan\'s snapshot')
  assert.match(d, /driver\.returned\(Date\.now\(\) - awayMark\.leftAt\)/)
  assert.match(d, /@flags="onStackFlags"/); assert.match(d, /data-stack-rotate/)
})

test('the stack: the dots are buttons, the pin turns rotation off, the keys, the focus holds; a turn by the host is a crossfade, reduced motion has none', () => {
  const v = read('src/vue/MDashStack.vue'); const css = read('src/css/stack.css')
  assert.match(v, /<button v-for="\(m, i\) in members" :key="m\.id" type="button" class="m-dstack__dot"/); assert.match(v, /@click\.stop="pick\(i\)"/)
  assert.match(v, /data-stack-pin :aria-pressed="pinned"/); assert.match(v, /emit\('flags', \{ id: props\.card\.id, patch: \{ smartRotate: !on \} \}\)/)
  assert.match(v, /@focusin="focusIn" @focusout="focusOut"/)
  assert.match(v, /e\.key === 'ArrowRight'/); assert.match(v, /e\.key === 'ArrowLeft'/); assert.match(v, /e\.key === 'Home'/)
  assert.match(v, /:name="fade \? 'm-dstack-fade'/); assert.match(v, /fade\.value = !byHand/)
  assert.match(css, /\.m-dstack-fade-enter-active \{ transition: opacity 240ms linear/)
  assert.match(css, /prefers-reduced-motion: reduce\) \{[^\n]*m-dstack-fade-leave-active\) \{ transition: none; \}/); assert.match(css, /html\[data-motion='reduced'\] \.m-dstack-fade-enter-active[^\n]*\{ transition: none; \}/)
  assert.doesNotMatch(css, /transition: opacity 120ms linear/, 'no fade left for reduced motion')
})

test('stack.css is whole: every block is closed, no rule of a removed control is left', () => {
  const css = read('src/css/stack.css').replace(/\/\*[\s\S]*?\*\//g, '')
  assert.equal(css.split('{').length, css.split('}').length)
  assert.doesNotMatch(css, /chev/)
  assert.doesNotMatch(css, /@media[^{\n]*\{\s*$/m, 'no media block is open at the end of a line')
})
