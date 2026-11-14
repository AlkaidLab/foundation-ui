import { reactive } from 'vue'
import { normalizeReport } from '../settings/reachability.js'

/**
 * The reachability check of the host as one state for a product: the card of 主机设置 › 网络, the first-run step and the home tile read the same report.
 * `request(path)` is the product's way to the host and returns { ok, status, json } (the Web UI and the control panel reach the same API); the host does the check
 * itself (no outside service), so `refresh(true)` asks it to run again (`?refresh=1`) and `refresh()` reads what it has. `refresh(true, { test })` tests an address that is not saved
 * (`&test=host[:port]`, comma separated): a host that does not know the parameter ignores it and answers the saved addresses, which the screen tells apart by the missing result.
 *   view.status: 'idle' | 'loading' | 'ready' | 'unavailable' (404, 444 — the host closes the connection on a route it does not have —, or an answer that is not a v1 report: an older host) | 'error'
 *   view.http:   the HTTP status of the last answer that was not a report (0 when the host did not answer); view.cause: 'bad-answer' | 'offline' | ''
 */
export function createReachability({ request }) {
  const view = reactive({ report: null, status: 'idle', http: 0, cause: '' })
  let running = null
  async function refresh(force = false, options = {}) {
    if (running) return running
    view.status = 'loading'
    running = (async () => {
      try {
        const query = []
        if (force) query.push('refresh=1')
        const test = String(options?.test ?? '').trim()
        if (test) query.push(`test=${encodeURIComponent(test)}`)
        const r = await request(`/api/network/reachability${query.length ? `?${query.join('&')}` : ''}`)
        view.http = Number(r?.status) || 0
        if (!r || r.status === 404 || r.status === 444 || r.status === 501) { view.report = null; view.status = 'unavailable'; view.cause = ''; return }
        if (!r.ok) { view.status = view.report ? 'ready' : 'error'; view.cause = ''; return }
        const report = normalizeReport(r.json)
        if (!report) { view.report = null; view.status = 'unavailable'; view.cause = ''; return }
        view.report = report; view.status = 'ready'; view.http = 0; view.cause = ''
      } catch {
        view.status = view.report ? 'ready' : 'error'; view.http = 0; view.cause = 'offline'
      } finally { running = null }
    })()
    return running
  }
  return { view, refresh }
}
