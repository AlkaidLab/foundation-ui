// The sign-in session of the host's Web UI (docs/api/auth.md of the host) as the screens use it. Pure: no DOM, no Vue, no network.
//
// The host owns every decision (who is signed in, when a session ends, whether a client is throttled). Nothing here invents a verdict: an answer that is not in the documented
// shape reads as "not signed in" or "unknown", never as success.

export const SESSION_COOKIE = '__Host-sunshine_session'
export const CSRF_COOKIE = '__Host-sunshine_csrf'
export const CSRF_HEADER = 'X-CSRF-Token'

// The host names its cookies after its service port: `__Host-sunshine_csrf` on the default port (47989) and `__Host-sunshine_csrf_<port>` on any other, so two hosts on one name
// do not replace each other's cookies (src/confighttp/auth.cpp cookie_name). The Web UI is served on the service port plus one. A page that reads the fixed name sends no CSRF header
// on a host with another port, and the host refuses every state change after the sign-in (403 "CSRF token missing or invalid").
export const DEFAULT_COOKIE_PORT = 47989
export const WEB_PORT_OFFSET = 1

/** The service port of the host that served this page, from the page's own port (the Web UI port minus one); 0 when the page does not say (a default HTTPS port, a proxy). */
export function servicePortOf(webPort) {
  const n = Number(webPort)
  return Number.isInteger(n) && n > WEB_PORT_OFFSET && n <= 65535 ? n - WEB_PORT_OFFSET : 0
}

/** `__Host-sunshine_csrf` or `__Host-sunshine_csrf_<port>`: the name this host gives the cookie. With an unknown port, the default name. */
export function hostCookieName(base, webPort) {
  const port = servicePortOf(webPort) || DEFAULT_COOKIE_PORT
  return port === DEFAULT_COOKIE_PORT ? base : `${base}_${port}`
}
export const csrfCookieName = (webPort) => hostCookieName(CSRF_COOKIE, webPort)
export const sessionCookieName = (webPort) => hostCookieName(SESSION_COOKIE, webPort)

/** The names of the CSRF cookies in `document.cookie`-style text (any host port). */
export function csrfCookieNames(cookieText) {
  const names = []
  for (const part of String(cookieText || '').split(';')) {
    const at = part.indexOf('=')
    const name = at > 0 ? part.slice(0, at).trim() : ''
    if (/^__Host-sunshine_csrf(_\d+)?$/.test(name) && !names.includes(name)) names.push(name)
  }
  return names
}
export const USERNAME_MAX = 128
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128

/**
 * The return path of a sign-in, accepted only when it stays on this origin: it starts with one `/`, not `//`, has no backslash, no control character and no scheme.
 * Anything else becomes `fallback`. The host applies the same rule when it builds the redirect.
 */
