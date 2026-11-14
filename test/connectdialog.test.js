import test from 'node:test'
import assert from 'node:assert/strict'
import { useConnectDialog } from '../src/vue/useConnectDialog.js'
import { connectTexts } from '../src/clients/recommend.js'

const run = async (answer, { rejects = false, pin = '0000' } = {}) => {
  const notices = []
  const dialog = useConnectDialog({
    hostApi: { postJson: async () => { if (rejects) throw answer; return answer }, getJson: async () => ({}) },
    say: (...args) => notices.push(args),
  })
  const result = await dialog.pairPin(pin)
  return { result, notices }
}
const httpError = (status, message = `HTTP ${status}`) => Object.assign(new Error(message), { status })

test('the host answer for a wrong PIN ({ status: "false" }, no error field) is the incorrect reason', async () => {
  const { result, notices } = await run({ status: 'false' })
  assert.equal(result, false)
  assert.deepEqual(notices, [['failed', 'incorrect']])
})

test('a paired answer says sent without a reason', async () => {
  const { result, notices } = await run({ status: 'true' })
  assert.equal(result, true)
  assert.deepEqual(notices, [['sent', undefined]])
})

test('the proxy and fetch failures keep their own reason', async () => {
  assert.deepEqual((await run(httpError(503), { rejects: true })).notices, [['failed', 'not-ready']])
  assert.deepEqual((await run(httpError(504), { rejects: true })).notices, [['failed', 'timeout']])
  assert.deepEqual((await run(httpError(502), { rejects: true })).notices, [['failed', 'network']])
  assert.deepEqual((await run(new TypeError('Failed to fetch'), { rejects: true })).notices, [['failed', 'network']])
  assert.deepEqual((await run(httpError(401), { rejects: true })).notices, [['failed', undefined]])
})

test('a request that never answers ends as a timeout', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const notices = []
  const dialog = useConnectDialog({ hostApi: { postJson: () => new Promise(() => {}), getJson: async () => ({}) }, say: (...args) => notices.push(args) })
  const pending = dialog.pairPin('0000')
  t.mock.timers.tick(10000)
  assert.equal(await pending, false)
  assert.deepEqual(notices, [['failed', 'timeout']])
})

test('every dialog language has short text for each PIN failure reason', () => {
  for (const locale of ['zh', 'en']) {
    const text = connectTexts(locale)
    for (const key of ['pinIncorrect', 'pinTimeout', 'pinNetwork', 'pinNotReady']) assert.ok(text[key] && text[key] !== text.pinFailed, `${locale}.${key}`)
  }
})

test('a pairing the host finishes after the timeout is reported as sent', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const notices = []
  let finish
  const dialog = useConnectDialog({ hostApi: { postJson: () => new Promise((resolve) => { finish = resolve }), getJson: async () => ({}) }, say: (kind, reason) => notices.push([kind, reason]) })
  const result = dialog.pairPin('1234')
  t.mock.timers.tick(10000)
  assert.equal(await result, false)
  finish({ status: 'true' })
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(notices, [['failed', 'timeout'], ['sent', undefined]])
})
