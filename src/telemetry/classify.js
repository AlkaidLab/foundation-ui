// Classification at the source. Every error gets a category, a stable code and a kind; the kind decides where it goes:
//   EXPECTED-ENV  the environment said no and the person can act (offline, wrong password, cancelled, host unreachable): shown with its action, never uploaded
//   KNOWN-ENV     a limit of the machine or of the version (unsupported GPU, missing component, an old host): a counter in Analytics (code only, no text), no report
//   UNEXPECTED    an exception, a broken invariant, a crash: eligible for an automatic report (with consent), and only when the stack is ours
import { describeError } from './describe.js'

export const CATEGORIES = Object.freeze(['network', 'encoder', 'display', 'driver', 'input', 'audio', 'ui', 'config', 'auth', 'update', 'storage'])
export const KINDS = Object.freeze({ EXPECTED_ENV: 'EXPECTED-ENV', KNOWN_ENV: 'KNOWN-ENV', UNEXPECTED: 'UNEXPECTED' })
const KIND_LIST = Object.values(KINDS)

/** An error that carries its own classification: throw new SunshineError('…', { category: 'encoder', code: 'nvenc-unsupported', kind: KINDS.KNOWN_ENV }). */
export class SunshineError extends Error {
  constructor(message, { category = 'ui', code = 'error', kind = KINDS.UNEXPECTED, cause } = {}) {
    super(message)
    this.name = 'SunshineError'
    this.category = category; this.code = code; this.kind = kind
    if (cause !== undefined) this.cause = cause
  }
}
/** Gives an error that was thrown elsewhere its classification (the call site knows what it was doing). */
export function classified(error, info) { try { if (error && typeof error === 'object') Object.assign(error, info) } catch { /* frozen */ } return error }

const EXT = /(?:chrome|moz|safari|safari-web|edge)-extension:|webkit-masked-url|userscript|tampermonkey|violentmonkey|greasemonkey|\/extensions?\/|@user-script|injected(?:-|\.)script/i
const FRAME = /(?:at\s+(?:async\s+)?(?:(.+?)\s+\()?|^(?:(.+?)@))([a-z][a-z0-9+.-]*:\/\/[^\s)]+?|[^\s():]+\.(?:js|mjs|vue|ts))(?::(\d+))?(?::(\d+))?\)?\s*$/

/** The frames of a stack: [{ fn, url }] */
export function framesOf(stack) {
  const out = []
  for (const raw of String(stack || '').split('\n')) {
    const m = FRAME.exec(raw.trim())
    if (m) out.push({ fn: (m[1] || m[2] || '').replace(/^async\s+/, '').trim(), url: m[3] })
  }
  return out
}
const sameApp = (url, origin) => {
  if (EXT.test(url)) return false
  if (/^(?:tauri|asset|file|http\+raw):/.test(url)) return true
  try { const u = new URL(url); return !origin || u.origin === origin || /^(?:localhost|127\.0\.0\.1|tauri\.localhost)$/.test(u.hostname) } catch { return false }
}
/** Is the error ours? The stack has frames from our bundle and none from an extension or an injected script at the top. An error of the Vue handler is ours by definition. */
export function isAppOrigin(error, { origin = '', kind = '' } = {}) {
  const d = describeError(error)
  if (kind === 'vue') return true
  const frames = framesOf(d.stack)
  if (!frames.length) return false
  if (frames.slice(0, 3).some((f) => EXT.test(f.url))) return false
  return frames.some((f) => sameApp(f.url, origin))
}

