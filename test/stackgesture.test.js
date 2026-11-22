// The gestures of a smart stack: touch direction lock, one wheel step per gesture, the page never loses a scroll it began
import test from 'node:test'
import assert from 'node:assert/strict'
import { createWheelGesture, rubber, swipeIntent, swipeVerdict, velocityOf, wheelPx, WHEEL_GAP_MS } from '../src/vue/stackGesture.js'

const wheel = (dy, dx = 0, mode = 0) => ({ deltaX: dx, deltaY: dy, deltaMode: mode })

test('touch: a vertical finger turns the stack when it can, hands the page its scroll at an end the page can still scroll past', () => {
  const both = { canTurn: () => true, pageCanScroll: () => true }
  assert.equal(swipeIntent(0, -3, both), '', 'under the slop nothing is decided')
  assert.equal(swipeIntent(2, -20, both), 'swipe', 'a vertical finger is the stack\'s')
  assert.equal(swipeIntent(30, -8, both), 'page', 'a sideways finger is the page\'s')
  assert.equal(swipeIntent(10, -10, both), 'page', 'a diagonal that is not clearly vertical is the page\'s')
  const lastMember = { canTurn: (d) => d < 0, pageCanScroll: () => true }
  assert.equal(swipeIntent(0, -30, lastMember), 'page', 'finger up on the last member: the stack cannot go on, the page scrolls')
  assert.equal(swipeIntent(0, 30, lastMember), 'swipe', 'finger down on the last member: back to the one before')
  const pageAtEnd = { canTurn: () => false, pageCanScroll: () => false }
  assert.equal(swipeIntent(0, -30, pageAtEnd), 'swipe', 'nothing to scroll: the stack takes it and rubber-bands')
})

test('a mouse or pen drag is never a page scroll; it waits for the slop and then is the stack\'s unless sideways', () => {
  const none = { canTurn: () => false, pageCanScroll: () => true, touch: false }
  assert.equal(swipeIntent(0, -3, none), '')
  assert.equal(swipeIntent(0, -20, none), 'swipe')
  assert.equal(swipeIntent(30, -4, none), '', 'a sideways mouse drag is nothing here')
})

test('release: past a third of the height, or a flick in the same direction, turns it; otherwise it springs back; an end never turns', () => {
  const can = { canTurn: () => true }
  assert.equal(swipeVerdict(-100, 0, 300, can), 1)
  assert.equal(swipeVerdict(100, 0, 300, can), -1)
  assert.equal(swipeVerdict(-40, 0, 300, can), 0)
  assert.equal(swipeVerdict(-40, -0.9, 300, can), 1, 'a quick flick turns it')
  assert.equal(swipeVerdict(-40, 0.9, 300, can), 0, 'a flick back the other way does not')
  assert.equal(swipeVerdict(-200, -1, 300, { canTurn: () => false }), 0)
  assert.equal(swipeVerdict(0, 0, 300, can), 0)
})

test('rubber band: monotonic, bounded by max, zero at rest', () => {
  assert.equal(rubber(0, 100), 0)
  let last = 0
  for (const y of [10, 40, 120, 400, 4000]) { const r = rubber(y, 100); assert.ok(r > last && r < 100, `${y} -> ${r}`); last = r }
  assert.equal(rubber(-50, 100), -rubber(50, 100))
})

test('velocity from the last 100 ms of samples', () => {
  assert.equal(velocityOf([], 1000), 0)
  assert.equal(velocityOf([{ t: 800, y: 0 }, { t: 990, y: -500 }], 1000), 0, 'samples older than 100 ms are not speed now')
  const v = velocityOf([{ t: 920, y: 0 }, { t: 960, y: -20 }, { t: 1000, y: -40 }], 1000)
  assert.ok(Math.abs(v - -0.5) < 1e-9)
})

test('wheel: a gesture that begins over the stack after a quiet moment steps once; the rest of the gesture (momentum) does nothing but is held', () => {
  const g = createWheelGesture()
  const can = () => true
  let t = 1000
  const first = g.handle(wheel(30), t, t - 500, can)
  assert.deepEqual(first, { own: true, step: 1 })
  for (let i = 0; i < 20; i++) { t += 16; const r = g.handle(wheel(60 - i * 3), t, t - 16, can); assert.deepEqual(r, { own: true, step: 0 }, `event ${i}`) }
  // after a pause the next gesture is a new step, the other way
  t += WHEEL_GAP_MS + 10
  assert.deepEqual(g.handle(wheel(-120), t, t - (WHEEL_GAP_MS + 10), can), { own: true, step: -1 })
})

test('wheel: tiny first events are held until the gesture carries enough, a mouse wheel notch steps at once, lines are pixels', () => {
  const g = createWheelGesture()
  assert.deepEqual(g.handle(wheel(2), 100, -1000, () => true), { own: true, step: 0 })
  assert.deepEqual(g.handle(wheel(3), 116, 100, () => true), { own: true, step: 0 })
  assert.deepEqual(g.handle(wheel(30), 132, 116, () => true), { own: true, step: 1 })
  const m = createWheelGesture()
  assert.deepEqual(m.handle(wheel(3, 0, 1), 5000, -1000, () => true), { own: true, step: 1 }, '3 lines = 48 px')
  assert.deepEqual(wheelPx(wheel(1, 0, 2), 700), { x: 0, y: 700 })
})

test('wheel: a gesture that was already running when the pointer came onto the stack belongs to the page, and so does one the stack cannot step', () => {
  const g = createWheelGesture()
  assert.deepEqual(g.handle(wheel(40), 1000, 990, () => true), { own: false, step: 0 }, 'wheel events came 10 ms earlier elsewhere: page scroll in progress')
  assert.deepEqual(g.handle(wheel(40), 1016, 1000, () => true), { own: false, step: 0 })
  const end = createWheelGesture()
  assert.deepEqual(end.handle(wheel(40), 5000, 1000, (d) => d < 0), { own: false, step: 0 }, 'last member, wheel down: the page scrolls')
  assert.deepEqual(end.handle(wheel(40), 5016, 5000, (d) => d < 0), { own: false, step: 0 }, 'and keeps it for the rest of the gesture')
  assert.deepEqual(end.handle(wheel(-40), 5400, 5016, (d) => d < 0), { own: true, step: -1 }, 'a new gesture the other way steps back')
})
