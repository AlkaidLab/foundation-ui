// The linear wavy progress under the progress sources of a download: a fast jump, a long stall, a step back, a restart from another source, an unknown size, and the finish.
// The drawing rules are pure (src/vue/waveProgress.js); the CSS is read as text for what must never be drawn (a track behind the wave).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DONE_AT, FADE_OUT_MS, createShown, isDone, isFlat } from '../src/vue/waveProgress.js'

const css = readFileSync(new URL('../src/css/expressive.css', import.meta.url), 'utf8')
const vue = readFileSync(new URL('../src/vue/MProgress.vue', import.meta.url), 'utf8')

/** A scheduler that runs what is due when the clock is moved; "frames" (ms 0) run at the next tick. */
function clock() {
  const queue = []
  let now = 0
  return { schedule: (fn, ms) => queue.push({ at: now + (ms || 1), fn }), tick(ms) { now += ms; for (const q of queue.filter((x) => x.at <= now)) { queue.splice(queue.indexOf(q), 1); q.fn() } } }
}
const run = (initial) => { const c = clock(); const seen = []; const s = createShown(initial, (v) => seen.push(v), c.schedule); return { c, s, seen } }

test('the amplitude rule of Compose: no wave at 10 % and below and at 95 % and above, the full wave between', () => {
  for (const v of [0, 0.05, 0.1, 0.95, 0.99, 1]) assert.equal(isFlat(v), true, String(v))
  for (const v of [0.11, 0.5, 0.94]) assert.equal(isFlat(v), false, String(v))
})

test('the track and the stop dot are gone when the bar is finished', () => {
  assert.equal(isDone(DONE_AT - 0.001), false)
  assert.equal(isDone(1), true)
})

test('a jump from 0 to 100 % in one step is drawn at once (the width transition eases it), no value in between is invented', () => {
  const { s, seen } = run(0)
  s.feed(0.03); s.feed(1)
  assert.deepEqual(seen, [0.03, 1])
})

test('a stall draws nothing; a step back is drawn as a step back', () => {
  const { c, s, seen } = run(0.4)
  s.feed(0.4); c.tick(3000); s.feed(0.4)
  assert.deepEqual(seen, [])
  s.feed(0.12)
  assert.deepEqual(seen, [0.12])
})

test('waiting for a new source after 70 %: the bar goes back to no progress unseen, then moves from 0 to the new value', () => {
  const { c, s, seen } = run(0.7)
  s.feed(null)                 // retrying / connecting: the determinate parts fade out
  assert.deepEqual(seen, [], 'nothing changes while they fade')
  c.tick(FADE_OUT_MS)
  assert.deepEqual(seen, [0], 'back to no progress behind the faded parts')
  c.tick(1500)
  s.feed(0.02)
  assert.deepEqual(seen, [0], 'the new value is not drawn in the same frame')
  c.tick(2)
  assert.deepEqual(seen, [0, 0.02], 'it starts from 0 and moves to the value')
})

test('a value that arrives before the fade is over still starts from no progress', () => {
  const { c, s, seen } = run(0.7)
  s.feed(null); c.tick(50); s.feed(0.05)
  assert.deepEqual(seen, [0])
  c.tick(2)
  assert.deepEqual(seen, [0, 0.05])
  c.tick(FADE_OUT_MS * 2)
  assert.deepEqual(seen, [0, 0.05], 'the cancelled fade-out does not reset the bar later')
})

test('an unknown size (waiting) and then the first number; waiting again resets once, not on every repeat', () => {
  const { c, s, seen } = run(null)
  s.feed(null); c.tick(FADE_OUT_MS)
  assert.deepEqual(seen, [], 'already at 0')
  s.feed(0); c.tick(2)
  assert.deepEqual(seen, [])
})

test('the finish: 99 % (verifying) then 100 % (complete) are drawn in order; the bar is flat and without track at both', () => {
  const { s, seen } = run(0.5)
  s.feed(0.99); s.feed(1)
  assert.deepEqual(seen, [0.99, 1])
  assert.equal(isFlat(0.99) && isDone(0.99), true)
})

test('waiting: the track is drawn only where the wave is not (the group is [track | gap | wave | gap | track], one body)', () => {
  const group = css.slice(css.indexOf('.m-wave__group'), css.indexOf('@keyframes m-wave-travel'))
  assert.match(group, /\.m-wave__tl \{ left: -100%; width: calc\(100% - 6px\); \}/, 'the left piece ends 6 px before the wave')
  assert.match(group, /\.m-wave__tr \{ left: calc\(38% \+ 6px\); width: 100%; \}/, 'the right piece starts 6 px after the wave')
  assert.match(group, /\.m-wave__seg \{[^}]*width: 38%/)
  assert.match(css, /@keyframes m-wave-travel \{ from \{ transform: translateX\(-38%\); \} to \{ transform: translateX\(100%\); \} \}/, 'from all track on the right to all track on the left')
  // the determinate parts do not stay under the waiting wave
  assert.match(css, /\.m-wave--indeterminate \.m-wave__active, \.m-wave--indeterminate \.m-wave__track, \.m-wave--indeterminate \.m-wave__stop \{ opacity: 0;/)
  assert.doesNotMatch(css, /m-wave__track--run|m-wave__active--run/, 'no full-width track under a sliding wave any more')
})

test('the markup keeps one set of elements for both states (no element swap that flashes), and the wave and the flat bar are two layers', () => {
  assert.doesNotMatch(vue, /v-if="p != null" class="m-wave__(active|track)"|class="m-wave__active m-wave__active--run"/)
  assert.match(vue, /<span class="m-wave__active"[^>]*><i \/><em class="m-wave__flat" \/><\/span>/)
  assert.match(vue, /m-wave__run/)
})
