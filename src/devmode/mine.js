// What the person sent through the feedback flows, kept in this window's storage (a list of the last 30): published (an issue number), saved (the zip is on this computer), queued (no network).
export const MINE_KEY = 'foundation-ui.devmode.mine'
const store = () => { try { return globalThis.localStorage } catch { return null } }
export function listMine(storage = store()) {
  try { const v = JSON.parse(storage?.getItem(MINE_KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
export function addMine(entry, storage = store(), now = () => Date.now()) {
  const row = { id: entry.id || `f${now()}`, title: String(entry.title || ''), repo: entry.repo, status: entry.status, n: entry.n || 0, url: entry.url || '', at: entry.at || new Date(now()).toISOString() }
  const next = [row, ...listMine(storage).filter((r) => r.id !== row.id)].slice(0, 30)
  try { storage?.setItem(MINE_KEY, JSON.stringify(next)) } catch { /* not remembered */ }
  return next
}
