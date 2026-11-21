// The overview layout of one host, kept ON the host: the panel and the Web UI of the same host read and write the same document, so both draw the same cards in the same order at the sizes the person chose
// (docs/home-tiles.md, "One layout per host"). What stays on the device: the local copy (it draws the first frame before the host answers, and when it cannot be reached), the usage the smart plan learns from
// (what this device opens), the appearance (theme, clock mode) and the window class (a phone has two columns, so it draws the same layout with the same sizes in them, larger).
//
// The host's document: GET /api/ui/home-layout -> { v: 1, at, layout, stacks } (204 or 404: none yet); PUT the same document. `at` is the time (ms) of the last change by a person; the later one wins.
import { onScopeDispose, watch } from 'vue'

export const HOST_LAYOUT_PATH = '/api/ui/home-layout'
export const HOST_LAYOUT_VERSION = 1

/**
 * The store over a request function of the product: `request(path, init)` answers like fetch (the panel's hostFetch, the Web UI's apiFetch). A host without the route (404, 405, 501) is
 * "not supported": the store then answers null and writes nothing, and the layout stays local, as before.
 */
export function createHostLayoutStore({ request, path = HOST_LAYOUT_PATH }) {
  let supported = true
  const gone = (status) => status === 404 || status === 405 || status === 501
  return {
    get supported() { return supported },
    async load() {
      if (!supported) return null
      try {
        const r = await request(path, { method: 'GET' })
        if (gone(r.status)) { supported = false; return null }
        if (!r.ok || r.status === 204) return null
        const d = await r.json()
        return d && d.v === HOST_LAYOUT_VERSION && d.layout && typeof d.layout === 'object' && Number.isFinite(d.at) ? d : null
      } catch { return null }
    },
    async save(doc) {
      if (!supported) return false
      try {
        const r = await request(path, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc) })
        if (gone(r.status)) { supported = false; return false }
        return r.ok
      } catch { return false }
    },
  }
}

/**
 * Keep a layout (and the stacks) and the host's document the same. At the start the later of the two wins: a host document newer than this device's change is applied, an older one is replaced; a device
 * that never changed anything takes the host's. A change by a person is written after a short rest. The host is read again every `pollMs` and when the page comes back, so a change made on another
 * device shows up without a reload. `storage` keeps this device's time of change apart from the layout itself (a layout nobody changed has none).
 */
export function attachHostLayout({ layout, stacks = null, store, storageKey, storage = globalThis.localStorage, saveAfterMs = 700, pollMs = 30000 }) {
  const atKey = `foundation-ui.dash2.${storageKey}.at`
  const localAt = () => { try { return Number(storage?.getItem(atKey)) || 0 } catch { return 0 } }
  const stamp = (t) => { try { storage?.setItem(atKey, String(t)) } catch { /* storage unavailable */ } }
  const document_ = () => ({ v: HOST_LAYOUT_VERSION, at: localAt(), layout: layout.serialize(), ...(stacks ? { stacks: stacks.serialize() } : {}) })
  let applying = false
  let timer = 0
  let busy = false
  const push = () => { timer = 0; return store.save(document_()) }
  /** Write a change that waits for its rest now (the page goes into the background, and the tests). */
  const flush = async () => { if (!timer) return; clearTimeout(timer); await push() }
  const onLocalChange = () => { if (applying) return; stamp(Date.now()); clearTimeout(timer); timer = setTimeout(push, saveAfterMs) }
  const stop = watch(() => JSON.stringify([layout.serialize(), stacks ? stacks.serialize() : null]), onLocalChange, { flush: 'sync' })
  const sync = async () => {
    if (busy || timer) return // a change that waits to be written is newer than anything the host has
    busy = true
    try {
      const remote = await store.load()
      if (!store.supported) return
      if (!remote) { if (localAt() || !layout.isDefault.value) { if (!localAt()) stamp(Date.now()); await push() } return }
      if (remote.at > localAt()) {
        applying = true
        try { layout.apply(remote.layout); if (stacks && remote.stacks) stacks.apply(remote.stacks); stamp(remote.at) } finally { applying = false }
      } else if (remote.at < localAt()) await push()
    } finally { busy = false }
  }
  sync()
  const poll = pollMs > 0 ? setInterval(sync, pollMs) : 0
  const onVisible = () => { if (globalThis.document?.visibilityState === 'visible') sync(); else flush() }
  globalThis.document?.addEventListener?.('visibilitychange', onVisible)
  const off = () => { stop(); clearTimeout(timer); if (poll) clearInterval(poll); globalThis.document?.removeEventListener?.('visibilitychange', onVisible) }
  try { onScopeDispose(off) } catch { /* not in a scope */ }
  return { off, sync, flush }
}
