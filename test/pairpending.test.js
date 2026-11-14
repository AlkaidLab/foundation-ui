import test from 'node:test'
import assert from 'node:assert/strict'
import { createPairingPending } from '../src/vue/usePairingPending.js'

const req = (id, name, expires) => ({ id, device_name: name, started_at: 0, expires_at: expires })
// a host whose long poll answers when the test says so
function host() {
  const waiting = []
  const calls = []
  return {
    calls, waiting,
    api: {
      getJson: (path) => { calls.push(path); return new Promise((resolve, reject) => waiting.push({ resolve, reject })) },
      postJson: async (path, body) => { calls.push(`POST ${path} ${JSON.stringify(body)}`); return { status: body.pin === '1234' } },
      delete: async (path) => { calls.push(`DELETE ${path}`); return { status: true } },
    },
    answer: (body) => waiting.shift().resolve(body),
    fail: (e) => waiting.shift().reject(e),
  }
}
const flush = () => new Promise((r) => setTimeout(r, 5))

test('the prompt follows the host: a request arrives, the next poll waits for the generation after it, expired requests disappear', async () => {
  const h = host(); const arrived = []; let t = 1000 * 1000
  const p = createPairingPending({ hostApi: h.api, onArrive: (r) => arrived.push(r.map((x) => x.device_name)), now: () => t })
  p.start(); await flush()
  assert.equal(h.calls[0], '/api/pairing/pending?wait=25')
  h.answer({ pending: true, generation: 3, requests: [req('a', 'iPhone 15 Pro', 1300), req('b', 'Living Room', 1100)] }); await flush()
  assert.deepEqual(arrived, [['iPhone 15 Pro', 'Living Room']])
  assert.equal(h.calls[1], '/api/pairing/pending?wait=25&since=3')
  assert.equal(p.requests.value.length, 2)
  t = 1200 * 1000; p.state.list = [...p.state.list] // a second passes: the request that expired is not listed
  assert.deepEqual(p.requests.value.map((r) => r.id), ['a'])
  h.answer({ pending: true, generation: 4, requests: [req('a', 'iPhone 15 Pro', 1300), req('c', 'Steam Deck', 1300)] }); await flush()
  assert.deepEqual(arrived[1], ['Steam Deck'], 'only the new request is announced')
  p.stop()
})

test('a host without the API (404) leaves the prompt off; another failure waits and tries again', async () => {
  let h = host(); let p = createPairingPending({ hostApi: h.api }); p.start(); await flush()
  h.fail(Object.assign(new Error('x'), { status: 404 })); await flush()
  assert.equal(p.state.supported, false); assert.equal(p.state.running, false); assert.equal(h.calls.length, 1)
  h = host(); p = createPairingPending({ hostApi: h.api, backoffMs: 5 }); p.start(); await flush()
  h.fail(new Error('network')); await new Promise((r) => setTimeout(r, 30))
  assert.equal(h.calls.length, 2, 'asked again after the pause'); p.stop()
})

test('the PIN goes to the chosen request; a wrong PIN keeps the request; rejecting removes it', async () => {
  const h = host(); const p = createPairingPending({ hostApi: h.api, now: () => 0 }); p.start(); await flush()
  h.answer({ generation: 1, requests: [req('a', 'A', 99), req('b', 'B', 99)] }); await flush()
  assert.equal(await p.submit('b', 'abc'), false, 'not a PIN: nothing is sent')
  assert.equal(await p.submit('b', '0000', 'B'), false); assert.equal(p.requests.value.length, 2)
  assert.equal(await p.submit('b', '1234', 'B'), true)
  assert.ok(h.calls.some((c) => c === 'POST /api/pairing/pin {"pin":"1234","name":"B","id":"b"}'))
  assert.deepEqual(p.requests.value.map((r) => r.id), ['a'])
  await p.reject('a'); assert.equal(h.calls.at(-1), 'DELETE /api/pairing/pending/a'); assert.equal(p.requests.value.length, 0)
  p.stop()
})

test('a host that answers at once and brings nothing new is not asked in a tight loop', async () => {
  const calls = []
  let t = 0
  const hostApi = { getJson: async (path) => { calls.push(path); return { generation: 0, requests: [] } }, postJson: async () => ({}), delete: async () => ({}) }
  const p = createPairingPending({ hostApi, now: () => t, floorMs: 40, fastMs: 400 })
  p.start(); await new Promise((r) => setTimeout(r, 25))
  assert.equal(calls.length, 1, 'it waits for the floor before it asks again')
  await new Promise((r) => setTimeout(r, 60))
  assert.ok(calls.length >= 2 && calls.length <= 3, `asked again after the pause, not hundreds of times: ${calls.length}`)
  p.stop()
})

test('news that comes back at once is followed by the next poll at once', async () => {
  const calls = []
  let gen = 0
  const hostApi = { getJson: (path) => { calls.push(path); gen += 1; return calls.length > 5 ? new Promise(() => {}) : Promise.resolve({ generation: gen, requests: [] }) }, postJson: async () => ({}), delete: async () => ({}) }
  const p = createPairingPending({ hostApi, now: () => 0, floorMs: 500, fastMs: 400 })
  p.start(); await new Promise((r) => setTimeout(r, 30))
  assert.equal(calls.length, 6, 'a changing generation is not paused')
  p.stop()
})
