import { createAutoReporter, readErrors } from '../telemetry/index.js'
import { onError } from './useErrors.js'

// The automatic report of a product (telemetry/auto.js) joined to the error surface: every error worth looking at is classified and handled by the policy (docs/telemetry.md). Started once by the shell.
// `context()` -> { product, version, os, page, locale, components, keys }.
let current = null
/** The fingerprint of the last automatic report of this window: a manual report of the same error joins that issue. */
export const currentFingerprint = () => (current ? current.reporter.fingerprint() : '')

export function startAutoReport({ context, origin = typeof location !== 'undefined' ? location.origin : '' } = {}) {
  if (current) return current
  const reporter = createAutoReporter({
    context, origin, getConsent: () => readErrors(),
    emitKnown: (detail) => { try { window.dispatchEvent(new CustomEvent('foundation-known-env', { detail })) } catch { /* no window */ } },
  })
  const off = onError((error, info) => reporter.handle(error, info))
  const flush = () => { void reporter.flush() }
  const timer = setTimeout(flush, 6000)
  window.addEventListener('online', flush)
  window.addEventListener('foundation-telemetry-errors', flush)
  current = { reporter, stop() { off(); clearTimeout(timer); window.removeEventListener('online', flush); window.removeEventListener('foundation-telemetry-errors', flush); current = null } }
  return current
}
