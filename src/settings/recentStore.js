// The one list of the settings used last in a window: the search, the settings pages and the tile 最近操作 read and write the same ref, and it is kept in local storage.
// A window that can change the host it manages (the desktop panel, whose proxy can point the whole window at another host) scopes the list to that host with
// scopeRecent; the Web UI never scopes, because its storage already belongs to the origin it was served from.
import { ref } from 'vue'
import { RECENT_KEY, loadRecent, pushRecent, saveRecent } from './recent.js'

const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null)
/** The keys the person used last, newest first. */
export const recentKeys = ref(loadRecent(storage()))
let activeKey = RECENT_KEY
/** The storage key of the list of one host (a window that never switches hosts uses the plain key). */
export const hostRecentKey = (hostId) => (hostId ? `${RECENT_KEY}:${hostId}` : RECENT_KEY)
/**
 * The window now manages this host, so the list becomes this host's. The first scoping keeps the entries the window already has (they are the current
 * host's); every later host starts empty, so the settings used on one host are never suggested as the settings of another.
 */
export function scopeRecent(storageKey) {
  const key = storageKey || RECENT_KEY
  if (key === activeKey) return
  const s = storage()
  const seededKey = `${RECENT_KEY}:seeded`
  if (s && key !== RECENT_KEY && loadRecent(s, key).length === 0 && !s.getItem(seededKey)) {
    const seed = loadRecent(s, RECENT_KEY)
    if (seed.length) saveRecent(s, seed, key)
    try { s.setItem(seededKey, '1') } catch { /* storage unavailable */ }
  }
  activeKey = key
  recentKeys.value = loadRecent(s, key)
}
/** A setting was used (changed or opened): it goes to the top of the list, here and in the storage. */
export function rememberRecent(keyName, storageKey = activeKey) {
  if (!keyName) return
  recentKeys.value = pushRecent(recentKeys.value, keyName)
  saveRecent(storage(), recentKeys.value, storageKey)
}
export function clearRecentKeys(storageKey = activeKey) { recentKeys.value = []; saveRecent(storage(), [], storageKey) }
