import test from 'node:test'
import assert from 'node:assert/strict'
import { createQueuedCalls, createSerialCalls } from '../src/vue/queuedCalls.js'

// the keyboard repeats of a slider (rv-ui-tile-round F6): one request in flight, the last value always sent
const tick = () => new Promise((r) => setTimeout(r, 0))
const waitFor = async (fn) => { for (let i = 0; i < 200 && !fn(); i++) await tick(); return fn() }
const gate = () => { let resolve; const promise = new Promise((r) => { resolve = r }); return { promise, resolve } }

test('the repeats of one key: the first value goes out at once, the rest collapse into the last one, never two at a time', async () => {
  const seen = []
  let running = 0
  let peak = 0
  const first = gate()
  let hold = first
  const send = createQueuedCalls(async ({ value }) => { running += 1; peak = Math.max(peak, running); seen.push(value); const g = hold; hold = null; if (g) await g.promise; running -= 1 }, (a) => a.key)
  send({ key: 'ds5.gain', value: 1 })
  await waitFor(() => seen.length === 1)
  send({ key: 'ds5.gain', value: 2 })
  send({ key: 'ds5.gain', value: 3 })
  send({ key: 'ds5.gain', value: 4 })
  await tick()
  assert.deepEqual(seen, [1], 'the repeats of the running call wait')
  first.resolve()
  await waitFor(() => seen.length === 2)
  assert.deepEqual(seen, [1, 4], 'only the last value is sent')
  assert.equal(peak, 1, 'at most one request in flight')
})

test('two keys are two queues: they do not wait for each other; a call that fails still passes the last value on', async () => {
  const seen = []
  let running = 0
  let peak = 0
  const g1 = gate(); const g2 = gate()
  const holds = { a: g1, b: g2 }
  const send = createQueuedCalls(async ({ key, value }) => { running += 1; peak = Math.max(peak, running); seen.push([key, value]); const g = holds[key]; holds[key] = null; if (g) { await g.promise; if (value === 1) throw new Error('the host refused') } running -= 1 }, (a) => a.key)
  send({ key: 'a', value: 1 })
  send({ key: 'b', value: 9 })
  await waitFor(() => seen.length === 2)
  assert.equal(peak, 2, 'two different sliders post at the same time')
  g1.resolve(); g2.resolve()
  send({ key: 'a', value: 2 })
  await waitFor(() => seen.length === 3)
  assert.deepEqual(seen.at(-1), ['a', 2], 'the value after a failed call still goes out')
})

test('saves of different settings never overlap, run in order, and can be chained', async () => {
  const log = []
  let running = 0
  let peak = 0
  const save = createSerialCalls(async ({ key, value }) => { running += 1; peak = Math.max(peak, running); await new Promise((r) => setImmediate(r)); log.push(`${key}=${value}`); running -= 1 }, (a) => a.key)
  await Promise.all([save({ key: 'a', value: 1 }), save({ key: 'b', value: 2 }).then(() => save({ key: 'c', value: 3 }))])
  assert.equal(peak, 1)
  assert.deepEqual(log, ['a=1', 'b=2', 'c=3'])
})

test('a save still waiting takes the newest value of its setting, and a running one is not replaced', async () => {
  const log = []
  const save = createSerialCalls(async ({ key, value }) => { await new Promise((r) => setImmediate(r)); log.push(`${key}=${value}`) }, (a) => a.key)
  const first = save({ key: 'a', value: 1 })
  const waiting = save({ key: 'b', value: 1 })
  const same = save({ key: 'b', value: 2 })
  assert.equal(waiting, same)
  await Promise.all([first, same])
  await save({ key: 'a', value: 3 })
  assert.deepEqual(log, ['a=1', 'b=2', 'a=3'])
})

test('a failed save reaches its caller and the next save still runs', async () => {
  const save = createSerialCalls(async ({ key }) => { if (key === 'bad') throw new Error('no'); return key }, (a) => a.key)
  await assert.rejects(save({ key: 'bad' }))
  assert.equal(await save({ key: 'good' }), 'good')
})
