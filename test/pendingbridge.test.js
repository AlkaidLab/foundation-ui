import test from 'node:test'
import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { createPendingStore } from '../src/pending/store.js'
import { exposePending, mountPendingBridge } from '../src/pending/bridge.js'

// like window.postMessage: the message is structured-cloned, so a reactive proxy inside it would throw
function channel() {
  const a = { fns: [] }; const b = { fns: [] }
  return {
    frame: { post: (m) => queueMicrotask(() => b.fns.forEach((f) => f(structuredClone(m)))), listen: (f) => { a.fns.push(f); return () => {} } },
    window: { post: (m) => queueMicrotask(() => a.fns.forEach((f) => f(structuredClone(m)))), listen: (f) => { b.fns.push(f); return () => {} } },
  }
}
const tick = async () => { for (let i = 0; i < 6; i += 1) { await nextTick(); await new Promise((r) => setTimeout(r, 0)) } }

function pair() {
  const writes = []
  const frame = createPendingStore({})
  frame.define('config', { page: 'config', pageLabel: '串流设置', restart: (e) => e.some((x) => x.restart), save: async (e, o) => { writes.push(['save', e.map((x) => x.key), o.restart]); return { ok: true, restarted: o.restart } }, revertSaved: async (e) => { writes.push(['undo', e.map((x) => x.key)]); return { ok: true } } })
  frame.attach('config', { revert: (key) => writes.push(['revert', key]) })
  const win = createPendingStore({})
  const ch = channel()
  exposePending(frame, ch.frame)
  mountPendingBridge(win, ch.window)
  return { frame, win, writes }
}

test('what the frame holds shows in the window, with its page and what it would cause', async () => {
  const { frame, win } = pair()
  frame.sync('config', [{ key: 'port', label: '端口', before: 1, after: 2, restart: true }])
  await tick()
  assert.equal(win.count.value, 1)
  assert.deepEqual(win.pages.value, [{ page: 'config', label: '串流设置', count: 1 }])
  assert.equal((await win.request()).restart, true)
})

test('the window saves a frame source through the frame and the frame restarts itself', async () => {
  const { frame, win, writes } = pair()
  frame.sync('config', [{ key: 'port', label: '端口', before: 1, after: 2, restart: true }])
  await tick()
  await win.request()
  const result = await win.confirm({ restart: true })
  assert.equal(result.ok, true)
  assert.equal(result.restarted, true)
  assert.deepEqual(writes[0], ['save', ['port'], true])
  await tick()
  assert.equal(win.count.value, 0)
  assert.equal(frame.count.value, 0)
  assert.equal(win.canUndoLast(), true)
  await win.undoLast()
  assert.deepEqual(writes.at(-1), ['undo', ['port']])
})

test('undo in the window reaches the frame page and the entry goes away on both sides', async () => {
  const { frame, win, writes } = pair()
  frame.sync('config', [{ key: 'a', label: 'a', before: 1, after: 2 }, { key: 'b', label: 'b', before: 1, after: 2 }])
  await tick()
  await win.undo('web:config', 'a')
  await tick()
  assert.deepEqual(writes, [['revert', 'a']])
  assert.deepEqual(frame.entries('config').map((e) => e.key), ['b'])
  assert.deepEqual(win.entries('web:config').map((e) => e.key), ['b'])
})

test('an invalid entry crosses the frame and the window refuses to save it', async () => {
  const { frame, win, writes } = pair()
  frame.sync('config', [{ key: 'port', label: '端口', before: 1, after: 579891, invalid: { code: 'range', min: 1029, max: 65514, message: '须在 1029–65514 之间' } }])
  await tick()
  assert.equal(win.count.value, 1)
  const review = await win.request()
  assert.equal(review.invalid.length, 1)
  assert.equal((await win.confirm()).error, 'invalid')
  assert.deepEqual(writes, [])
})
