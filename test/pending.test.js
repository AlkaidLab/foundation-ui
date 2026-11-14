import test from 'node:test'
import assert from 'node:assert/strict'
import { createPendingStore } from '../src/pending/store.js'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
const entry = (key, before, after, extra = {}) => ({ key, label: key, before, after, ...extra })

function setup({ restartHost } = {}) {
  const writes = []
  const store = createPendingStore({ storage: memory(), restartHost })
  store.define('config', {
    page: 'config', pageLabel: '串流设置',
    save: async (entries, opts) => { writes.push(['config', entries.map((e) => [e.key, e.after]), opts.restart]); return { ok: true } },
    revertSaved: async (entries) => { writes.push(['config-undo', entries.map((e) => [e.key, e.before])]); return { ok: true } },
    restart: (entries) => entries.some((e) => e.restart),
    consequences: (entries) => entries.filter((e) => e.risk).map((e) => ({ id: e.key, kind: 'risk', severity: e.risk, title: e.key })),
  })
  store.define('apps', { page: 'apps', pageLabel: '应用', save: async (entries) => { writes.push(['apps', entries.length]); return { ok: true } } })
  return { store, writes }
}

test('edits stay when the page is left and are there for the page that mounts again', () => {
  const { store } = setup()
  const detach = store.attach('config', { revert() {} })
  store.sync('config', [entry('port', 47989, 48000, { restart: true })])
  detach()
  assert.equal(store.count.value, 1)
  assert.deepEqual(store.pages.value, [{ page: 'config', label: '串流设置', count: 1 }])
  store.sync('apps', [entry('apps', 3, 4)])
  assert.deepEqual(store.pages.value.map((p) => p.page), ['config', 'apps'])
  assert.equal(store.entries('config')[0].after, 48000)
})

test('the state survives a reload of the document through the storage', () => {
  const storage = memory()
  const a = createPendingStore({ storage })
  a.define('config', { page: 'config', pageLabel: 'x' })
  a.sync('config', [entry('port', 1, 2)])
  const b = createPendingStore({ storage })
  assert.equal(b.count.value, 1)
  assert.equal(b.entries('config')[0].after, 2)
})

test('undo of one field reaches the page when it is on screen and drops the entry when it is not', async () => {
  const { store } = setup()
  const reverted = []
  store.attach('config', { revert: (key) => { reverted.push(key) } })
  store.sync('config', [entry('a', 1, 2), entry('b', 1, 2)])
  await store.undo('config', 'a')
  assert.deepEqual(reverted, ['a'])
  assert.deepEqual(store.entries('config').map((e) => e.key), ['b'])
  store.detach('config')
  await store.undo('config', 'b')
  assert.equal(store.count.value, 0)
})

test('undo all and discard take back every source', async () => {
  const { store } = setup()
  const calls = []
  store.attach('config', { revertAll: () => calls.push('config'), revert() {} })
  store.sync('config', [entry('a', 1, 2)])
  store.sync('apps', [entry('apps', 1, 2)])
  await store.undoAll()
  assert.deepEqual(calls, ['config'])
  assert.equal(store.count.value, 0)
  store.sync('apps', [entry('apps', 1, 2)])
  await store.discard()
  assert.equal(store.count.value, 0)
})

test('the save asks once: the plan lists the restart and the risks and nothing is written before the confirmation', async () => {
  const { store, writes } = setup()
  store.sync('config', [entry('upnp', 'disabled', 'enabled', { restart: true, risk: 'high' }), entry('name', 'a', 'b')])
  const review = await store.request()
  assert.equal(review.restart, true)
  assert.equal(review.count, 2)
  assert.deepEqual(review.risks.map((r) => r.severity), ['high'])
  assert.equal(writes.length, 0)
  store.cancel()
  assert.equal(store.state.review, null)
  assert.equal(store.count.value, 2)
})

