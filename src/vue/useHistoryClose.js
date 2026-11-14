import { onBeforeUnmount, watch } from 'vue'

/**
 * A sheet is a place the person went to: Back (the mouse button, Alt+Left) closes it and does not leave the page under it. While it is open it has an entry of its own in the window's history
 * (the entry carries the state of the page, so the stack of the shell reads the same place); a Back to the entry below closes the sheet. A sheet closed by other means takes its entry away again,
 * when that entry is still the one on top. A sheet that cannot be dismissed (`persistent`) has none. A sheet that is open from the page's first moment (a page opened on an address that names it:
 * /downloads?platform=android) was not gone to by the person: it has no entry, and Back leaves the page for the place the person came from.
 */
export function useHistoryClose(open, close, persistent = () => false) {
  if (typeof window === 'undefined' || typeof history === 'undefined') return
  let mine = false
  let opened = 0
  let first = true
  const onPop = () => { if (mine && !history.state?.sheetOpen) { mine = false; close() } }
  // Closing never waits on the history: a Back to the sheet's entry is a traversal that the window (with a frame in it) answers when it can, and its popstate runs the listeners of the page.
  // Esc closed the 连接设备 sheet in 460 ms when that sat in the way of the paint. The entry is taken away once the close has been painted, if it is still the one on top and no sheet was opened since.
  const drop = (token) => { if (token === opened && history.state?.sheetOpen) history.back() }
  const later = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(fn, 120)) : setTimeout(fn, 120))
  watch(open, (value) => {
    const withThePage = first; first = false
    if (value && !mine && !persistent() && !withThePage) {
      history.pushState({ ...(history.state || {}), sheetOpen: true }, '')
      mine = true
      opened++
    } else if (!value && mine) {
      mine = false
      const token = opened
      later(() => drop(token))
    }
  }, { immediate: true, flush: 'sync' })
  window.addEventListener('popstate', onPop)
  onBeforeUnmount(() => window.removeEventListener('popstate', onPop))
}
