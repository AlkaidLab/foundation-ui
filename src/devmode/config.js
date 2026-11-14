// The backend of the GitHub flows (a Worker that holds the GitHub App and the private storage) is not deployed yet. Until the product gives its address and the App's client id, every flow that needs it says 未配置
// and the flows that need no account keep working. Nothing here reaches a network.
export const BACKEND_KEY = 'foundation-ui.devmode.backend'
let defaults = { workerUrl: '', clientId: '' }
const store = () => { try { return globalThis.localStorage } catch { return null } }
const cleanUrl = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  try {
    const u = new URL(text)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
    if (u.username || u.password || u.search || u.hash) return ''
    if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return u.href.replace(/\/$/, '')
  } catch { /* not an address */ }
  return ''
}
/** The product's own values (a build sets them once). */
export function configureDevBackend(patch = {}) { defaults = { ...defaults, ...Object.fromEntries(Object.entries(patch).filter(([k]) => k in defaults)) } }
/** -> { workerUrl, clientId, configured }: the stored values of this window (for trying a backend) win over the product's. */
export function devBackend(storage = store()) {
  let stored = {}
  try { stored = JSON.parse(storage?.getItem(BACKEND_KEY) || '{}') || {} } catch { stored = {} }
  const workerUrl = cleanUrl(stored.workerUrl || defaults.workerUrl)
  const clientId = String(stored.clientId || defaults.clientId || '').trim()
  return { workerUrl, clientId, configured: !!(workerUrl && /^[\w.-]{8,64}$/.test(clientId)) }
}
