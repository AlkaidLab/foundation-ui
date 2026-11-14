// A read-only look at the host's API: one GET of a path under /api/, the answer as it is (JSON laid out), with the fields that hold secrets hidden. It cannot change anything:
// no other method, no path outside /api/, none of the words of a state-changing endpoint, no body.

export const ENDPOINTS = Object.freeze([
  { path: '/api/config', note: 'config' },
  { path: '/api/apps', note: 'apps' },
  { path: '/api/clients/list', note: 'clients' },
  { path: '/api/runtime/sessions', note: 'sessions' },
  { path: '/api/network/reachability', note: 'reachability' },
  { path: '/api/dualsense/tuning', note: 'dualsense' },
  { path: '/api/logs', note: 'log' },
])

const FORBIDDEN_WORD = /(restart|quit|reset|delete|unpair|close|save|password|pin|logout|login|upload|install|update|shutdown|pairing\/pending|clear)/i
const SECRET_KEY = /(password|passwd|token|secret|credential|cookie|private_?key|api_?key|access_?key|cert(ificate)?s?(_|$)|(^|_)auth)/i

/** -> the path to read, or null when it may not be read. */
export function readablePath(input) {
  const text = String(input ?? '').trim()
  if (!text.startsWith('/api/') || text.length > 300) return null
  if (/[\\\s#]|\.\.|\/\//.test(text)) return null
  const [path] = text.split('?')
  if (FORBIDDEN_WORD.test(path)) return null
  return text
}

/** Secrets in a JSON value become 「已隐藏」; the shape stays. */
export function redact(value, hidden = '«hidden»') {
  if (Array.isArray(value)) return value.map((v) => redact(v, hidden))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) && v !== null && v !== '' ? hidden : redact(v, hidden)]))
  return value
}

const LIMIT = 200_000
/** One read. `base` is the proxy address; the result always has ok, ms and either body or error. */
export async function inspect({ fetchImpl = (...a) => fetch(...a), base = '', path, timeoutMs = 5000, now = () => performance.now() } = {}) {
  const safe = readablePath(path)
  if (!safe) return { ok: false, status: 0, ms: 0, error: 'not-readable' }
  const started = now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`${String(base).replace(/\/$/, '')}${safe}`, { method: 'GET', cache: 'no-store', signal: controller.signal })
    const text = await response.text()
    const ms = Math.round(now() - started)
    let body = text.slice(0, LIMIT)
    let json = false
    try { body = JSON.stringify(redact(JSON.parse(text)), null, 2).slice(0, LIMIT); json = true } catch { /* plain text */ }
    return { ok: response.ok, status: response.status, ms, bytes: text.length, json, truncated: text.length > LIMIT, type: response.headers?.get?.('content-type') || '', body }
  } catch (error) {
    return { ok: false, status: 0, ms: Math.round(now() - started), error: controller.signal.aborted ? 'timeout' : String(error?.message || error) }
  } finally { clearTimeout(timer) }
}
