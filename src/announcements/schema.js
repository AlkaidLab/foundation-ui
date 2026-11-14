// Announcement file schema (version 1): validation and normalisation.
// Pure and framework-free. See docs/announcements.md for the format.

export const SCHEMA_VERSION = 1
export const SEVERITIES = Object.freeze(['info', 'warn', 'critical'])
// How an item is shown: `notice` is the strip and the list (the default); `modal` is a popup that is not forced, shown once and closable; `must-read` is a forced popup that cannot be closed
// before its text has been scrolled to the end and its countdown has run out (the person then acknowledges it).
export const MODES = Object.freeze(['notice', 'modal', 'must-read'])
export const COUNTDOWN = Object.freeze({ min: 0, max: 60, fallback: 5 })
// What an item is about (the tabs of the home tile: 公告, 更新, 教程), and how it looks: only `warning` is drawn with the warning colours, a notice is content.
export const CATEGORIES = Object.freeze(['announce', 'update', 'guide'])
export const TYPES = Object.freeze(['notice', 'warning'])
// `importance` is the plain name of `mode`: normal is a notice, popup a modal, must-read stays.
export const IMPORTANCE = Object.freeze({ normal: 'notice', popup: 'modal', 'must-read': 'must-read' })

export const LIMITS = Object.freeze({
  maxItems: 50,
  // Entries inspected before giving up, so a hostile file cannot cost much.
  maxScanned: 500,
  maxFileBytes: 256 * 1024,
  maxTitle: 120,
  maxBody: 8000,
  maxUrl: 500,
  maxVersion: 64,
  maxLocales: 40,
  maxLocaleKey: 20,
})

const ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:[_-][A-Za-z0-9]{2,8}){0,3}$/
// ISO-8601: a calendar date, or a date-time that carries an explicit offset.
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2}))?$/
const VERSION_PATTERN = /^[vV]?\d+(?:\.\d+)*/
const REVISION_PATTERN = /^[A-Za-z0-9._-]{1,32}$/

// C0 and C1 controls, line/paragraph separators, byte order mark and the bidirectional
// override/isolate controls (they can reorder displayed text). Newlines are kept in bodies only.
const CONTROL_ALL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\ufeff\u202a-\u202e\u2066-\u2069]/g
const CONTROL_KEEP_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029\ufeff\u202a-\u202e\u2066-\u2069]/g

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const codePoints = (text) => {
  let count = 0
  for (const _ of text) count += 1 // eslint-disable-line no-unused-vars
  return count
}

// Returns the cleaned text, or null when the value is not a usable string.
export const cleanText = (value, { max, multiline = false }) => {
  if (typeof value !== 'string') return null
  // UTF-16 length is an upper bound on the code point count; reject huge strings before any scan.
  if (value.length > max * 2) return null
  let text = multiline ? value.replace(/\r\n?/g, '\n') : value
  text = text.replace(multiline ? CONTROL_KEEP_NEWLINE : CONTROL_ALL, '').trim()
  if (!text || codePoints(text) > max) return null
  return text
}

// Locale keyed text map. Entries that are invalid or over the limit are dropped one by one.
const cleanTextMap = (value, options) => {
  if (!isPlainObject(value)) return null
  const out = {}
  let kept = 0
  for (const key of Object.keys(value)) {
    if (kept >= LIMITS.maxLocales) break
    if (key.length > LIMITS.maxLocaleKey || !LOCALE_PATTERN.test(key)) continue
    const text = cleanText(value[key], options)
    if (text === null) continue
    out[key] = text
    kept += 1
  }
  return out
}

const parseUrl = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > LIMITS.maxUrl) return null
  if (/[\u0000- \u007f-\u009f]/.test(value)) return null
  let url
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null
  return url.href.length <= LIMITS.maxUrl ? url.href : null
}

// Returns milliseconds since the epoch or null. A date-time must carry Z or an offset.
export const parseIsoDate = (value) => {
  if (typeof value !== 'string' || value.length > 40) return null
  const match = DATE_PATTERN.exec(value)
  if (!match) return null
  const [, y, mo, d, h = '0', mi = '0', s = '0', zone] = match
  const year = Number(y)
  const month = Number(mo)
  const day = Number(d)
  if (month < 1 || month > 12 || day < 1) return null
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day > daysInMonth || Number(h) > 23 || Number(mi) > 59 || Number(s) > 59) return null
  const time = Date.parse(zone ? value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2') : `${value}T00:00:00Z`)
  return Number.isFinite(time) ? time : null
}

const cleanVersion = (value) => {
  if (typeof value !== 'string' || value.length > LIMITS.maxVersion) return null
  const text = value.trim()
  return VERSION_PATTERN.test(text) ? text : null
}

