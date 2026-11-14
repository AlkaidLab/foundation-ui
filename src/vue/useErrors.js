import { reactive } from 'vue'
import { KINDS, addBreadcrumb, buildReport, classifyError, crumbs, describeError, signatureOf } from '../telemetry/index.js'

// The one place uncaught errors arrive: the error of a page (window error), a promise nobody caught, the error handler of Vue, and what a product reports by hand (a failed critical call). The
// error is turned into a scrubbed report and handed to MErrorHost, which draws it in our own surface; the browser's own message and a blank page never reach the person.
const state = reactive({ current: null, more: 0, open: false, hosted: 0 })
const seen = new Map()
let provider = () => ({})
const BENIGN = [/ResizeObserver loop/i, /^Script error\.?$/i, /Non-Error promise rejection captured/i, /The user aborted a request/i, /AbortError/, /Failed to fetch dynamically imported module.*(?:\?t=|hot-update)/]
const WINDOW_MS = 4000
const sinks = new Set()
/** fn(error, { kind, report, cls }) is called with every error that is worth looking at (the noise is gone), before the surface decides to show it: the automatic report listens here. Returns the function that stops it. */
export const onError = (fn) => { sinks.add(fn); return () => sinks.delete(fn) }

/** The product tells where it is: () => ({ product, version, os, page, locale, logs }). */
export const setErrorContext = (fn) => { provider = typeof fn === 'function' ? fn : () => ({}) }

export function reportError(error, { kind = 'error', blocking = true } = {}) {
  try {
    const d = describeError(error)
    if (BENIGN.some((re) => re.test(`${d.name}: ${d.message}`) || re.test(d.message))) return null
    const ctx = provider() || {}
    const cls = classifyError(error, { page: ctx.page, origin: typeof location !== 'undefined' ? location.origin : '', kind })
    if (cls.noise) return null
    // only an error of our own that nobody expected stops the person; the rest is a note with a way to the details (an offline host is for the page to explain, not a crash)
    blocking = blocking && cls.kind === KINDS.UNEXPECTED
    addBreadcrumb(cls.kind === KINDS.UNEXPECTED ? 'ERROR' : 'WARN', cls.category, `${d.name}: ${d.message}`)
    const report = buildReport(error, { kind, fatal: blocking, context: { ...ctx, category: cls.category, code: cls.code, errorKind: cls.kind, breadcrumbs: crumbs.toText(), now: Date.now() } })
    for (const sink of sinks) { try { void sink(error, { kind, report, cls }) } catch { /* a listener that fails does not stop the surface */ } }
    const key = signatureOf(report)
    const now = Date.now()
    if (now - (seen.get(key) || 0) < WINDOW_MS) return null
    seen.set(key, now)
    if (seen.size > 50) seen.delete(seen.keys().next().value)
    if (state.current && state.open) { state.more += 1; return report }
    state.current = { report, blocking, at: now }
    // the products that count errors (GA4) listen: only the kind, the message and whether it blocked, already scrubbed
    try { window.dispatchEvent(new CustomEvent('foundation-error-reported', { detail: { kind: report.kind, message: report.message, fatal: blocking } })) } catch { /* no window */ }
    state.more = 0
    state.open = true
    return report
  } catch {
    return null
  }
}

/** Sunshine stopped and nobody asked it to: the surface in its 「Sunshine 意外停止」 variant. `bundle` is the latest crash bundle when the product has one (telemetry/crash.js). */
export function reportHostStop({ at = Date.now() } = {}) {
  try {
    addBreadcrumb('FATAL', 'host', 'Sunshine stopped unexpectedly')
    const report = buildReport(new Error('Sunshine stopped unexpectedly'), { kind: 'hoststop', fatal: true, context: { ...(provider() || {}), code: 'host-stop', breadcrumbs: crumbs.toText(), now: at } })
    state.current = { report, blocking: true, at, hostStop: { at } }
    state.more = 0
    state.open = true
    return report
  } catch {
    return null
  }
}

/**
 * Sunshine runs and does not answer (the verdict 「主机无响应」 that has lasted): the same dialog as the stop, in its own words (`hostStop.kind === 'hung'`). It carries no claim of a crash.
 * Waiting is the way out (「继续等待」 hides it); it closes by itself when the host answers again (`dismissHostHung`). A stop that is already on screen is not replaced by it.
 */
export function reportHostHung({ at = Date.now(), seconds = 0 } = {}) {
  try {
    const shown = state.current?.hostStop
    if (shown) return state.current.report
    addBreadcrumb('WARN', 'host', 'Sunshine does not answer')
    const report = buildReport(new Error('Sunshine does not respond'), { kind: 'hoststop', fatal: false, context: { ...(provider() || {}), code: 'host-hung', breadcrumbs: crumbs.toText(), now: at } })
    state.current = { report, blocking: true, at, hostStop: { kind: 'hung', at, seconds: Math.max(0, Math.round(Number(seconds) || 0)) } }
    state.more = 0
    state.open = true
    return report
  } catch {
    return null
  }
}

/** The host answers again: the hung dialog goes (open or hidden by 「继续等待」). Any other dialog, a stop included, stays for the person to close. */
export function dismissHostHung() {
  if (state.current?.hostStop?.kind !== 'hung') return false
  state.open = false
  state.current = null
  state.more = 0
  return true
}

/**
 * The person wants to tell the developers something without an error (the diagnostics page): the report form opens on its own, kind `manual`, not blocking. `logs` is the text of the last log lines (scrubbed here).
 * Returns false when no MErrorHost is mounted in this window (an embedded frame), so the caller can hide its entry. An error that is on screen is not replaced.
 */
export function reportFeedback({ logs = '' } = {}) {
  try {
    if (!state.hosted || (state.open && state.current)) return false
    const report = buildReport({ name: 'Feedback', message: '', stack: '' }, { kind: 'manual', fatal: false, context: { ...(provider() || {}), ...(logs ? { logs } : {}), category: 'ui', code: 'feedback', breadcrumbs: crumbs.toText(), now: Date.now() } })
    state.current = { report, blocking: true, feedback: true, at: Date.now() }
    state.more = 0
    state.open = true
    return true
  } catch {
    return false
  }
}
/** MErrorHost tells it is mounted (and stops telling when it goes). */
export const hostMounted = (on) => { state.hosted = Math.max(0, state.hosted + (on ? 1 : -1)) }

export const dismissError = () => { state.open = false; state.current = null; state.more = 0 }
export const hideError = () => { state.open = false }
export const showError = () => { if (state.current) state.open = true }

/** window error, unhandledrejection and the Vue error handler. Returns the function that takes them off again. Not for a page that is only a frame of another shell. */
export function installErrorHandlers({ app = null } = {}) {
  const onError = (event) => { reportError(event?.error || event, { kind: 'error' }) }
  const onRejection = (event) => { reportError(event?.reason ?? event, { kind: 'unhandledrejection' }) }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  const before = app?.config?.errorHandler
  if (app) app.config.errorHandler = (err, instance, info) => { reportError(err, { kind: 'vue' }); if (typeof before === 'function') before(err, instance, info); else console.error(err) }
  return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); if (app) app.config.errorHandler = before }
}

export const useErrors = () => ({ state, reportFeedback, reportError, reportHostStop, reportHostHung, dismissHostHung, dismissError, hideError, showError })
