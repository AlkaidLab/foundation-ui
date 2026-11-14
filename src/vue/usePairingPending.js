import { computed, reactive, ref } from 'vue'

/**
 * The pairing requests that are waiting for their PIN, from the host (GET /api/pairing/pending, a long poll: the call returns as soon as a request arrives, is resolved,
 * rejected or expires, so the prompt comes forward within a second without tight polling). Docs: docs/api/pairing-pending.md of the host.
 *   hostApi.getJson(path)            -> parsed JSON; throws an error with `.status` on a failed request (a 404 means the host has no such API: the prompt stays off)
 *   hostApi.postJson(path, body)     -> parsed JSON
 *   hostApi.delete(path)             -> parsed JSON
 *   onArrive(requests)               called with the requests that were not listed before (the product may raise a system notification)
 * `requests` is reactive and never lists an expired request (checked each second).
 * A host that answers at once and brings nothing new is asked again after `floorMs`, not at once (it holds no long poll).
 */
export function createPairingPending({ hostApi, onArrive = () => {}, wait = 25, now = () => Date.now(), backoffMs = 5000, fastMs = 400, floorMs = 2000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const state = reactive({ list: [], generation: 0, supported: true, running: false })
  const tick = ref(0)
  let loopId = 0
  let timer = 0
  let ticker = 0
  const known = new Set()
  const requests = computed(() => { void tick.value; return state.list.filter((r) => r.expires_at * 1000 > now()) })
  const apply = (d) => {
    const list = Array.isArray(d?.requests) ? d.requests.filter((r) => r && typeof r.id === 'string').map((r) => ({ id: r.id, device_name: String(r.device_name || ''), started_at: Number(r.started_at) || 0, expires_at: Number(r.expires_at) || 0 })) : []
    const fresh = list.filter((r) => !known.has(r.id))
    known.clear(); for (const r of list) known.add(r.id)
    state.list = list
    state.generation = Number(d?.generation) || state.generation
    if (fresh.length) onArrive(fresh)
  }
  const sleep = (ms) => new Promise((resolve) => { timer = setTimer(resolve, ms) })
  async function loop(id) {
    while (id === loopId) {
      try {
        const query = state.generation ? `?wait=${wait}&since=${state.generation}` : `?wait=${wait}`
        const asked = now(), before = state.generation
        const d = await hostApi.getJson(`/api/pairing/pending${query}`)
        if (id !== loopId) return
        apply(d)
        // A host that does not hold the call (an older one, or a proxy that answers at once) would be asked hundreds of times a second: an answer
        // that came back at once and brings nothing new is followed by a pause. Only the hold is the pause of a long poll.
        if (state.generation === before && now() - asked < fastMs) await sleep(floorMs)
      } catch (e) {
        if (id !== loopId) return
        if (e && (e.status === 404 || e.status === 444 || e.status === 401 || e.status === 403)) { state.supported = false; state.running = false; clearInterval(ticker); return }
        await sleep(backoffMs)
      }
    }
  }
  function start() {
    if (state.running) return
    state.running = true; state.supported = true
    const id = ++loopId
    ticker = setInterval(() => { tick.value += 1 }, 1000)
    void loop(id)
  }
  function stop() { loopId += 1; state.running = false; clearInterval(ticker); clearTimer(timer) }
  const drop = (id) => { state.list = state.list.filter((r) => r.id !== id); known.delete(id) }
  /** Send the PIN the client shows to one request. true when the host took it. */
  async function submit(id, pin, name = '') {
    if (!/^\d{4,8}$/.test(String(pin || ''))) return false
    try { const d = await hostApi.postJson('/api/pairing/pin', { pin: String(pin), name: name || 'New client', id }); const ok = d?.status === true || String(d?.status) === 'true'; if (ok) drop(id); return ok } catch { return false }
  }
  /** Reject (or cancel) one request. */
  async function reject(id) {
    try { await hostApi.delete(`/api/pairing/pending/${encodeURIComponent(id)}`) } catch { /* it expired or is gone: the list follows the host */ }
    drop(id)
  }
  return { state, requests, start, stop, submit, reject }
}
