// "Recently used" settings: the last few the person changed or opened, kept locally. Only keys are stored; the labels
// are resolved from the index when shown, so they follow the interface language.
export const RECENT_MAX = 8 // the tile 最近操作 shows eight at 特大
export const RECENT_KEY = 'foundation-ui.settings.recent'

export function pushRecent(list, id, max = RECENT_MAX) {
  if (!id) return list
  return [id, ...list.filter((x) => x !== id)].slice(0, max)
}

export function loadRecent(storage, key = RECENT_KEY) {
  try {
    const value = JSON.parse(storage?.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter((x) => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch { return [] }
}

export function saveRecent(storage, list, key = RECENT_KEY) {
  try { list.length ? storage?.setItem(key, JSON.stringify(list)) : storage?.removeItem(key) } catch { /* storage unavailable */ }
}

/** The list rows of the recent keys that the index still knows: [{ id, label, text (the place) }]. */
export function recentRows(list, entries) {
  const byId = new Map(entries.filter((e) => e.keyName).map((e) => [e.keyName, e]))
  return list.map((id) => byId.get(id)).filter(Boolean).map((e) => ({ id: e.keyName, label: e.title, text: e.path, entry: e }))
}
