import test from 'node:test'
import assert from 'node:assert/strict'

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m } }
globalThis.localStorage = memory()
const { TAPS_NEEDED, tapOnVersion, useDeveloperMode, usableSource } = await import('../src/vue/useDeveloperMode.js')

test('seven taps turn developer mode on, with the number left on the way; it is remembered and can be turned off', () => {
  const dev = useDeveloperMode()
  assert.equal(TAPS_NEEDED, 7); assert.equal(dev.enabled.value, false)
  const left = []
  for (let i = 0; i < 6; i++) left.push(tapOnVersion().remaining)
  assert.deepEqual(left, [6, 5, 4, 3, 2, 1]); assert.equal(dev.enabled.value, false)
  assert.deepEqual(tapOnVersion(), { enabled: true, remaining: 0 })
  assert.equal(dev.enabled.value, true); assert.equal(globalThis.localStorage.getItem('foundation-ui.dev'), '1')
  assert.deepEqual(tapOnVersion(), { enabled: true, remaining: 0 }, 'already on')
  assert.equal(dev.setSource('http://127.0.0.1:18095/announcements.json'), true)
  assert.equal(globalThis.localStorage.getItem('foundation-ui.announcements.source'), 'http://127.0.0.1:18095/announcements.json')
  dev.disable()
  assert.equal(dev.enabled.value, false); assert.equal(globalThis.localStorage.getItem('foundation-ui.dev'), null); assert.equal(globalThis.localStorage.getItem('foundation-ui.announcements.source'), null)
})

test('the announcement source is a local address or https: plain http only to this computer, no credentials, query or fragment', () => {
  assert.equal(usableSource(''), '')
  assert.equal(usableSource('http://localhost:8080/a.json'), 'http://localhost:8080/a.json')
  assert.equal(usableSource('https://example.org/a.json'), 'https://example.org/a.json')
  for (const bad of ['http://example.org/a.json', 'ftp://127.0.0.1/a', 'http://u:p@127.0.0.1/a', 'http://127.0.0.1/a?x=1', 'nonsense']) assert.equal(usableSource(bad), null, bad)
})
