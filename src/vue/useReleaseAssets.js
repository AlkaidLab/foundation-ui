import { reactive } from 'vue'
import { RELEASE_PRODUCT, releaseUrlOf } from '../clients/assets.js'

const fetchRelease = async (url) => { const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(String(r.status)); return r.json() }

/**
 * The release assets of the clients, read once per product from the website's release metadata (the `latest` channel, only when it is not a prerelease, as the website does).
 * `assetsOf(client)` is reactive: [] until read (or when there is no metadata), then the assets with size, sha256, CNB url and GitHub url. Without options every caller shares
 * one instance (one read per product for the whole page); the tests give their own fetchJson.
 */
function create(fetchJson) {
  const state = reactive({})
  const pending = new Set()
  async function load(product) {
    if (!product || state[product] !== undefined || pending.has(product)) return
    pending.add(product)
    try {
      const d = await fetchJson(releaseUrlOf(product))
      const ch = d?.channels?.latest
      state[product] = ch && ch.prerelease !== true && Array.isArray(ch.assets) ? { version: ch.version || '', assets: ch.assets } : { version: '', assets: [] }
    } catch { state[product] = { version: '', assets: [] } } finally { pending.delete(product) }
  }
  const productOf = (client) => RELEASE_PRODUCT[client?.id] || ''
  const assetsOf = (client) => { const p = productOf(client); if (p) void load(p); return (p && state[p]?.assets) || [] }
  const versionOf = (client) => { const p = productOf(client); return (p && state[p]?.version) || '' }
  return { assetsOf, versionOf, load }
}
let shared = null
export const useReleaseAssets = ({ fetchJson } = {}) => (fetchJson ? create(fetchJson) : (shared ||= create(fetchRelease)))