export function safeNext(value, fallback = '/') {
  const text = typeof value === 'string' ? value : ''
  if (!text || text.length > 2048 || text[0] !== '/' || text[1] === '/' || text.includes('\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(text)) return fallback
  // a decoded slash or backslash after the first character could still turn into `//` or `/\` in a browser
  let decoded = text
  try { decoded = decodeURIComponent(text) } catch { return fallback }
  if (decoded[1] === '/' || decoded.includes('\\') || /^\/[a-z][a-z0-9+.-]*:/i.test(decoded)) return fallback
  return text
}

/** `/login?next=%2Fconfig` for a return path, `/login` when there is nothing to return to. */
export function loginUrl(next) {
  const safe = safeNext(next, '/')
  return safe === '/' ? '/login' : `/login?next=${encodeURIComponent(safe)}`
}

const str = (v) => (v === undefined || v === null ? '' : String(v))
const time = (v) => { const t = Date.parse(str(v)); return Number.isNaN(t) ? 0 : t }

/**
 * GET /api/auth/session (or the body of a login) as `{ authenticated, local, setupRequired, username, sessionId, createdAt, lastSeen, expiresAt, absoluteExpiresAt, remember, csrf }`.
 * Times are epoch milliseconds, 0 when absent. `local` is the trusted loopback surface: signed in without a session, so there is nothing to sign out of.
 * A body that is not an object reads as signed out.
 */
export function normalizeSession(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const local = r.local === true
  return {
    authenticated: r.authenticated === true,
    local,
    setupRequired: r.setup_required === true,
    username: str(r.username),
    sessionId: str(r.session_id),
    createdAt: time(r.created_at),
    lastSeen: time(r.last_seen),
    expiresAt: time(r.expires_at),
    absoluteExpiresAt: time(r.absolute_expires_at),
    remember: r.remember === true,
    csrf: str(r.csrf_token),
  }
}

/** The list of GET /api/auth/sessions as `{ current, sessions: [{ id, createdAt, lastSeen, expiresAt, ip, agent, current, remember }] }`, the current one first, then the newest seen. */
export function normalizeSessions(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const current = str(r.current)
  const sessions = (Array.isArray(r.sessions) ? r.sessions : [])
    .filter((s) => s && typeof s === 'object' && str(s.id))
    .map((s) => ({
      id: str(s.id), createdAt: time(s.created_at), lastSeen: time(s.last_seen), expiresAt: time(s.expires_at), ip: str(s.client_ip), agent: str(s.user_agent),
      current: s.current === true || str(s.id) === current, remember: s.remember === true,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.lastSeen - a.lastSeen)
  return { current, sessions }
}

/**
 * Why a request failed, from the HTTP status and the answer: `kind` is one of invalid (wrong user or password, the host never says which), throttled (429, with `retryAfter` seconds),
 * csrf (403: the page's token is stale; reloading fixes it), signed-out (401 on a call that needs a session), setup-done (409), bad-request (400, 413), network (no answer), server.
 */
export function authError(status, body, retryAfterHeader) {
  const message = typeof body?.error === 'string' ? body.error : ''
  const base = { status: Number(status) || 0, message }
  if (!status) return { ...base, kind: 'network' }
  if (status === 429) {
    const after = Number.parseInt(str(retryAfterHeader), 10)
    return { ...base, kind: 'throttled', retryAfter: Number.isFinite(after) && after > 0 ? Math.min(after, 24 * 3600) : 30 }
  }
  if (status === 401) return { ...base, kind: body?.code === 'unauthenticated' ? 'signed-out' : 'invalid' }
  if (status === 403) return { ...base, kind: 'csrf' }
  if (status === 409) return { ...base, kind: 'setup-done' }
  if (status === 400 || status === 413) return { ...base, kind: 'bad-request' }
  return { ...base, kind: 'server' }
}

/** What is wrong with a new password, as codes (empty when it is fine): too-short, too-long, same-as-username, mismatch. The host applies the same limits. */
export function passwordIssues(password, { username = '', confirm = null } = {}) {
  const p = str(password)
  const issues = []
  if (p.length < PASSWORD_MIN) issues.push('too-short')
  if (p.length > PASSWORD_MAX) issues.push('too-long')
  if (username && p.toLowerCase() === str(username).toLowerCase()) issues.push('same-as-username')
  if (confirm !== null && p !== str(confirm)) issues.push('mismatch')
  return issues
}

/** `Chrome · Windows` from a (shortened) user agent; the first words of it when nothing is recognised; '' when empty. */
export function deviceLabel(userAgent) {
  const ua = str(userAgent)
  if (!ua) return ''
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /curl\//i.test(ua) ? 'curl' : ''
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : ''
  const label = [browser, os].filter(Boolean).join(' · ')
  return label || ua.slice(0, 40)
}

/** `3 分钟` / `3 minutes`, `2 小时`, `5 天` for a span of milliseconds (rounded up to the unit; never `0`). */
export function spanText(ms, T) {
  const s = Math.max(1, Math.ceil(ms / 1000))
  if (s < 90) return T.units.seconds(s)
  const m = Math.ceil(s / 60)
  if (m < 90) return T.units.minutes(m)
  const h = Math.ceil(m / 60)
  if (h < 72) return T.units.hours(h)
  return T.units.days(Math.ceil(h / 24))
}

/** The shortest honest ending of a session: the idle deadline or the absolute one, whichever is first (0 when neither is known). */
export function endsAt(session) {
  const times = [session.expiresAt, session.absoluteExpiresAt].filter((t) => t > 0)
  return times.length ? Math.min(...times) : 0
}
