// The problems the host reports at startup (Fatal lines of its log), for a compact card: one short line each, known ones in plain words, the rest by their
// first line, the same problem once with a count. The full message stays with every problem (`raw`) and in the log.
import { classifyError, signature } from './known.js'
import { diagnosticsTexts } from './texts.js'

const LEVEL_PREFIX = /^(?:Fatal|Error|Warning|Info|Debug|Verbose)\s*:\s*/i
const shorten = (text, max = 90) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/**
 * messages: the text of Fatal log entries ("Fatal: ViGEmBus is not installed or running ..."). Returns
 * [{ id, short, raw, count, known: null | { id, go, link } }], in the order of the log, each problem once.
 */
export function startupProblems(messages, locale = 'en') {
  const T = diagnosticsTexts(locale)
  const seen = new Map()
  for (const message of messages || []) {
    const raw = String(message ?? '').replace(LEVEL_PREFIX, '').trim()
    if (!raw) continue
    const known = classifyError(raw)
    const key = known ? `k:${known.id}` : `s:${signature(raw)}`
    const at = seen.get(key)
    if (at) { at.count++; continue }
    const text = known ? T.known?.[known.id] : null
    seen.set(key, { id: known?.id || key, short: text?.short || text?.title || shorten(raw.split('\n')[0]), raw, count: 1, known: known ? { id: known.id, go: known.go || '', link: known.link || '' } : null })
  }
  return [...seen.values()]
}
