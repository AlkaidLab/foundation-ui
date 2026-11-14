import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import { PAGE_FILTER_EVENT, readFilterHash, takePageFilter } from '../search/pageFilter.js'
import { jumpToRow } from '../search/jump.js'

/**
 * A page with a list and its own filter field: when a search result sends a name (requestPageFilter, or `#filter=` in the address) the page fills in the field
 * with it (`apply(query)`), waits for the list to show, then scrolls to the row (`rowSelector(query)`) and pulses it.
 */
export function usePageFilter({ page, apply, rowSelector }) {
  async function run(query) {
    if (query == null) return
    apply(String(query))
    await nextTick()
    void jumpToRow({ selector: rowSelector(String(query)), wait: 250 })
  }
  const fromHash = () => { const q = readFilterHash(globalThis.location?.hash); if (q != null) void run(q) }
  const onRequest = (e) => { if (e.detail?.page === page) void run(takePageFilter(page)) }
  onMounted(() => {
    const waiting = takePageFilter(page)
    if (waiting != null) void run(waiting); else fromHash()
    window.addEventListener(PAGE_FILTER_EVENT, onRequest)
    window.addEventListener('hashchange', fromHash)
  })
  onBeforeUnmount(() => { window.removeEventListener(PAGE_FILTER_EVENT, onRequest); window.removeEventListener('hashchange', fromHash) })
  return { run }
}
