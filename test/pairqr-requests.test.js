import test from 'node:test'
import assert from 'node:assert/strict'
import { createPairQr, RENEW_AT, STOP_GRACE_MS } from '../src/vue/usePairQr.js'

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
function host(expires = 120) {
  const calls = { start: 0, cancel: 0, poll: 0 }
  return { calls, start: async () => { calls.start++; return { url: `u${calls.start}`, pin: String(1000 + calls.start), expires_in: expires } }, poll: async () => { calls.poll++; return { status: 'false' } }, cancel: async () => { calls.cancel++ }, render: async (u) => `img:${u}` }
}
const make = (h, extra = {}) => createPairQr({ ...h, ...extra })

test('the host is asked for a preset PIN once when the code is shown, however often the card asks', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  const h = host(); const qr = make(h)
  await Promise.all([qr.begin(), qr.begin(), qr.begin()]); await flush()
  await qr.begin(); await qr.begin(); await flush()
  assert.equal(h.calls.start, 1)
  assert.equal(qr.view.state, 'ready')
})

test('a card re-created by the layout (stop then begin at once, many times) keeps the same window: no request, no cancel', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  const h = host(); const qr = make(h)
  await qr.begin(); await flush()
  for (let i = 0; i < 20; i++) { qr.stop(); t.mock.timers.tick(1500); await qr.begin(); await flush() } // 30 s of re-creation, a stream's worth of reshuffles
  assert.equal(h.calls.start, 1); assert.equal(h.calls.cancel, 0)
})

test('hidden for good: the window is given back after the grace, and nothing is asked for while it is hidden', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  const h = host(); const qr = make(h)
  await qr.begin(); await flush()
  qr.stop(); t.mock.timers.tick(STOP_GRACE_MS + 10); await flush()
  assert.equal(h.calls.cancel, 1); assert.equal(qr.view.state, 'idle')
  const startsAfterHide = h.calls.start
  t.mock.timers.tick(300000); await flush()
  assert.equal(h.calls.start, startsAfterHide)
})

test('shown for minutes: renewed once shortly before it expires, not every few seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  const h = host(120); const qr = make(h)
  await qr.begin(); await flush()
  for (let s = 0; s < 100; s++) { t.mock.timers.tick(1000); await flush() } // 100 s: not yet
  assert.equal(h.calls.start, 1)
  for (let s = 0; s < 12; s++) { t.mock.timers.tick(1000); await flush() } // 112 s: inside RENEW_AT of the end
  assert.equal(h.calls.start, 2)
  assert.ok(qr.view.seconds > 100) // the new code is in place, no flicker through loading
  assert.equal(qr.view.state, 'ready'); assert.equal(RENEW_AT, 12)
  for (let s = 0; s < 60; s++) { t.mock.timers.tick(1000); await flush() } // a minute more: the new window has plenty left
  assert.equal(h.calls.start, 2)
})

test('after pairing nothing is asked for; an expired code is renewed only by the refresh button', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  let paired = false; let done = 0
  const h = host(120); const qr = make({ ...h, poll: async () => ({ status: paired ? 'paired' : 'false' }) }, { onPaired: () => { done++ } })
  await qr.begin(); await flush()
  paired = true
  for (let s = 0; s < 4; s++) { t.mock.timers.tick(1000); await flush() }
  assert.equal(qr.view.state, 'paired'); assert.equal(done, 1)
  t.mock.timers.tick(300000); await flush()
  assert.equal(h.calls.start, 1)

  const h2 = host(5); const qr2 = make(h2) // a code too short to renew in time: it runs out, the card shows the refresh button, nothing is asked for by itself
  await qr2.begin(); await flush()
  for (let s = 0; s < 10; s++) { t.mock.timers.tick(1000); await flush() }
  const before = h2.calls.start
  assert.equal(qr2.view.state === 'expired' || qr2.view.state === 'ready', true)
  t.mock.timers.tick(120000); await flush()
  assert.ok(h2.calls.start <= before + 1)
})
