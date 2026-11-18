import { reactive } from 'vue'
import { normalizeRun } from '../settings/networkCheck.js'

/**
 * One request that always ends: { ok, status, json } or { failed: 'timeout' | 'offline' }. `request(path, { method, body, signal })` is the product's way to the host; it should pass `signal` to its
 * fetch, and when it does not, the call is still ended by its own timeout.
 */
export async function timedCall(request, path, init, timeoutMs) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  let timer = 0
  const timeout = new Promise((resolve) => { timer = setTimeout(() => { controller?.abort(); resolve({ failed: 'timeout' }) }, timeoutMs) })
  try {
    const answer = await Promise.race([request(path, { ...init, signal: controller?.signal }).catch(() => ({ failed: 'offline' })), timeout])
    return answer || { failed: 'offline' }
  } finally { clearTimeout(timer) }
}

/**
 * A run of the host's network check (POST /api/network/check, then GET until it is done) that cannot hang: every request has a timeout, polling gives up after a few failures in a row, and the whole run has
 * a limit of its own. `onUpdate(run)` is called with every state of the run.
 *   view.status: 'idle' | 'starting' | 'running' | 'done' | 'unavailable' (the host has no such check: 404, 444, 501) | 'error'
 *   view.error:  null, or { kind: 'auth' | 'server' | 'offline' | 'bad-answer' | 'timeout' | 'other', http }
 */
export function createNetworkCheck({
  request, onUpdate = () => {}, intervalMs = 400, startTimeoutMs = 8000, pollTimeoutMs = 6000, maxMs = 45000, failuresAllowed = 3,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now = () => Date.now(),
} = {}) {
  const view = reactive({ run: null, status: 'idle', error: null })
  let running = null

  const failWith = (kind, http = 0) => { view.status = 'error'; view.error = { kind, http } }
  const classify = (r) => {
    if (r.failed) return failWith(r.failed === 'timeout' ? 'timeout' : 'offline')
    const http = Number(r.status) || 0
    if (http === 404 || http === 444 || http === 501) { view.status = 'unavailable'; view.error = null; return undefined }
    return failWith(http === 401 || http === 403 ? 'auth' : http >= 500 ? 'server' : 'other', http)
  }

  async function loop() {
    const began = now()
    view.status = 'starting'; view.error = null; view.run = null
    let r = await timedCall(request, '/api/network/check', { method: 'POST', body: {} }, startTimeoutMs)
    if (r.failed || !r.ok) return classify(r)
    let run = normalizeRun(r.json)
    if (!run) return failWith('bad-answer', Number(r.status) || 0)
    view.run = run; view.status = run.state === 'done' ? 'done' : 'running'; onUpdate(run)
    let failures = 0
    while (view.status === 'running') {
      if (now() - began > maxMs) return failWith('timeout')
      await sleep(intervalMs)
      r = await timedCall(request, `/api/network/check?id=${encodeURIComponent(run.id)}`, { method: 'GET' }, pollTimeoutMs)
      if (r.failed || !r.ok) {
        const http = r.failed ? 0 : Number(r.status) || 0
        // the run is gone (the host restarted) or the session ended: that is final. A host that fails or does not answer once in a while is not: a few in a row end it.
        if (http === 404) return failWith('offline')
        if (http === 401 || http === 403) return classify(r)
        failures += 1
        if (failures >= failuresAllowed) return classify(r)
        continue
      }
      const next = normalizeRun(r.json)
      if (!next) return failWith('bad-answer', Number(r.status) || 0)
      failures = 0
      run = next; view.run = run; onUpdate(run)
      if (run.state === 'done') view.status = 'done'
    }
    return undefined
  }

  /** Starts a run, or joins the one that is going. Resolves when it has ended (done, unavailable or error). */
  function start() {
    if (!running) running = loop().catch(() => failWith('offline')).finally(() => { running = null })
    return running
  }
  return { view, start }
}
