// Source adapters turn one log dialect into normalized records. The host's
// text log is the only adapter today; the interface is deliberately the same
// shape a future Platform adapter (structured JSON Lines or the binary record
// file) will implement, so the viewer, error centre, bundle and redaction do
// not need to know which dialect they read.
//
//   { id, name, parse(text, options) -> record[] }

import { createRecord, msToNs, severityOf, SEVERITY_NUMBER, SEVERITY_TEXT, recordTimeMs } from './record.js'

export const HOST_TEXT_ADAPTER_ID = 'host-text'
export const PANEL_ADAPTER_ID = 'panel'

const LINE = /^\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?\]:\s*([A-Za-z]+):\s?(.*)$/
const CLIENT_NAME = /\bclient\s+(?:name|id)\s*[:=]\s*["']?([^"',;\s]+)["']?/i
const CLIENT_JSON = /"client"\s*:\s*"([^"]+)"/i
const TRACE_ID = /\btrace[_-]?id\s*[:=]\s*([0-9a-f]{32})\b/i
const SPAN_ID = /\bspan[_-]?id\s*[:=]\s*([0-9a-f]{16})\b/i
const TRACEPARENT = /\b[0-9a-f]{2}-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}\b/i
const ERROR_CODE = /\[(0x[0-9a-f]+)\]/i
const ERROR_CODE_NAMED = /\berror(?:_code)?\s*[:=]\s*([A-Za-z0-9_.-]+)/i

const stampAt = (parts, milliseconds) => new Date(
  Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]),
  Number(parts[4]), Number(parts[5]), Number(parts[6]), Math.round(milliseconds),
).getTime()

const eventOf = (body, severity) => {
  if (/^CLIENT CONNECTED\b/.test(body)) return 'host.session.connected'
  if (/^CLIENT DISCONNECTED\b/.test(body)) return 'host.session.disconnected'
  const level = SEVERITY_TEXT[severity]
  return level ? 'host.log.' + level.toLowerCase() : 'host.log.message'
}

const outcomeOf = (severity) => (severity >= SEVERITY_NUMBER.ERROR ? 'error' : severity >= SEVERITY_NUMBER.WARN ? 'degraded' : severity === 0 ? '' : 'success')

const clientOf = (body) => {
  if (/^CLIENT (?:CONNECTED|DISCONNECTED)\b/.test(body)) return ''
  return CLIENT_JSON.exec(body)?.[1] || CLIENT_NAME.exec(body)?.[1] || ''
}

function attributeOfMessage(record, body, lineNumber) {
  record.attributes['host.line'] = lineNumber
  const client = clientOf(body)
  if (client) record.attributes['client.id'] = client
  const error = ERROR_CODE.exec(body)?.[1] || ERROR_CODE_NAMED.exec(body)?.[1]
  if (error) record.errorCode = error
}

function traceOf(body) {
  const parent = TRACEPARENT.exec(body)
  if (parent) return { traceId: parent[1], spanId: parent[2] }
  return { traceId: TRACE_ID.exec(body)?.[1] || '', spanId: SPAN_ID.exec(body)?.[1] || '' }
}

/** Parse the host's line format. A line that does not open a record continues the one before it. */
export function parseHostText(text, { now = Date.now() } = {}) {
  const records = []
  const lines = String(text || '').split('\n')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].replace(/\r$/, '')
    const match = LINE.exec(line)
    if (match) {
      const fraction = match[7] ? Number('0.' + match[7]) * 1000 : 0
      const at = stampAt(match, fraction)
      const stamp = match[1] + '-' + match[2] + '-' + match[3] + ' ' + match[4] + ':' + match[5] + ':' + match[6] + (match[7] ? '.' + match[7] : '')
      const time = match[4] + ':' + match[5] + ':' + match[6] + (match[7] ? '.' + match[7] : '')
      const severity = severityOf(match[8])
      const trace = traceOf(match[9])
      const record = createRecord({
        timeUnixNs: msToNs(at),
        observedNs: msToNs(typeof now === 'function' ? now() : now),
        severity,
        severityText: SEVERITY_TEXT[severity],
        domain: 'platform',
        event: eventOf(match[9], severity),
        source: { layer: 'product', id: HOST_TEXT_ADAPTER_ID },
        outcome: outcomeOf(severity),
        traceId: trace.traceId,
        spanId: trace.spanId,
        body: match[9],
        attributes: { 'host.level': match[8], 'host.stamp': stamp, 'host.time': time },
      })
      attributeOfMessage(record, match[9], index + 1)
      records.push(record)
      continue
    }
    if (records.length) {
      const record = records[records.length - 1]
      record.body += '\n' + line
      record.attributes['host.continuation'] = Number(record.attributes['host.continuation'] || 0) + 1
    }
    else if (line !== '') {
      records.push(createRecord({
        timeUnixNs: '0',
        observedNs: msToNs(typeof now === 'function' ? now() : now),
        severity: 0,
        domain: 'platform',
        event: 'host.log.message',
        source: { layer: 'product', id: HOST_TEXT_ADAPTER_ID },
        body: line,
        attributes: { 'host.line': index + 1 },
      }))
    }
  }
  const last = records[records.length - 1]
  if (last) last.body = last.body.replace(/\n+$/, '')
  return records
}

