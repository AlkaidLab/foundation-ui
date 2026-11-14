import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Sub-pages the way Android Settings does them: a row opens a page, the back arrow (or the browser's back) returns.
 * One level is tracked through history state, so the Back button and the app's own back arrow behave the same.
 */
export function useSubpage(key = 'm3e') {
  const current = ref('')
  const read = () => (typeof history !== 'undefined' && history.state && history.state[key]) || ''
  const onPop = () => { current.value = read() }
  onMounted(() => { current.value = read(); window.addEventListener('popstate', onPop) })
  onBeforeUnmount(() => window.removeEventListener('popstate', onPop))
  // In a frame (the Web UI in the control panel) the page adds no entry to the window's history: the panel's Back (the mouse button) would undo that entry first and nothing would change on screen.
  const inFrame = () => typeof window !== 'undefined' && window.parent !== window
  // `replace`: the page opens by itself (a place's first page, a link to a page of it): the entry of the window's history that is there carries it, so one Back leaves the page
  const open = (id, replace = false) => {
    current.value = id
    const state = { ...(history.state || {}), [key]: id }
    if (replace || inFrame()) history.replaceState(state, '')
    else history.pushState(state, '')
  }
  const back = () => {
    if (inFrame()) {
      const { [key]: _gone, ...rest } = history.state || {}
      history.replaceState(rest, '')
      current.value = ''
    } else if (read()) history.back()
    else current.value = ''
  }
  return { current, open, back }
}
