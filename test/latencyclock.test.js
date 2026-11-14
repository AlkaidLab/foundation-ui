import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createClock, formatClock, sweepOf, frameStats, deltaRing, latencyClockTexts } from '../src/latency/index.js'

// the latency test clock (toolbox, 延迟测试时钟)

test('the clock reads HH:MM:SS.mmm in local time, always 12 characters', () => {
  const at = new Date(2026, 10, 4, 9, 5, 7, 42).getTime()
  assert.equal(formatClock(at), '09:05:07.042')
  assert.equal(formatClock(at + 0.9), '09:05:07.042')
  assert.equal(formatClock(new Date(2026, 10, 4, 23, 59, 59, 999).getTime()), '23:59:59.999')
  for (const ms of [0, 1, 999, 86399999, Date.now()]) assert.equal(formatClock(ms).length, 12)
})

test('the clock advances by performance.now() from one Date.now() anchor: it never steps back when the system clock is set, and resync takes a new anchor', () => {
  let wall = 1_000_000, mono = 50
  const c = createClock({ now: () => wall, perf: () => mono })
  assert.equal(c.read(), 1_000_000)
  mono += 16.7; assert.equal(c.read(), 1_000_016.7)
  wall -= 5000 // the system clock is set back
  mono += 16.7; assert.ok(c.read() > 1_000_016.7, 'monotonic across a clock change')
  assert.equal(Math.round(c.drift()), 5033)
  c.resync(); assert.equal(c.read(), wall)
})

test('the sweep is the share of the second', () => {
  assert.equal(sweepOf(1000), 0)
  assert.equal(sweepOf(1500), 0.5)
  assert.equal(sweepOf(1999.9), 0.999)
})

test('the refresh rate and the frame interval come from the median of the frame intervals; a hitch is left out', () => {
  assert.equal(frameStats([16.7, 16.6]), null)
  const sixty = Array.from({ length: 60 }, (_, i) => (i % 2 ? 16.6 : 16.8))
  assert.deepEqual(frameStats([...sixty, 400, 800]), { hz: 59.9, interval: 16.7 })
  assert.deepEqual(frameStats(Array.from({ length: 30 }, () => 1000 / 144)), { hz: 144, interval: 6.9 })
  const r = deltaRing(4); for (const x of [1, 2, 3, 4, 5]) r.push(x)
  assert.deepEqual(r.values().sort(), [2, 3, 4, 5])
})

test('the text: Chinese and English, three steps, the formula host − client', () => {
  for (const l of ['zh', 'en']) { const t = latencyClockTexts(l); assert.equal(t.steps.length, 3); assert.match(t.steps[2], /−/) }
  assert.equal(latencyClockTexts('zh').fullscreenStream, '在串流显示器上全屏打开')
  assert.equal(latencyClockTexts('de').title, 'Latency test clock')
})

test('the face changes nothing but text and transform: tabular figures, no transition or animation, opaque pure colours', () => {
  const css = fs.readFileSync(new URL('../src/css/latency.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  assert.match(css, /\.m-lclock__time \{[^}]*tabular-nums/)
  assert.doesNotMatch(css, /transition|animation|backdrop-filter|blur\(|opacity/)
  assert.match(css, /is-dark \{ background: #000; color: #fff; \}/)
  assert.match(css, /is-light \{ background: #fff; color: #000; \}/)
  const vue = fs.readFileSync(new URL('../src/vue/MLatencyClock.vue', import.meta.url), 'utf8')
  assert.match(vue, /requestAnimationFrame\(tick\)/)
  for (const r of ['time', 'mark', 'frames', 'hz', 'interval']) assert.match(vue, new RegExp(`v-once ref="${r}"`), `${r} is written by tick() only`)
  assert.match(fs.readFileSync(new URL('../src/css/all.css', import.meta.url), 'utf8'), /latency\.css/)
})
