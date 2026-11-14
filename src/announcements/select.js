// Selection of announcements to show: window, version range, locale, priority, read state.

const SEVERITY_RANK = { critical: 0, warn: 1, info: 2 }

// Dotted numeric version. A leading "v" and anything after the numeric part are ignored,
// so "v2026.925.152547.suffix" and "1.2.3-beta.1" compare as 2026.925.152547 and 1.2.3.
export const parseVersion = (value) => {
  if (typeof value !== 'string') return null
  const match = /^\s*[vV]?(\d+(?:\.\d+)*)/.exec(value)
  if (!match) return null
  return match[1].split('.').slice(0, 8).map((part) => Number(part.slice(0, 15)))
}

// -1, 0 or 1; null when either side has no usable version.
export const compareVersions = (a, b) => {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) return null
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i += 1) {
    const x = left[i] ?? 0
    const y = right[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

const normaliseLocale = (locale) =>
  typeof locale === 'string' ? locale.trim().replace(/_/g, '-').toLowerCase() : ''

// Exact locale, then its language prefix, then any key of the same language, then en,
// then the first key present. Returns the chosen key or null.
export const resolveLocaleKey = (map, locale) => {
  const keys = map && typeof map === 'object' ? Object.keys(map) : []
  if (keys.length === 0) return null
  const byNormal = new Map()
  for (const key of keys) {
    const normal = normaliseLocale(key)
    if (!byNormal.has(normal)) byNormal.set(normal, key)
  }
  const wanted = normaliseLocale(locale)
  if (wanted) {
    if (byNormal.has(wanted)) return byNormal.get(wanted)
    const parts = wanted.split('-')
    for (let n = parts.length - 1; n >= 1; n -= 1) {
      const prefix = parts.slice(0, n).join('-')
      if (byNormal.has(prefix)) return byNormal.get(prefix)
    }
    const language = parts[0]
    for (const [normal, key] of byNormal) {
      if (normal.split('-')[0] === language) return key
    }
  }
  if (byNormal.has('en')) return byNormal.get('en')
  return keys[0]
}

export const resolveText = (map, locale) => {
  const key = resolveLocaleKey(map, locale)
  return key === null ? '' : map[key]
}

// A critical item cannot be dismissed while it is in its window; it leaves when `ends` passes.
// Without `ends` it is never dismissible. Other severities are always dismissible.
export const isDismissible = (item, now) =>
  !item.builtin && (item.mode || 'notice') === 'notice' && (item.severity !== 'critical' || (item.ends !== null && now >= item.ends))

const toIdSet = (dismissed) => {
  if (dismissed instanceof Set) return dismissed
  return new Set(Array.isArray(dismissed) ? dismissed.filter((id) => typeof id === 'string') : [])
}

const inVersionRange = (item, version) => {
  if (item.minVersion === null && item.maxVersion === null) return true
  // A bound that cannot be evaluated (unknown running version) hides the item.
  if (item.minVersion !== null) {
    const cmp = compareVersions(version, item.minVersion)
    if (cmp === null || cmp < 0) return false
  }
  if (item.maxVersion !== null) {
    const cmp = compareVersions(version, item.maxVersion)
    if (cmp === null || cmp > 0) return false
  }
  return true
}

const byPriority = (a, b) =>
  SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  || Number(b.pinned) - Number(a.pinned)
  || (b.published ?? b.starts ?? -Infinity) - (a.published ?? a.starts ?? -Infinity)
  || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

// Items to show now, in priority order, as display records with resolved text.
// Dismissed items stay in the list with read: true; use topItem for the one to surface.
export const activeItems = (items, { now = Date.now(), version = null, locale = 'en', dismissed = [], shown = [], acked = [], hidden = {}, revisions = {} } = {}) => {
  if (!Array.isArray(items)) return []
  const ids = toIdSet(dismissed)
  const shownIds = toIdSet(shown)
  const ackedIds = toIdSet(acked)
  const time = typeof now === 'function' ? now() : now
  const out = []
  for (const item of items) {
    if (!item || typeof item.id !== 'string') continue
    if (item.starts !== null && time < item.starts) continue
    if (item.ends !== null && time >= item.ends) continue
    if (!inVersionRange(item, version)) continue
    const dismissible = isDismissible(item, time)
    const revision = item.revision || '1'
    // a read state counts only for the revision it was recorded for; an id without a record is the first revision
    const current = revisions[item.id] === undefined || revisions[item.id] === revision
    out.push({
      id: item.id,
      severity: item.severity,
      title: resolveText(item.title, locale),
      body: resolveText(item.body, locale),
      url: item.url,
      starts: item.starts,
      ends: item.ends,
      pinned: item.pinned,
      mode: item.mode || 'notice',
      countdown: item.countdown || 0,
      // read: a notice that was dismissed, a modal that was shown, a must-read that was acknowledged
      read: current && (item.mode === 'must-read' ? ackedIds.has(item.id) : item.mode === 'modal' ? shownIds.has(item.id) : dismissible && ids.has(item.id)),
      dismissible,
      builtin: !!item.builtin,
      category: item.category || 'announce',
      type: item.type || (item.severity === 'info' ? 'notice' : 'warning'),
      banner: item.banner || null,
      published: item.published ?? item.starts ?? null,
      revision,
      // 下次公告更新前不再显示 was chosen for this revision: no popup, the list keeps it
      snoozed: hidden[item.id] === revision,
    })
  }
  return out.sort(byPriority)
}

// The single item to surface: the highest priority one the user has not dismissed.
// The strip shows notices only: a modal and a must-read come as popups (popupItem).
export const topItem = (items, options) => activeItems(items, options).find((item) => item.mode === 'notice' && !item.read && !item.builtin) ?? null

// The popup to show now: a must-read first (it blocks), else a modal that was not shown yet; null when there is none.
export const popupItem = (items, options) => {
  const open = activeItems(items, options).filter((item) => item.mode !== 'notice' && !item.read && !item.snoozed)
  return open.find((item) => item.mode === 'must-read') ?? open[0] ?? null
}

// A must-read can be confirmed once its text was scrolled to the end (a text that fits needs no scroll). There is no countdown and nothing else to wait for.
export const mustReadReady = ({ atEnd }) => !!atEnd