const PANEL_LEVEL = Object.freeze({ error: 'Error', warn: 'Warning', warning: 'Warning', info: 'Info', debug: 'Debug', trace: 'Trace' })
const panelTime = (timestamp) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/.exec(String(timestamp || ''))
  if (!match) return 0
  const fraction = match[7] ? Number('0.' + match[7]) * 1000 : 0
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]), Math.round(fraction)).getTime()
}

/**
 * The control panel's own LogEntry values (get_all_logs or a JSON export) as
 * the same records. The source is the panel, and the target/file/line stay
 * attributes so the viewer can show and filter them.
 */
export function parsePanelLogs(entries, { now = Date.now() } = {}) {
  const list = Array.isArray(entries) ? entries : []
  return list.map((entry, index) => {
    const rawLevel = String(entry?.level || '').toLowerCase()
    const label = PANEL_LEVEL[rawLevel] || ''
    const severity = severityOf(rawLevel)
    const at = panelTime(entry?.timestamp)
    const stamp = String(entry?.timestamp || '')
    const time = stamp.includes(' ') ? stamp.split(' ')[1] : stamp
    const attributes = {
      'host.level': label,
      'host.stamp': stamp,
      'host.time': time,
    }
    if (entry?.target) attributes['panel.target'] = String(entry.target)
    if (entry?.file) attributes['panel.file'] = String(entry.file)
    if (entry?.line !== undefined && entry?.line !== null) attributes['panel.line'] = Number(entry.line)
    return createRecord({
      timeUnixNs: msToNs(at),
      observedNs: msToNs(typeof now === 'function' ? now() : now),
      severity,
      severityText: SEVERITY_TEXT[severity],
      domain: 'ux',
      event: label ? 'panel.log.' + label.toLowerCase() : 'panel.log.message',
      source: { layer: 'product', id: PANEL_ADAPTER_ID },
      outcome: outcomeOf(severity),
      attributes,
      body: String(entry?.message || ''),
    })
  })
}

const registry = new Map()

/** Register an adapter (id and parse are required). A later adapter with the same id replaces the earlier one. */
export function registerAdapter(adapter) {
  if (!adapter || typeof adapter.id !== 'string' || !adapter.id || typeof adapter.parse !== 'function') {
    throw new TypeError('a log adapter needs an id and a parse function')
  }
  registry.set(adapter.id, adapter)
  return adapter
}

export function adapterById(id) {
  return registry.get(String(id || '')) || null
}

export const listAdapters = () => [...registry.values()]

export const hostTextAdapter = registerAdapter({
  id: HOST_TEXT_ADAPTER_ID,
  name: 'Foundation host text log',
  parse: (text, options = {}) => parseHostText(text, options),
})

export const panelJsonAdapter = registerAdapter({
  id: 'panel-json',
  name: 'Control panel JSON log',
  parse: (text, options = {}) => {
    try {
      const parsed = JSON.parse(String(text ?? ''))
      return parsePanelLogs(Array.isArray(parsed) ? parsed : parsed?.logs || [], options)
    } catch {
      return []
    }
  },
})

/** Parse text with the named adapter, or with an adapter object supplied by the caller. */
export function parseRecords(text, { adapter = HOST_TEXT_ADAPTER_ID, ...options } = {}) {
  const chosen = typeof adapter === 'object' && adapter !== null ? adapter : adapterById(adapter)
  if (!chosen) return []
  return chosen.parse(String(text ?? ''), options)
}

/**
 * Sessions from records: CLIENT CONNECTED opens one and CLIENT DISCONNECTED
 * closes it. The session index is kept as the session.id attribute, which is
 * how the viewer and the summary select a session.
 */
export function findRecordSessions(records) {
  const sessions = []
  let open = null
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    if (open && record.attributes['client.id']) open.client_id = record.attributes['client.id']
    if (/^CLIENT CONNECTED\b/.test(record.body)) {
      if (open) {
        open.last = index - 1
        open.endAt = records[index - 1] ? recordTimeMs(records[index - 1]) : open.startAt
        open.live = false
      }
      open = { id: sessions.length, first: index, last: records.length - 1, startAt: recordTimeMs(record), endAt: null, live: true }
      sessions.push(open)
    }
    else if (open && /^CLIENT DISCONNECTED\b/.test(record.body)) {
      open.last = index
      open.endAt = recordTimeMs(record)
      open.live = false
      open = null
    }
  }
  for (const session of sessions) {
    for (let index = session.first; index <= session.last; index++) {
      const record = records[index]
      if (!record) continue
      record.attributes['session.id'] = session.id
      if (session.client_id) record.attributes['session.client_id'] = session.client_id
    }
  }
  return sessions
}

export { TRACE_ID, SPAN_ID, TRACEPARENT }
