// Landing on a row of a page after a search hit: find it (the page may still be loading, so look again for a moment), scroll the pane that holds it so the
// row sits in the upper third, and pulse it (the highlight of Android's settings search: the row's ground flares and fades, twice).
export const HIT_CLASS = 'm-hit'
export const HIT_MS = 1800

const scrollable = (el, doc) => {
  let pane = el.parentElement
  while (pane && pane !== doc.body && pane.scrollHeight <= pane.clientHeight + 1) pane = pane.parentElement
  return pane && pane !== doc.body ? pane : null
}

/**
 * jumpToRow({ selector, root, tries, wait, pulse, timers }) -> Promise<boolean> (true when the row was found and pulsed).
 * `timers` is { sleep(ms) } for tests; the default waits for real.
 */
export async function jumpToRow({ selector, root = globalThis.document, tries = 12, wait = 200, pulse = HIT_MS, timers = null } = {}) {
  const sleep = timers?.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  for (let i = 0; i <= tries; i++) {
    await sleep(wait)
    const row = root.querySelector(selector)
    if (!row) continue
    const pane = scrollable(row, root.ownerDocument || root)
    if (pane) {
      const offset = row.getBoundingClientRect().top - pane.getBoundingClientRect().top
      pane.scrollTo({ top: pane.scrollTop + offset - pane.clientHeight / 3, behavior: 'smooth' })
    }
    row.classList.remove(HIT_CLASS)
    void row.offsetWidth // restart the animation when the same row is hit again
    row.classList.add(HIT_CLASS)
    setTimeout(() => row.classList.remove(HIT_CLASS), pulse)
    return true
  }
  return false
}
