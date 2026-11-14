import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { createPairQr, STOP_GRACE_MS } from '../src/vue/usePairQr.js'

const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }
const make = (over = {}) => {
  const calls = { start: 0, poll: 0, cancel: 0, paired: 0 }
  const q = createPairQr({
    start: async () => { calls.start++; return { url: 'https://host/pair', pin: '1234', expires_in: 4 } },
    poll: async () => { calls.poll++; return { status: calls.poll >= (over.pairedAt || 99) ? 'paired' : 'waiting' } },
    cancel: async () => { calls.cancel++ },
    render: async (url) => `img:${url}`,
    onPaired: () => { calls.paired++ },
    ...over.api,
  })
  return { q, calls }
}

test('a code is created on begin, counts down, and expires; a code that cannot be renewed shows the refresh state and is not asked for again by itself', async () => {
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  try {
    let n = 0
    const { q, calls } = make({ api: { start: async () => { n++; if (n > 1) throw new Error('refused'); return { url: 'https://host/pair', pin: '1234', expires_in: 4 } } } })
    q.begin()
    assert.equal(q.view.state, 'loading')
    await settle()
    assert.equal(q.view.state, 'ready')
    assert.equal(q.view.image, 'img:https://host/pair')
    assert.equal(q.view.seconds, 4)
    mock.timers.tick(4000)
    await settle()
    assert.equal(q.view.state, 'expired')
    assert.equal(n, 2) // the one renewal inside the last seconds, refused
    mock.timers.tick(10000)
    assert.equal(n, 2)
  } finally { mock.timers.reset() }
})

test('stop gives the pairing window back after the grace and a code that arrives late is cancelled at once', async () => {
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  try {
    const { q, calls } = make()
    q.begin(); await settle()
    q.stop()
    assert.equal(calls.cancel, 0) // not yet: a card that is drawn again keeps the window
    mock.timers.tick(STOP_GRACE_MS + 1); await settle()
    assert.equal(q.view.state, 'idle'); assert.equal(q.view.image, ''); assert.equal(calls.cancel, 1)
    // stopped before the host answered
    const late = make()
    late.q.begin(); late.q.stop(); mock.timers.tick(STOP_GRACE_MS + 1); await settle()
    assert.equal(late.q.view.state, 'idle'); assert.equal(late.calls.cancel, 2) // once for stop() while loading, once for the window the late answer opened
  } finally { mock.timers.reset() }
})

test('a client that pairs ends the countdown', async () => {
  mock.timers.enable({ apis: ['setInterval'] })
  try {
    const { q, calls } = make({ pairedAt: 1 })
    q.begin(); await settle()
    mock.timers.tick(2000); await settle()
    assert.equal(q.view.state, 'paired'); assert.equal(calls.paired, 1)
  } finally { mock.timers.reset() }
})

test('a host that refuses shows the error state, not a stale code', async () => {
  const { q } = make({ api: { start: async () => { throw new Error('no') } } })
  q.begin(); await settle()
  assert.equal(q.view.state, 'error'); assert.equal(q.view.image, '')
})