const NOISE = [
  [/ResizeObserver loop/i, 'resize-observer'], [/^Script error\.?$/i, 'script-error'], [/Non-Error promise rejection captured/i, 'non-error-rejection'],
  [/The user aborted a request|AbortError|signal is aborted|The operation was aborted|Request aborted|fetch.*aborted/i, 'aborted'],
  [/Loading chunk \d+ failed.*(?:hot-update|\?t=)|hot-update|vite.*hmr/i, 'dev-reload'],
  [/Transition was aborted because of invalid state|Skipped ViewTransition|ViewTransition was skipped/i, 'view-transition'],
]
/** Errors that say nothing: the browser's own noise, an aborted fetch when the page went away, an extension. `null` when it is worth looking at. */
export function noiseOf(error, { origin = '', kind = '' } = {}) {
  const d = describeError(error)
  const text = `${d.name}: ${d.message}`
  for (const [re, why] of NOISE) if (re.test(text) || re.test(d.message)) return why
  const frames = framesOf(d.stack)
  if (frames.length && frames.slice(0, 3).some((f) => EXT.test(f.url))) return 'extension'
  return null
}

const PAGE_CATEGORY = [[/display|vdd|virtual/i, 'display'], [/gamepad|input|ds5|dualsense|keyboard|mouse/i, 'input'], [/mic|audio|sound/i, 'audio'], [/encoder|nvenc|amf|qsv|video/i, 'encoder'], [/driver/i, 'driver'], [/config|setting|network|advanced/i, 'config'], [/update/i, 'update'], [/login|password|security|auth|pair|pin/i, 'auth'], [/storage|file/i, 'storage']]
const codeOf = (name) => String(name || 'error').replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'error'

/** { category, code, kind, noise, appOrigin } of an error. `hint`: { page, origin, kind (the channel: error, vue, …), status }. */
export function classifyError(input, hint = {}) {
  const d = describeError(input)
  const e = input && typeof input === 'object' ? input : {}
  const noise = noiseOf(input, hint)
  const appOrigin = isAppOrigin(input, hint)
  const base = { noise, appOrigin }
  if (KIND_LIST.includes(e.kind) && CATEGORIES.includes(e.category) && typeof e.code === 'string' && e.code) return { ...base, category: e.category, code: e.code.slice(0, 40), kind: e.kind }
  const text = `${d.name}: ${d.message}`
  const status = Number(e.status || hint.status || (/\bHTTP[ -]?(\d{3})\b/i.exec(d.message) || [])[1] || 0)
  if (status === 401 || status === 403) return { ...base, category: 'auth', code: `http-${status}`, kind: KINDS.EXPECTED_ENV }
  if (status === 404) return { ...base, category: 'update', code: 'api-missing', kind: KINDS.KNOWN_ENV }
  if (status >= 500) return { ...base, category: 'network', code: `http-${Math.floor(status / 100)}xx`, kind: KINDS.KNOWN_ENV }
  if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading (?:CSS )?chunk .* failed/i.test(text)) return { ...base, category: 'update', code: 'chunk-load', kind: KINDS.KNOWN_ENV }
  if (status === 408 || /timed? ?out|timeout/i.test(text)) return { ...base, category: 'network', code: 'timeout', kind: KINDS.EXPECTED_ENV }
  if (/Failed to fetch|NetworkError|Load failed|net::ERR_|ERR_INTERNET_DISCONNECTED|ECONNREFUSED|host (?:is )?unreachable/i.test(text)) return { ...base, category: 'network', code: 'unreachable', kind: KINDS.EXPECTED_ENV }
  if (/cancel(?:l)?ed|user (?:cancel|denied|dismiss)|NotAllowedError/i.test(text)) return { ...base, category: 'ui', code: 'user-cancelled', kind: KINDS.EXPECTED_ENV }
  if (/QuotaExceededError|storage.*(?:full|quota)/i.test(text)) return { ...base, category: 'storage', code: 'quota', kind: KINDS.KNOWN_ENV }
  if (/not supported|unsupported|NotSupportedError|no such (?:encoder|device)|driver (?:is )?not installed/i.test(text)) return { ...base, category: PAGE_CATEGORY.find(([re]) => re.test(text))?.[1] || 'driver', code: 'unsupported', kind: KINDS.KNOWN_ENV }
  const category = PAGE_CATEGORY.find(([re]) => re.test(String(hint.page || '')))?.[1] || 'ui'
  return { ...base, category, code: codeOf(d.name), kind: KINDS.UNEXPECTED }
}
