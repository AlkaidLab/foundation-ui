// The host log as rows over normalized records. A line reads
// "[2026-11-02 10:15:30.123]: Level: message"; a line that does not start that
// way continues the record before it (a stack, a command output). The parser
// lives in adapters.js; this module keeps the reader API, the compatibility
// rows and the session/filter/grouping functions the viewer uses.

import { findRecordSessions, parseRecords } from './adapters.js'
import {
  attributeOf, isErrorRecord, isRecord, levelOf, recordOf, recordTimeMs, recordToRow, recordsToRows,
  severityOf,
} from './record.js'

export const LEVELS = Object.freeze(['Fatal', 'Error', 'Warning', 'Info', 'Debug', 'Verbose'])
export const levelTone = (level) => (level === 'Fatal' || level === 'Error' ? 'error' : level === 'Warning' ? 'warn' : level === 'Info' ? 'info' : 'neutral')
export const isError = (value) => (recordOf(value) ? isErrorRecord(recordOf(value)) : value?.level === 'Fatal' || value?.level === 'Error')

const timeOf = (value) => (recordOf(value) ? recordTimeMs(recordOf(value)) : Number(value?.at) || 0)
const levelName = (value) => (recordOf(value) ? String(recordOf(value).attributes['host.level'] || levelOf(recordOf(value).severity)) : String(value?.level || ''))
const bodyOf = (value) => (recordOf(value) ? recordOf(value).body : String(value?.message || ''))
const asRow = (value, index) => (isRecord(value) ? recordToRow(value, index) : value)
const asRows = (values) => (values || []).map(asRow)

/** @returns {Array<{ id: number, at: number, stamp: string, time: string, level: string, message: string, session: number, record: object }>} */
export function parseLog(text, options = {}) {
  return recordsToRows(parseRecords(text, options))
}

/**
 * Streaming sessions of the log: from "CLIENT CONNECTED" to the next "CLIENT
 * DISCONNECTED" (an open one is live). The session index is the session.id
 * attribute on every record inside it. Accepts records or compatibility rows.
 * @returns {Array<{ id: number, first: number, last: number, startAt: number, endAt: number|null, live: boolean }>}
 */
export function findSessions(values) {
  if (!values || !values.length) return []
  if (isRecord(values[0])) return findRecordSessions(values)
  const records = values.map((value) => recordOf(value))
  if (records.every(Boolean)) {
    const sessions = findRecordSessions(records)
    for (const value of values) {
      const session = Number(attributeOf(value, 'session.id'))
      value.session = Number.isInteger(session) ? session : -1
    }
    return sessions
  }
  const sessions = []
  let open = null
  for (const row of values) {
    const body = bodyOf(row)
    if (/^CLIENT CONNECTED\b/.test(body)) {
      if (open) { open.last = row.id - 1; open.endAt = values[row.id - 1]?.at ?? open.startAt; open.live = false }
      open = { id: sessions.length, first: row.id, last: values.length - 1, startAt: row.at, endAt: null, live: true }
      sessions.push(open)
    }
    else if (open && /^CLIENT DISCONNECTED\b/.test(body)) {
      open.last = row.id; open.endAt = row.at; open.live = false; open = null
    }
  }
  for (const session of sessions) for (let i = session.first; i <= session.last; i++) if (values[i]) values[i].session = session.id
  return sessions
}

/** What the log itself says about a session (time, level counts, first error); the product adds live numbers when running. */
export function sessionSummary(values, session) {
  const rows = asRows(values)
  const slice = rows.slice(session.first, session.last + 1)
  const counts = {}
  for (const row of slice) counts[row.level] = (counts[row.level] || 0) + 1
  const end = session.endAt ?? (slice.length ? timeOf(slice[slice.length - 1]) : session.startAt)
  return { id: session.id, live: session.live, startAt: session.startAt, endAt: session.endAt, durationMs: Math.max(0, end - session.startAt), lines: slice.length, counts, firstError: slice.find(isError) || null }
}

/** Preset ranges are relative to the newest line of the log, so an old log still has a meaningful "last hour". */
export const RANGES = Object.freeze({ all: 0, '15m': 15 * 60e3, '1h': 3600e3, '6h': 6 * 3600e3, '24h': 24 * 3600e3 })
export function rangeStart(values, preset) {
  const span = RANGES[preset] || 0
  if (!span) return null
  const newest = [...(values || [])].reverse().find((value) => timeOf(value))
  return newest ? timeOf(newest) - span : null
}

/** Builds the matcher of the search box. Returns { test(text) -> bool, error: string } (an invalid regex matches nothing and reports why). */
export function makeMatcher(query, { mode = 'text', ignoreCase = true } = {}) {
  const q = String(query || '')
  if (!q) return { test: () => true, error: '' }
  if (mode === 'regex') {
    try { const re = new RegExp(q, ignoreCase ? 'i' : ''); return { test: (text) => re.test(text), error: '' } } catch (e) { return { test: () => false, error: String(e.message || e) } }
  }
  const needle = ignoreCase ? q.toLowerCase() : q
  const norm = (text) => (ignoreCase ? text.toLowerCase() : text)
  return mode === 'exact' ? { test: (text) => norm(text) === needle, error: '' } : { test: (text) => norm(text).includes(needle), error: '' }
}

