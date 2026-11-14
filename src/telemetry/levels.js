// Levels and breadcrumbs. Every product writes short lines about what it is doing (a page opened, a call failed, a warning) into a ring buffer in memory; the last lines go along with an error
// report. DEBUG and INFO never leave the window on their own: only an error report carries the last lines, scrubbed.
import { scrubText } from './scrub.js'

export const LEVELS = Object.freeze(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'])
export const levelRank = (level) => Math.max(0, LEVELS.indexOf(String(level || '').toUpperCase()))
/** Only an ERROR or a FATAL can be the reason for an upload; the lower levels are context. */
export const mayUploadAlone = (level) => levelRank(level) >= levelRank('ERROR')
export const BREADCRUMBS = Object.freeze({ capacity: 120, perReport: 50, lineMax: 160, textMax: 6000 })

export function createBreadcrumbs({ capacity = BREADCRUMBS.capacity, now = () => Date.now() } = {}) {
  const ring = []
  const add = (level, category, message) => {
    const rank = levelRank(level)
    ring.push({ t: now(), level: LEVELS[rank], category: scrubText(String(category || 'app'), 24), message: scrubText(String(message ?? ''), BREADCRUMBS.lineMax) })
    if (ring.length > capacity) ring.splice(0, ring.length - capacity)
  }
  const recent = (n = BREADCRUMBS.perReport, minLevel = 'DEBUG') => ring.filter((l) => levelRank(l.level) >= levelRank(minLevel)).slice(-n)
  const toText = (n = BREADCRUMBS.perReport) => recent(n).map((l) => `${new Date(l.t).toISOString().slice(11, 19)} ${l.level} ${l.category} ${l.message}`).join('\n').slice(-BREADCRUMBS.textMax)
  return { add, recent, toText, clear: () => { ring.length = 0 }, get size() { return ring.length } }
}

/** The one buffer of this window. */
export const crumbs = createBreadcrumbs()
export const addBreadcrumb = (level, category, message) => crumbs.add(level, category, message)

/** The last lines of console.warn and console.error become breadcrumbs (the page's own messages are what an error report needs next to it). Returns the function that restores the console. */
export function captureConsole(target = globalThis.console, buffer = crumbs) {
  if (!target) return () => {}
  const originals = {}
  for (const [method, level] of [['warn', 'WARN'], ['error', 'ERROR']]) {
    originals[method] = target[method]
    target[method] = (...args) => {
      try { buffer.add(level, 'console', args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a) } catch { return String(a) } })())).join(' ')) } catch { /* a line that cannot be written is not worth an error */ }
      return originals[method]?.apply(target, args)
    }
  }
  return () => { for (const m of Object.keys(originals)) target[m] = originals[m] }
}
