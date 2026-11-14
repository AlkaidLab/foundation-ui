import { onBeforeUnmount, onMounted } from 'vue'

// Fit-to-room for the rows of a tile (fs52-tiles-real-fit). A list, a row of chips or a block stack that has more entries than its tile has room for does not end in a cut row: it shows the entries
// that fit whole and takes the rest out of the layout (display: none), so nothing is cut by the tile's edge or by the list's own clip and nothing overflows onto the title above. Mark the container with
// `data-fit-rows` (it keeps its first entry) or `data-fit-rows="drop"` (even the first entry goes when it has no room). The entries are the container's children; the last visible entry goes first.
export const FIT_ROWS_SELECTOR = '[data-fit-rows]'
const EPS = 0.75

/** The entries of `box` that stick out of its room: below the tile's content edge (or the box's own clip), or above the box's top. */
export function overflowing(box, kids) {
  const tile = box.closest('.m-tile') || box
  const tr = tile.getBoundingClientRect(), tcs = getComputedStyle(tile)
  const br = box.getBoundingClientRect(), bcs = getComputedStyle(box)
  let bottom = tr.bottom - (parseFloat(tcs.paddingBottom) || 0)
  if (bcs.overflowY !== 'visible') bottom = Math.min(bottom, br.bottom)
  const top = br.top // a box of fixed room whose entries sit at its end (justify-content: flex-end) overflows upward, over the title
  return kids.some((k) => { const r = k.getBoundingClientRect(); return r.height > 0 && (r.bottom > bottom + EPS || r.top < top - EPS) })
}

export function fitRows(box) {
  const all = [...box.children]
  for (const k of all) if (k.hasAttribute('data-fit-hidden')) { k.style.removeProperty('display'); k.removeAttribute('data-fit-hidden') }
  const cs = getComputedStyle(box); if (cs.display === 'none') return
  const keep = box.getAttribute('data-fit-rows') === 'drop' ? 0 : 1
  const shown = all.filter((k) => getComputedStyle(k).display !== 'none')
  while (shown.length > keep && overflowing(box, shown)) {
    const k = shown.pop(); k.style.display = 'none'; k.setAttribute('data-fit-hidden', '')
  }
}

/** Fits the rows of every marked container under `rootRef` after it is drawn, when a tile or the window changes size, and when the content changes (one pass per frame). */
export function useFitRows(rootRef) {
  let raf = 0, ro = null, mo = null
  const pass = () => {
    raf = 0; const root = rootRef.value; if (!root) return
    for (const box of root.querySelectorAll(FIT_ROWS_SELECTOR)) { const t = box.closest('.m-tile'); if (t) ro?.observe(t); fitRows(box) }
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(pass) }
  onMounted(() => {
    queue()
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(queue); ro.observe(rootRef.value) }
    if (typeof MutationObserver !== 'undefined') { mo = new MutationObserver(queue); mo.observe(rootRef.value, { childList: true, characterData: true, subtree: true }) }
    if (typeof document !== 'undefined' && document.fonts) { document.fonts.ready?.then(queue); document.fonts.addEventListener?.('loadingdone', queue) } // a font that arrives late changes every width
  })
  onBeforeUnmount(() => { ro?.disconnect(); mo?.disconnect(); if (typeof document !== 'undefined') document.fonts?.removeEventListener?.('loadingdone', queue); if (raf) cancelAnimationFrame(raf) })
}
