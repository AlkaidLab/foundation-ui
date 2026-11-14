// The GitHub sign-in of the feedback flows: the device flow (F3). The device code and the polling live in the Worker; this side shows the user code, asks the Worker again at the interval it named and keeps a
// session handle (an opaque value the Worker issued, revocable there), never a GitHub token. Without the backend (config.js) every call answers 未配置 and nothing is requested.
import { devBackend } from './config.js'
import { hostOf, reasonOf } from './net.js'

export const SESSION_KEY = 'foundation-ui.devmode.session'
const store = () => { try { return globalThis.localStorage } catch { return null } }

export function readSession(storage = store()) {
  try {
    const s = JSON.parse(storage?.getItem(SESSION_KEY) || 'null')
    return s && typeof s.handle === 'string' && s.handle ? { handle: s.handle, login: String(s.login || ''), at: Number(s.at) || 0 } : null
  } catch { return null }
}
export function saveSession(session, storage = store()) {
  try { if (session) storage?.setItem(SESSION_KEY, JSON.stringify(session)); else storage?.removeItem(SESSION_KEY) } catch { /* not remembered */ }
}

/** The Worker hands over a new handle (header x-devmode-session) when it had to refresh the GitHub token; the refresh token is single-use, so keep the new handle, the old one is spent soon. */
export function adoptHandle(res, storage = store()) {
  const next = res?.headers?.get?.('x-devmode-session')
  const s = next ? readSession(storage) : null
  if (s && s.handle !== next) saveSession({ ...s, handle: next }, storage)
}

const post = async (fetchImpl, url, body, headers = {}) => {
  const res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), cache: 'no-store', referrerPolicy: 'no-referrer' })
  let data = {}
  try { data = await res.json() } catch { /* an empty answer */ }
  return { ok: res.ok, status: res.status, data }
}

export function createSignIn({ fetchImpl = (...a) => fetch(...a), storage = store(), now = () => Date.now(), backend = devBackend } = {}) {
  /** -> { state: 'unconfigured' | 'code' | 'error' | 'offline' (host, reason), code?, uri?, ref?, interval?, expiresAt? } */
  async function start() {
    const b = backend()
    if (!b.configured) return { state: 'unconfigured' }
    const url = `${b.workerUrl}/oauth/device/start`
    try {
      const r = await post(fetchImpl, url, { client_id: b.clientId })
      if (!r.ok || !r.data.user_code) return { state: 'error', status: r.status }
      return { state: 'code', code: r.data.user_code, uri: r.data.verification_uri || 'https://github.com/login/device', ref: r.data.device_ref, interval: Math.max(5, Number(r.data.interval) || 5), expiresAt: now() + (Number(r.data.expires_in) || 900) * 1000 }
    } catch (error) { return { state: 'offline', host: hostOf(url), reason: reasonOf(error) } }
  }
  /** One question to the Worker. -> { state: 'pending' | 'slow' | 'denied' | 'expired' | 'signed' | 'offline' | 'error', session? } */
  async function poll(ref) {
    const b = backend()
    if (!b.configured) return { state: 'unconfigured' }
    const url = `${b.workerUrl}/oauth/device/poll`
    try {
      const r = await post(fetchImpl, url, { device_ref: ref })
      const s = r.data?.status
      if (r.ok && s === 'authorized' && r.data.session) {
        const session = { handle: String(r.data.session), login: String(r.data.login || ''), at: now() }
        saveSession(session, storage)
        return { state: 'signed', session }
      }
      if (s === 'pending') return { state: 'pending' }
      if (s === 'slow_down') return { state: 'slow' }
      if (s === 'denied') return { state: 'denied' }
      if (s === 'expired') return { state: 'expired' }
      return { state: 'error', status: r.status }
    } catch (error) { return { state: 'offline', host: hostOf(url), reason: reasonOf(error) } }
  }
  /** Ends the session here and, best effort, at the Worker (which drops the token and the attachment map). */
  async function signOut() {
    const b = backend()
    const session = readSession(storage)
    saveSession(null, storage)
    if (b.configured && session) { try { await post(fetchImpl, `${b.workerUrl}/feedback/revoke`, {}, { authorization: `Bearer ${session.handle}` }) } catch { /* the session is gone here either way */ } }
  }
  return { start, poll, signOut, session: () => readSession(storage) }
}