/**
 * @param {Array} values rows or records
 * @param {{ levels?: Set<string>|string[], severity?: Set<number|string>|Array<number|string>, domains?: Set<string>|string[], sources?: Set<string>|string[], query?: string, mode?: string, ignoreCase?: boolean, from?: number|null, to?: number|null, session?: number|null }} f
 *   severity filters by SeverityNumber (1 trace, 5 debug, 9 info, 13 warn, 17 error, 21 fatal),
 *   domains by the record domain (platform, ux, audit), sources by source.id,
 *   levels by the host's old labels.
 */
export function filterRows(values, f = {}) {
  const levels = f.levels ? new Set(f.levels) : null
  const severity = f.severity ? new Set((Array.isArray(f.severity) ? f.severity : [...f.severity]).map(severityOf)) : null
  const domains = f.domains ? new Set(Array.isArray(f.domains) ? f.domains : [...f.domains]) : null
  const sources = f.sources ? new Set(Array.isArray(f.sources) ? f.sources : [...f.sources]) : null
  // the source file of a panel record (the old log console's "source file" filter)
  const files = f.files ? new Set(Array.isArray(f.files) ? f.files : [...f.files]) : null
  const matcher = makeMatcher(f.query, f)
  const out = (values || []).filter((value) => {
    const record = recordOf(value)
    const ownSeverity = record ? record.severity : severityOf(levelName(value))
    const ownDomain = record ? record.domain : (value.domain || 'platform')
    const ownSource = record ? (record.source?.id || '') : (value.source || '')
    const ownSession = Number(attributeOf(value, 'session.id') ?? value.session)
    return (
      (!levels || !levels.size || levels.has(levelName(value)) || levelName(value) === '')
      && (!severity || !severity.size || severity.has(ownSeverity))
      && (!domains || !domains.size || domains.has(ownDomain))
      && (!sources || !sources.size || sources.has(ownSource))
      && (!files || !files.size || files.has(String(attributeOf(value, 'panel.file') ?? '')))
      && (f.session === null || f.session === undefined || ownSession === f.session)
      && (f.from == null || !timeOf(value) || timeOf(value) >= f.from)
      && (f.to == null || !timeOf(value) || timeOf(value) <= f.to)
      && matcher.test(levelName(value) + ': ' + bodyOf(value))
    )
  })
  return { rows: out, error: matcher.error }
}

/** Consecutive rows with the same level and message become one item with a count. */
export function groupRepeats(values) {
  const items = []
  for (const value of values) {
    const row = asRow(value, items.length)
    const prev = items[items.length - 1]
    if (prev && prev.row.level === row.level && prev.row.message === row.message) { prev.count++; prev.last = row; prev.ids.push(row.id) }
    else items.push({ row, count: 1, last: row, ids: [row.id] })
  }
  return items
}
export const ungrouped = (values) => values.map((value, index) => { const row = asRow(value, index); return { row, count: 1, last: row, ids: [row.id] } })

/** The first Fatal or Error row (optionally from an id on). */
export const firstError = (values, from = 0) => (values || []).map(asRow).find((row) => row.id >= from && isError(row)) || null

export const rowText = (value) => {
  const row = asRow(value, 0)
  return row.stamp ? '[' + row.stamp + ']: ' + row.level + ': ' + row.message : row.message
}
/** The text of selected items for the clipboard: one line per row, a repeat group once with its count. */
export const selectionText = (items) => items.map((item) => (item.count > 1 ? rowText(item.row) + '  (x' + item.count + ')' : rowText(item.row))).join('\n')

export function levelCounts(values) {
  const counts = new Map()
  for (const value of values || []) {
    const level = levelName(value)
    if (level) counts.set(level, (counts.get(level) || 0) + 1)
  }
  const known = LEVELS.filter((level) => counts.has(level))
  const other = [...counts.keys()].filter((level) => !LEVELS.includes(level)).sort()
  return [...known, ...other].map((level) => ({ level, count: counts.get(level) }))
}

/** Live tail: the new text of an incremental read joins the old text; a full read replaces it. Keeps at most max characters (the tail). */
export function appendTail(current, chunk, { incremental = false, max = 1024 * 1024 } = {}) {
  const next = incremental ? current + chunk : chunk
  return next.length > max ? next.slice(next.length - max).replace(/^[^\n]*\n/, '') : next
}

/**
 * Error and Fatal records per hour: the window ends at the last hour the log covers and is as long as the log, at least `min` hours (a log of one
 * hour still shows a day-sized axis with the empty hours before it, not one wide bar) and at most `max`. null when no line has a time.
 */
export function errorsPerHour(values, max = 48, min = 24) {
  const stamped = (values || []).map((value, index) => asRow(value, index)).filter((row) => row.at)
  if (!stamped.length) return null
  const H = 3600e3
  const last = Math.floor(stamped[stamped.length - 1].at / H)
  const first = Math.max(Math.min(Math.floor(stamped[0].at / H), last - (min - 1)), last - (max - 1))
  const tally = new Array(last - first + 1).fill(0)
  for (const row of stamped) if (isError(row)) { const index = Math.floor(row.at / H) - first; if (index >= 0) tally[index]++ }
  const two = (n) => String(n).padStart(2, '0')
  const labels = tally.map((_, index) => { const date = new Date((first + index) * H); return two(date.getMonth() + 1) + '-' + two(date.getDate()) + ' ' + two(date.getHours()) + ':00' })
  return { values: tally, labels, total: tally.reduce((sum, count) => sum + count, 0) }
}