// Returns one normalised item or null. Unknown fields are ignored.
const normaliseItem = (raw) => {
  if (!isPlainObject(raw)) return null
  if (typeof raw.id !== 'string' || !ID_PATTERN.test(raw.id)) return null
  if (!SEVERITIES.includes(raw.severity)) return null

  const title = cleanTextMap(raw.title, { max: LIMITS.maxTitle })
  if (!title || Object.keys(title).length === 0) return null
  let body = {}
  if (raw.body !== undefined && raw.body !== null) {
    body = cleanTextMap(raw.body, { max: LIMITS.maxBody, multiline: true })
    if (!body) return null
  }

  let url = null
  if (raw.url !== undefined && raw.url !== null) {
    url = parseUrl(raw.url)
    if (!url) return null
  }

  // a banner image (3:2, https only) for the home tile and the top of the announcement
  let banner = null
  if (raw.banner !== undefined && raw.banner !== null) {
    banner = parseUrl(raw.banner)
    if (!banner) return null
  }
  let category = 'announce'
  if (raw.category !== undefined && raw.category !== null) {
    if (!CATEGORIES.includes(raw.category)) return null
    category = raw.category
  }
  // `type: warning` is the only thing drawn as a warning; without it the old severity decides (warn and critical are warnings, info is not)
  let type = raw.severity === 'info' ? 'notice' : 'warning'
  if (raw.type !== undefined && raw.type !== null) {
    if (!TYPES.includes(raw.type)) return null
    type = raw.type
  }
  // the date shown in lists; `starts` is the fallback
  let published = null
  if (raw.published !== undefined && raw.published !== null) {
    published = parseIsoDate(raw.published)
    if (published === null) return null
  }
  // the version of the content: when it changes, 下次公告更新前不再显示 and the read state start again
  let revision = '1'
  if (raw.revision !== undefined && raw.revision !== null) {
    const text = typeof raw.revision === 'number' && Number.isInteger(raw.revision) && raw.revision >= 0 ? String(raw.revision) : raw.revision
    if (typeof text !== 'string' || !REVISION_PATTERN.test(text)) return null
    revision = text
  }

  let starts = null
  if (raw.starts !== undefined && raw.starts !== null) {
    starts = parseIsoDate(raw.starts)
    if (starts === null) return null
  }
  let ends = null
  if (raw.ends !== undefined && raw.ends !== null) {
    ends = parseIsoDate(raw.ends)
    if (ends === null) return null
  }
  if (starts !== null && ends !== null && ends <= starts) return null

  let minVersion = null
  if (raw.minVersion !== undefined && raw.minVersion !== null) {
    minVersion = cleanVersion(raw.minVersion)
    if (minVersion === null) return null
  }
  let maxVersion = null
  if (raw.maxVersion !== undefined && raw.maxVersion !== null) {
    maxVersion = cleanVersion(raw.maxVersion)
    if (maxVersion === null) return null
  }

  let mode = 'notice'
  if (raw.mode !== undefined && raw.mode !== null) {
    if (!MODES.includes(raw.mode)) return null
    mode = raw.mode
  }
  if (raw.importance !== undefined && raw.importance !== null) {
    if (!Object.prototype.hasOwnProperty.call(IMPORTANCE, raw.importance)) return null
    mode = IMPORTANCE[raw.importance]
  }
  // seconds before a must-read can be acknowledged; only that mode has one
  let countdown = 0
  if (mode === 'must-read') {
    countdown = COUNTDOWN.fallback
    if (raw.countdown !== undefined && raw.countdown !== null) {
      if (!Number.isInteger(raw.countdown) || raw.countdown < COUNTDOWN.min || raw.countdown > COUNTDOWN.max) return null
      countdown = raw.countdown
    }
  }

  let pinned = false
  if (raw.pinned !== undefined && raw.pinned !== null) {
    if (typeof raw.pinned !== 'boolean') return null
    pinned = raw.pinned
  }

  return { id: raw.id, severity: raw.severity, mode, countdown, title, body, url, starts, ends, minVersion, maxVersion, pinned, category, type, banner, published, revision }
}

// True for a document this version of the schema understands (it may hold zero items).
export const isAnnouncementDocument = (json) =>
  isPlainObject(json) && json.schema === SCHEMA_VERSION && Array.isArray(json.items)

// Validates a decoded JSON document. Never throws; anything unusable yields [].
export const parseAnnouncements = (json) => {
  try {
    if (!isPlainObject(json) || json.schema !== SCHEMA_VERSION || !Array.isArray(json.items)) return []
    const items = []
    const seen = new Set()
    const scan = Math.min(json.items.length, LIMITS.maxScanned)
    for (let i = 0; i < scan && items.length < LIMITS.maxItems; i += 1) {
      const item = normaliseItem(json.items[i])
      if (!item || seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
    return items
  } catch {
    return []
  }
}

// Inverse of parse for storage: a document that parseAnnouncements accepts unchanged.
export const toDocument = (items) => ({
  schema: SCHEMA_VERSION,
  items: items.map((item) => {
    const out = { id: item.id, severity: item.severity, title: item.title, body: item.body }
    if (item.url) out.url = item.url
    if (item.starts !== null) out.starts = new Date(item.starts).toISOString()
    if (item.ends !== null) out.ends = new Date(item.ends).toISOString()
    if (item.minVersion) out.minVersion = item.minVersion
    if (item.maxVersion) out.maxVersion = item.maxVersion
    if (item.pinned) out.pinned = true
    if (item.mode && item.mode !== 'notice') out.mode = item.mode
    if (item.mode === 'must-read') out.countdown = item.countdown
    if (item.category && item.category !== 'announce') out.category = item.category
    if (item.banner) out.banner = item.banner
    if (item.published) out.published = new Date(item.published).toISOString()
    if (item.revision && item.revision !== '1') out.revision = item.revision
    if (item.type && item.type !== (item.severity === 'info' ? 'notice' : 'warning')) out.type = item.type
    return out
  }),
})
