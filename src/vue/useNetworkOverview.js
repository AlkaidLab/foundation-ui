import { reactive } from 'vue'
import { normalizeOverview } from '../settings/networkOverview.js'

/**
 * The network overview of the host (GET /api/network/overview) as one state for a product: 系统 › 网络概览 of the control panel and of the Web UI read it the same way.
 * `request(path)` is the product's way to the host and returns { ok, status, json }. The host asks third-party STUN servers only when this is called and keeps the result
 * 10 minutes, so `refresh()` (opening the page) reads that cache and `refresh(true)` (重新检测) asks again (`?refresh=1`). Nothing calls it on a timer.
 *   view.status: 'idle' | 'loading' | 'ready' | 'unavailable' (404, or an answer that is not a v1 overview: an older host) | 'error'
 */
export function createNetworkOverview({ request }) {
  const view = reactive({ report: null, status: 'idle' })
  let running = null
  async function refresh(force = false) {
    if (running) return running
    view.status = 'loading'
    running = (async () => {
      try {
        const r = await request(`/api/network/overview${force ? '?refresh=1' : ''}`)
        if (!r || r.status === 404 || r.status === 501) { view.report = null; view.status = 'unavailable'; return }
        if (!r.ok) { view.status = view.report ? 'ready' : 'error'; return }
        const report = normalizeOverview(r.json)
        if (!report) { view.report = null; view.status = 'unavailable'; return }
        view.report = report; view.status = 'ready'
      } catch {
        view.status = view.report ? 'ready' : 'error'
      } finally { running = null }
    })()
    return running
  }
  return { view, refresh }
}
