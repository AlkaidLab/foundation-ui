// Opening a client or an application from the search: its page opens with the page's own filter field filled in with the name, scrolls to the row and pulses it.
// Two ways to ask, because the page may be in the same document (the Web UI's shell) or in a frame of the control panel:
//   requestPageFilter(page, query)       the page is (or is about to be) in this document: the page takes the request when it mounts or at once if it is open
//   filterHash(query) / readFilterHash   the page is in a frame: the address carries it (`/pin#filter=Pixel%209`); a page reads it when it opens and when it changes
export const PAGE_FILTER_EVENT = 'foundation-page-filter'
const pending = new Map()

export function requestPageFilter(page, query, target = globalThis.window) {
  pending.set(page, String(query ?? ''))
  target?.dispatchEvent?.(new CustomEvent(PAGE_FILTER_EVENT, { detail: { page } }))
}
/** The query waiting for a page (once), or null. */
export function takePageFilter(page) {
  if (!pending.has(page)) return null
  const q = pending.get(page)
  pending.delete(page)
  return q
}
export const filterHash = (query) => `#filter=${encodeURIComponent(String(query ?? ''))}`
export function readFilterHash(hash) {
  const m = /(?:^#|&)filter=([^&]*)/.exec(String(hash ?? ''))
  if (!m) return null
  try { return decodeURIComponent(m[1]) } catch { return m[1] }
}
