// One normalized log record, the shape the Platform uses in
// docs/architecture/logging-system.zh.md section 3 and
// docs/architecture/logging-record-encoding.md. The names follow the
// OpenTelemetry log data model: timeUnixNs is Timestamp, observedNs is
// ObservedTimestamp, severity is SeverityNumber, event is EventName, source is
// InstrumentationScope, attributes is Attributes and body is Body.
//
// Times are decimal nanosecond strings so a 2026 timestamp is exact in
// JavaScript (a number would lose sub-microsecond precision), and so the record
// maps to OTLP without a lossy conversion. The row helpers keep the old reader
// API working while every row carries its record.

export const SEVERITY_NUMBER = Object.freeze({
  TRACE: 1,
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
  FATAL: 21,
  UNSPECIFIED: 0,
})

export const SEVERITY_TEXT = Object.freeze({
  0: '',
  1: 'Trace',
  5: 'Debug',
  9: 'Info',
  13: 'Warning',
  17: 'Error',
  21: 'Fatal',
})

export const DOMAINS = Object.freeze(['platform', 'ux', 'audit'])

const LEVEL_TO_NUMBER = Object.freeze({
  Trace: 1,
  Verbose: 1,
  Debug: 5,
  Info: 9,
  Informational: 9,
  Warning: 13,
  Warn: 13,
  Error: 17,
  Fatal: 21,
  Critical: 21,
})

const NUMBER_TO_LEVEL = Object.freeze({ 1: 'Trace', 5: 'Debug', 9: 'Info', 13: 'Warning', 17: 'Error', 21: 'Fatal' })

/** SeverityNumber for a host level label or an already-normalized number. */
export function severityOf(level) {
  if (typeof level === 'number' && Number.isFinite(level)) {
    if (level <= 0) return 0
    if (level <= 4) return 1
    if (level <= 8) return 5
    if (level <= 12) return 9
    if (level <= 16) return 13
    if (level <= 20) return 17
    return 21
  }
  const key = String(level || '')
  return LEVEL_TO_NUMBER[key] || LEVEL_TO_NUMBER[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] || 0
}

/** The host label for a severity number, used where the old reader showed a level name. */
export const levelOf = (severity) => NUMBER_TO_LEVEL[severity] || ''

const pad = (value, width) => String(value).padStart(width, '0')
const hexId = (value, length) => {
  const text = String(value || '').toLowerCase()
  return new RegExp('^[0-9a-f]{' + length + '}$').test(text) && !/^0+$/.test(text) ? text : ''
}

const timeOf = (value) => {
  if (value === undefined || value === null || value === '') return '0'
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value)).toString()
  const text = String(value)
  return /^\d+$/.test(text) ? text : '0'
}

export const msToNs = (ms) => BigInt(Math.trunc(Number(ms) || 0)) * 1000000n
export const recordTimeMs = (record) => Number(BigInt(timeOf(record?.timeUnixNs)) / 1000000n)

/** Build a record with every field present. Unknown or missing values use the model's empty value. */
export function createRecord(fields = {}) {
  const severity = severityOf(fields.severity)
  const timeUnixNs = timeOf(fields.timeUnixNs)
  return {
    timeUnixNs,
    observedNs: timeOf(fields.observedNs ?? timeUnixNs),
    severity,
    severityText: fields.severityText || SEVERITY_TEXT[severity] || '',
    domain: DOMAINS.includes(fields.domain) ? fields.domain : 'platform',
    event: String(fields.event || 'host.log.message'),
    source: normalizeSource(fields.source),
    traceId: hexId(fields.traceId, 32),
    spanId: hexId(fields.spanId, 16),
    traceFlags: Number.isInteger(fields.traceFlags) ? fields.traceFlags & 0xff : 0,
    outcome: String(fields.outcome || ''),
    errorCode: String(fields.errorCode || ''),
    attributes: { ...(fields.attributes || {}) },
    body: String(fields.body ?? ''),
  }
}

function normalizeSource(source) {
  if (!source) return { layer: 'product', id: 'host-text' }
  if (typeof source === 'string') return { layer: 'product', id: source }
  return { layer: String(source.layer || 'product'), id: String(source.id || '') }
}

/** The record behind a row, or the record itself. */
export const recordOf = (value) => (value && value.record ? value.record : value && typeof value.severity === 'number' && 'body' in value ? value : null)

export const isRecord = (value) => !!recordOf(value) && !('level' in (value || {}))

export const attributeOf = (value, key) => {
  const record = recordOf(value)
  return record?.attributes ? record.attributes[key] : undefined
}

export const setAttribute = (value, key, attribute) => {
  const record = recordOf(value)
  if (!record) return
  if (attribute === undefined || attribute === null || attribute === '') delete record.attributes[key]
  else record.attributes[key] = attribute
}

export const isErrorRecord = (record) => !!record && record.severity >= SEVERITY_NUMBER.ERROR
export const isFatalRecord = (record) => !!record && record.severity >= SEVERITY_NUMBER.FATAL

const localStamp = (ms) => {
  if (!ms) return ''
  const date = new Date(ms)
  const two = (n) => pad(n, 2)
  const millis = pad(date.getMilliseconds(), 3)
  return date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate()) + ' ' +
    two(date.getHours()) + ':' + two(date.getMinutes()) + ':' + two(date.getSeconds()) + '.' + millis
}

/** A row in the shape the current viewer, error centre and bundle expect. */
export function recordToRow(record, id = 0) {
  const at = recordTimeMs(record)
  const stamp = String(record.attributes?.['host.stamp'] || localStamp(at))
  const time = String(record.attributes?.['host.time'] || (stamp ? stamp.slice(11) : ''))
  const level = String(record.attributes?.['host.level'] || levelOf(record.severity))
  const session = Number(record.attributes?.['session.id'])
  return {
    id,
    at,
    stamp,
    time,
    level,
    message: record.body,
    session: Number.isInteger(session) ? session : -1,
    severity: record.severity,
    domain: record.domain,
    source: record.source?.id || '',
    record,
  }
}

export const recordsToRows = (records) => (records || []).map((record, id) => recordToRow(record, id))

/** The text form of a record, identical to the line the host wrote (rounded to the stored fields). */
export function formatRecord(record) {
  const row = recordToRow(record)
  return row.stamp ? '[' + row.stamp + ']: ' + row.level + ': ' + row.message : row.message
}

export const recordsToText = (records) => (records || []).map(formatRecord).join('\n')
