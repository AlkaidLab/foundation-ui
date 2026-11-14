// The client of the host's session API (docs/api/auth.md of the host) behind one small interface, so a product, a test or a mock can stand in for the network.
//
//   const auth = createAuthClient({ request })        // request(method, path, { body, headers }) -> { status, headers: { get }, json() }
//   await auth.session() / login() / setup() / logout() / sessions() / revoke(id) / revokeAll() / changePassword()
//
// Every call answers `{ ok: true, data }` or `{ ok: false, error: { kind, status, message, retryAfter? } }`; none of them throws. A state-changing call sends the CSRF token the host
// gave (the `__Host-sunshine_csrf` cookie when the page can read it, else the token of the last session or login answer). The cookies themselves are the browser's: JavaScript never
// reads the session id (it is HttpOnly) and never stores a password.
import { CSRF_HEADER, authError, csrfCookieName, csrfCookieNames, normalizeSession, normalizeSessions } from './model.js'

/** The value of a cookie from `document.cookie`-style text; '' when absent. */
export function readCookie(cookieText, name) {
  for (const part of String(cookieText || '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) { try { return decodeURIComponent(part.slice(at + 1).trim()) } catch { return part.slice(at + 1).trim() } }
  }
  return ''
}

/** The browser's `fetch` as the `request` the client wants (same origin, cookies sent, no caching). */
export function fetchRequest(fetchImpl = globalThis.fetch?.bind(globalThis), base = '') {
  return async (method, path, { body, headers = {} } = {}) => {
    const init = { method, credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json', ...headers } }
    if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body) }
    const response = await fetchImpl(base + path, init)
    return { status: response.status, headers: response.headers, json: () => response.json().catch(() => ({})) }
  }
}

/** the answers (0: the connection closed without one) of a host that has no password reset route */
export const RESET_ABSENT = [0, 404, 405, 444, 501]

/**
 * The CSRF token a page sends: the cookie this host set. Its name carries the host's service port unless that is the default (see model.js), so it is the name derived from the page's own
 * port first; a page that does not say (a proxy, a default HTTPS port) takes the one CSRF cookie there is. Several CSRF cookies of other hosts and none of this one's: no token, never a guess.
 */
export function readCsrfToken(cookieText, webPort = globalThis.location?.port) {
  const own = readCookie(cookieText, csrfCookieName(webPort))
  if (own) return own
  const names = csrfCookieNames(cookieText)
  return names.length === 1 ? readCookie(cookieText, names[0]) : ''
}

export function createAuthClient({ request, cookie = () => globalThis.document?.cookie || '', webPort = () => globalThis.location?.port } = {}) {
  if (typeof request !== 'function') throw new TypeError('createAuthClient needs a request function')
  let csrf = ''
  const token = () => readCsrfToken(cookie(), webPort()) || csrf

  async function call(method, path, body, { csrfNeeded = method !== 'GET' } = {}) {
    const headers = {}
    if (csrfNeeded && token()) headers[CSRF_HEADER] = token()
    let response
    try { response = await request(method, path, { body, headers }) } catch { return { ok: false, error: authError(0) } }
    const data = await response.json().catch(() => ({}))
    if (response.status >= 200 && response.status < 300 && data?.status !== false && data?.ok !== false) {
      if (typeof data?.csrf_token === 'string' && data.csrf_token) csrf = data.csrf_token
      return { ok: true, data }
    }
    return { ok: false, error: authError(response.status, data, response.headers?.get?.('Retry-After')) }
  }

  const done = (r, map) => (r.ok ? { ok: true, data: map(r.data) } : r)
  return {
    /** the state of this browser: signed in, signed out, trusted local, or no account yet (`setupRequired`) */
    session: async () => done(await call('GET', '/api/auth/session'), normalizeSession),
    login: async ({ username, password, remember = false }) => done(await call('POST', '/api/auth/login', { username, password, remember }, { csrfNeeded: false }), normalizeSession),
    setup: async ({ username, password, remember = false }) => done(await call('POST', '/api/auth/setup', { username, password, remember }, { csrfNeeded: false }), normalizeSession),
    logout: () => call('POST', '/api/auth/logout', {}),
    sessions: async () => done(await call('GET', '/api/auth/sessions'), normalizeSessions),
    revoke: (id) => call('DELETE', `/api/auth/sessions/${encodeURIComponent(id)}`),
    revokeAll: () => call('DELETE', '/api/auth/sessions?all=1'),
    /** a new password without the old one: only the host's own computer may do it (the desktop panel, through its loopback proxy); any other client gets 403 */
    resetPassword: ({ next, confirm }) => call('POST', '/api/auth/password/reset', { new_password: next, ...(confirm !== undefined ? { confirm_password: confirm } : {}) }),
    /**
     * whether this host has the reset route: one POST with an empty body. A host that has it answers 400 (no new password), 403 or 409 before it changes anything; one that has not
     * answers 404, 405 or 501, or closes the connection (444, which a page sees as no answer at all). The host reports no capability field, so this is the probe.
     */
    resetAvailable: async () => { const r = await call('POST', '/api/auth/password/reset', {}); return r.ok || !RESET_ABSENT.includes(r.error.status) },
    /** the current password is always sent and the host checks it; `username` (a new one) renames the account, `next` may then be empty (the password stays) */
    changePassword: ({ current, next, confirm, username }) => call('POST', '/api/auth/password', { current_password: current, ...(next ? { new_password: next } : {}), ...(username ? { new_username: username } : {}), ...(confirm !== undefined && next ? { confirm_password: confirm } : {}) }),
    /** the token the next state-changing call will send (for a product that makes its own requests) */
    csrfToken: token,
  }
}
