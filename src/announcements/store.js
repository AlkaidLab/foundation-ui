// Local storage for dismissed ids and the fetch cache. Storage is injectable and every
// access is guarded: a missing, full or corrupted storage never throws.

export const DISMISSED_KEY = 'foundation-ui.announcements.dismissed'
export const CACHE_KEY = 'foundation-ui.announcements.cache'
// ids of the modals that were shown (once each), and the must-reads that were acknowledged with the time
export const SHOWN_KEY = 'foundation-ui.announcements.shown'
export const ACKED_KEY = 'foundation-ui.announcements.acked'
// when the network was last asked (shared by the windows of one storage), and the developer-mode switch with its local source
export const ATTEMPT_KEY = 'foundation-ui.announcements.attempt'
export const DEV_KEY = 'foundation-ui.dev'
export const SOURCE_KEY = 'foundation-ui.announcements.source'
export const DISMISSED_CAP = 200
// 下次公告更新前不再显示: id -> the revision that was hidden; and the revision every read state was recorded for (a new revision starts again)
export const HIDDEN_KEY = 'foundation-ui.announcements.hidden'
export const REVISIONS_KEY = 'foundation-ui.announcements.revisions'

const ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

const defaultStorage = () => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const read = (storage, key) => {
  try {
    return storage ? storage.getItem(key) : null
  } catch {
    return null
  }
}

const write = (storage, key, value) => {
  try {
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

// Oldest first. Anything that is not a valid id is discarded; duplicates keep the latest position.
export const loadDismissed = (storage = defaultStorage()) => {
  const text = read(storage, DISMISSED_KEY)
  if (!text || text.length > 64 * 1024) return []
  let value
  try {
    value = JSON.parse(text)
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const ids = []
  for (let i = value.length - 1; i >= 0; i -= 1) {
    const id = value[i]
    if (typeof id !== 'string' || !ID_PATTERN.test(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids.reverse().slice(-DISMISSED_CAP)
}

// Marks an id as read. Pass the item (as returned by activeItems) to honour its dismissible
// flag: a non-dismissible item is refused. Returns true when stored.
export const dismiss = (id, { storage = defaultStorage(), item = null } = {}) => {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return false
  if (item && item.dismissible === false) return false
  const ids = loadDismissed(storage).filter((existing) => existing !== id)
  ids.push(id)
  return write(storage, DISMISSED_KEY, JSON.stringify(ids.slice(-DISMISSED_CAP)))
}

export const isDismissed = (id, storage = defaultStorage()) => loadDismissed(storage).includes(id)

export const clearDismissed = (storage = defaultStorage()) => {
  try {
    if (storage) storage.removeItem(DISMISSED_KEY)
  } catch {
    // Nothing to clean up.
  }
}

// Cache record: { at, urls, document } where document is a schema-1 announcements document.
export const readCache = (storage = defaultStorage()) => {
  const text = read(storage, CACHE_KEY)
  if (!text || text.length > 512 * 1024) return null
  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || !Number.isFinite(value.at) || typeof value.document !== 'object') {
      return null
    }
    return { at: value.at, document: value.document }
  } catch {
    return null
  }
}

export const writeCache = (record, storage = defaultStorage()) =>
  write(storage, CACHE_KEY, JSON.stringify({ at: record.at, document: record.document }))

export const clearCache = (storage = defaultStorage()) => {
  try {
    if (storage) storage.removeItem(CACHE_KEY)
  } catch {
    // Nothing to clean up.
  }
}

/** A plain flag or text kept under a key (developer mode, its source); '' when there is none. */
export const readFlag = (storage = defaultStorage(), key) => String(read(storage, key) ?? '')

/** The time the network was last asked, or null. */
export const readAttempt = (storage = defaultStorage()) => {
  const value = Number(read(storage, ATTEMPT_KEY))
  return Number.isFinite(value) && value > 0 ? value : null
}

/** A JSON record kept under any key (the community links use it for their own cache and attempt time); null when missing, too large or not JSON. */
export const readRecord = (storage = defaultStorage(), key, maxBytes = 64 * 1024) => {
  const text = read(storage, key)
  if (!text || text.length > maxBytes) return null
  try { return JSON.parse(text) } catch { return null }
}
export const writeRecord = (storage = defaultStorage(), key, value) => write(storage, key, JSON.stringify(value))

export const writeAttempt = (storage = defaultStorage(), at) => write(storage, ATTEMPT_KEY, String(at))

const loadIds = (storage, key) => {
  const text = read(storage, key)
  if (!text || text.length > 64 * 1024) return []
  try {
    const value = JSON.parse(text)
    return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string' && ID_PATTERN.test(id)))].slice(-DISMISSED_CAP) : []
  } catch {
    return []
  }
}
const addId = (storage, key, id) => {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return false
  const ids = loadIds(storage, key).filter((x) => x !== id)
  ids.push(id)
  return write(storage, key, JSON.stringify(ids.slice(-DISMISSED_CAP)))
}
/** The modals that were shown: each popup comes once. */
export const loadShown = (storage = defaultStorage()) => loadIds(storage, SHOWN_KEY)
export const markShown = (id, storage = defaultStorage()) => addId(storage, SHOWN_KEY, id)
/** The must-reads that were acknowledged, with when (the person's own record; nothing is sent anywhere). */
export const loadAcked = (storage = defaultStorage()) => loadIds(storage, ACKED_KEY)
export const acknowledge = (id, storage = defaultStorage(), at = Date.now()) => {
  if (!addId(storage, ACKED_KEY, id)) return false
  const times = readTimes(storage)
  times[id] = at
  return write(storage, `${ACKED_KEY}.at`, JSON.stringify(times))
}
const readTimes = (storage) => { try { const v = JSON.parse(read(storage, `${ACKED_KEY}.at`) || '{}'); return v && typeof v === 'object' ? v : {} } catch { return {} } }
export const ackedAt = (id, storage = defaultStorage()) => Number(readTimes(storage)[id]) || null

// A small record id -> revision text, capped; anything that is not a valid pair is discarded.
const readRevisionMap = (storage, key) => {
  const text = read(storage, key)
  if (!text || text.length > 64 * 1024) return {}
  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const out = {}
    for (const id of Object.keys(value)) if (ID_PATTERN.test(id) && typeof value[id] === 'string' && value[id].length <= 32) out[id] = value[id]
    return out
  } catch {
    return {}
  }
}
const writeRevisionMap = (storage, key, map) => {
  const ids = Object.keys(map)
  const kept = ids.slice(Math.max(0, ids.length - DISMISSED_CAP))
  const out = {}
  for (const id of kept) out[id] = map[id]
  return write(storage, key, JSON.stringify(out))
}
export const loadHidden = (storage = defaultStorage()) => readRevisionMap(storage, HIDDEN_KEY)
/** 下次公告更新前不再显示: hide this revision of the announcement; a new revision shows it again. */
export const hideUntilUpdate = (id, revision = '1', storage = defaultStorage()) => {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return false
  const map = loadHidden(storage)
  delete map[id]
  map[id] = String(revision)
  return writeRevisionMap(storage, HIDDEN_KEY, map)
}
export const loadRevisions = (storage = defaultStorage()) => readRevisionMap(storage, REVISIONS_KEY)
/** Remember the revision a read state (dismissed, shown, acknowledged) belongs to. */
export const noteRevision = (id, revision = '1', storage = defaultStorage()) => {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return false
  const map = loadRevisions(storage)
  delete map[id]
  map[id] = String(revision)
  return writeRevisionMap(storage, REVISIONS_KEY, map)
}