test('confirming saves every source, restarts on request, clears the state and keeps what the snackbar needs to undo', async () => {
  let restarts = 0
  const { store, writes } = setup({ restartHost: async () => { restarts += 1 } })
  store.sync('config', [entry('port', 1, 2, { restart: true })])
  store.sync('apps', [entry('apps', 1, 2)])
  await store.request()
  const result = await store.confirm({ restart: true })
  assert.deepEqual(result, { ok: true, restarted: true, saved: 2 })
  assert.deepEqual(writes, [['config', [['port', 2]], true], ['apps', 1]])
  assert.equal(restarts, 1)
  assert.equal(store.count.value, 0)
  assert.equal(store.state.review, null)
  assert.equal(store.canUndoLast(), false) // the application list cannot be written back
})

test('the 撤销 after a save writes the old values back and restarts again when the save restarted', async () => {
  let restarts = 0
  const { store, writes } = setup({ restartHost: async () => { restarts += 1 } })
  store.sync('config', [entry('port', 1, 2, { restart: true })])
  await store.request()
  await store.confirm({ restart: true })
  assert.equal(store.canUndoLast(), true)
  const undone = await store.undoLast()
  assert.equal(undone.ok, true)
  assert.deepEqual(writes.at(-1), ['config-undo', [['port', 1]]])
  assert.equal(restarts, 2)
  assert.equal(store.state.last, null)
})

test('a failed save keeps the edits and says why', async () => {
  const store = createPendingStore({})
  store.define('config', { page: 'config', pageLabel: 'x', save: async () => ({ ok: false, error: 'HTTP 500' }) })
  store.sync('config', [entry('a', 1, 2)])
  await store.request()
  const result = await store.confirm()
  assert.equal(result.ok, false)
  assert.equal(store.state.error, 'HTTP 500')
  assert.equal(store.count.value, 1)
  assert.ok(store.state.review)
})

test('a restart that would end running streams says so, and only then', async () => {
  const store = createPendingStore({ activeSessions: async () => 2 })
  store.define('config', { page: 'config', pageLabel: 'x', restart: () => true, save: async () => ({ ok: true }) })
  store.sync('config', [entry('port', 1, 2)])
  const review = await store.request()
  assert.deepEqual(review.consequences.map((c) => [c.kind, c.count]), [['restart', undefined], ['sessions', 2]])
  store.cancel()
  store.configure({ activeSessions: () => 0 })
  assert.deepEqual((await store.request()).consequences.map((c) => c.kind), ['restart'])
})

test('a credential never enters the store, whatever the page reports', () => {
  const store = createPendingStore({ storage: memory() })
  store.sync('config', [entry('sunshine_name', 'a', 'b'), entry('widget_token', 'x', 'y'), entry('api_key', 'x', 'y'), entry('mirror_cdk', '', 'secret-cdk'), entry('anything', 1, 2, { secret: true })])
  assert.deepEqual(store.entries('config').map((e) => e.key), ['sunshine_name'])
})

test('the credential filter does not eat a setting that only contains the letters (nvenc_twopass, bypass_mode, compass)', () => {
  const store = createPendingStore({ storage: memory() })
  store.sync('config', [entry('nvenc_twopass', 'a', 'b'), entry('bypass_mode', 1, 2), entry('sunshine_password', 'x', 'y'), entry('pass', 'x', 'y'), entry('widget-token', 'x', 'y')])
  assert.deepEqual(store.entries('config').map((e) => e.key), ['nvenc_twopass', 'bypass_mode'])
})

test('a change the host would refuse is listed by the plan and the save is refused, in the store and for a source alone', async () => {
  const { store, writes } = setup()
  store.sync('config', [entry('sunshine_name', 'a', 'b'), entry('port', 57989, 579891, { invalid: { message: '须在 1029–65514 之间' } })])
  const review = await store.request()
  assert.deepEqual(review.invalid.map((e) => e.key), ['port'])
  const result = await store.confirm()
  assert.equal(result.ok, false)
  assert.equal(result.error, 'invalid')
  assert.equal(writes.length, 0)
  assert.equal(store.count.value, 2)
  assert.equal((await store.saveSource('config')).ok, false)
  store.sync('config', [entry('sunshine_name', 'a', 'b'), entry('port', 57989, 58000)])
  assert.equal((await store.request()).invalid.length, 0)
  assert.equal((await store.confirm()).ok, true)
})
