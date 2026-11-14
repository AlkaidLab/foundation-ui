// Recent searches: the last few queries a person opened a result with, kept locally (one list per interface), each one removable.
export const RECENT_SEARCH_MAX = 8
export const RECENT_SEARCH_KEY = 'foundation-ui.search.recent'

export function pushQuery(list, query, max = RECENT_SEARCH_MAX) {
  const q = String(query ?? '').trim()
  if (!q) return list
  return [q, ...list.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, max)
}
export const removeQuery = (list, query) => list.filter((x) => x !== query)

export function loadQueries(storage, key = RECENT_SEARCH_KEY) {
  try {
    const value = JSON.parse(storage?.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter((x) => typeof x === 'string' && x.trim()).slice(0, RECENT_SEARCH_MAX) : []
  } catch { return [] }
}
export function saveQueries(storage, list, key = RECENT_SEARCH_KEY) {
  try { list.length ? storage?.setItem(key, JSON.stringify(list)) : storage?.removeItem(key) } catch { /* storage unavailable */ }
}
