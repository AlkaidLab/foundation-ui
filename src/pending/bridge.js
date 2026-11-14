import { watch } from 'vue'

// The unsaved state across a frame: the control panel shows the Web UI in a frame, and the Web UI keeps its own store (it knows how to save its settings).
// The frame reports what it holds to the window around it (`exposePending`, in the frame); the window shows it in its one bar and sends undo and save back
// (`mountPendingBridge`, in the window). Messages: { type: 'foundation-pending', op: 'sync', sources } and { type: 'foundation-pending-cmd' / '-reply', id, … }.
const SYNC = 'foundation-pending'
const CMD = 'foundation-pending-cmd'
const REPLY = 'foundation-pending-reply'

const meta = (store, id) => {
  const def = store.state.sources[id] || {}
  // plain data: an entry may hold nested objects (invalid) that are reactive proxies, which postMessage cannot clone
  const entries = JSON.parse(JSON.stringify(store.entries(id)))
  return { page: def.page, pageLabel: def.pageLabel, label: def.label, restart: !!def.restart?.(entries), canUndo: typeof def.revertSaved === 'function', consequences: def.consequences?.(entries) || [], entries }
}

/** In the frame. post(message) goes to the window around it; listen(fn) gets the messages coming from it. Returns a stop function. */
export function exposePending(store, { post, listen }) {
  const payload = () => {
    const sources = {}
    for (const id of Object.keys(store.state.sources)) sources[id] = meta(store, id)
    return sources
  }
  let last = ''
  const push = () => {
    const sources = payload()
    const json = JSON.stringify(sources)
    if (json === last) return
    last = json
    post({ type: SYNC, op: 'sync', sources })
  }
  const stopWatch = watch(() => JSON.stringify(payload()), push, { flush: 'post' })
  const stopListen = listen(async (data) => {
    if (data?.type === SYNC && data.op === 'hello') { last = ''; push(); return }
    if (data?.type !== CMD) return
    let result = { ok: false }
    try {
      if (data.op === 'save') result = await store.saveSource(data.source, data.opts || {})
      else if (data.op === 'revertSaved') result = (await store.state.sources[data.source]?.revertSaved?.(data.entries || [])) || { ok: true }
      else if (data.op === 'undo') { await store.undo(data.source, data.key); result = { ok: true } }
      else if (data.op === 'undoSource') { await store.undoSource(data.source); result = { ok: true } }
    } catch (error) { result = { ok: false, error: error?.message || String(error) } }
    post({ type: REPLY, id: data.id, result })
  })
  push()
  return () => { stopWatch(); stopListen?.() }
}

/** In the window around the frame. post(message) goes to the frame; listen(fn) gets the messages from it. */
export function mountPendingBridge(store, { post, listen, timeout = 20000 }) {
  let seq = 0
  const waiting = new Map()
  const known = new Set()
  const rpc = (command) => new Promise((resolve) => {
    const id = `p${++seq}`
    const timer = setTimeout(() => { waiting.delete(id); resolve({ ok: false, error: 'timeout' }) }, timeout)
    waiting.set(id, (result) => { clearTimeout(timer); resolve(result) })
    post({ type: CMD, id, ...JSON.parse(JSON.stringify(command)) }) // plain data: the entries of the last save are reactive proxies, which postMessage cannot clone
  })
  const stop = listen((data) => {
    if (data?.type === REPLY) { waiting.get(data.id)?.(data.result); waiting.delete(data.id); return }
    if (data?.type !== SYNC || data.op !== 'sync') return
    const seen = new Set()
    for (const [id, m] of Object.entries(data.sources || {})) {
      const pid = `web:${id}`
      seen.add(pid)
      known.add(pid)
      store.define(pid, {
        page: m.page, pageLabel: m.pageLabel, label: m.label,
        restart: () => m.restart,
        consequences: () => m.consequences || [],
        save: async (_entries, opts) => { const r = await rpc({ op: 'save', source: id, opts }); return r },
        ...(m.canUndo ? { revertSaved: (entries) => rpc({ op: 'revertSaved', source: id, entries }) } : {}),
      })
      store.attach(pid, {
        revert: (key) => { void rpc({ op: 'undo', source: id, key }) },
        revertAll: () => { void rpc({ op: 'undoSource', source: id }) },
      })
      store.sync(pid, m.entries)
    }
    for (const pid of [...known]) if (!seen.has(pid)) { known.delete(pid); store.sync(pid, []) }
  })
  post({ type: SYNC, op: 'hello' })
  return stop
}
