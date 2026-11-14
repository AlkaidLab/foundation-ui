// How the list pane meets the rest of the window, a setting of 个性化: 'merged' (the default: the list is the frame's own surface, one continuous chrome of caption bar, rail and list, and the
// content area with its rounded corner at the list's edge) or 'one' (the list and the detail are ONE continuous surface, the content panel; the list has no column of its own, no seam and no
// bottom edge, its rows carry the grouping). Anything else, a stored 'step' of an earlier build included, is 'merged'.
// The choice is part of the appearance record (appearance.js listStyle) and applyInterfaceLook puts it on the page as html[data-list]; shell-blend.css does the rest. The same value is mirrored in
// localStorage 'foundation-ui.listStyle' so the first frame of the next start already has it, and `?liststyle=` in the address overrides both for that page (the test robots use it).
export const LIST_STYLE_KEY = 'foundation-ui.listStyle'
export const LIST_STYLES = Object.freeze(['merged', 'one'])
export const DEFAULT_LIST_STYLE = 'merged'

/** The style from the address query and the stored value ('merged' for anything else). A valid query wins. */
export function listStyleOf(search = '', stored = '') {
  const fromQuery = new URLSearchParams(search).get('liststyle')
  if (LIST_STYLES.includes(fromQuery)) return fromQuery
  return LIST_STYLES.includes(stored) ? stored : DEFAULT_LIST_STYLE
}

/** The first frame: the mirror (or the address) before the appearance record has arrived. */
export function applyListStyle(root = typeof document !== 'undefined' ? document.documentElement : null, { search = typeof location !== 'undefined' ? location.search : '', storage = typeof localStorage !== 'undefined' ? localStorage : null } = {}) {
  if (!root) return DEFAULT_LIST_STYLE
  let stored = ''
  try { stored = storage?.getItem(LIST_STYLE_KEY) || '' } catch { /* no storage */ }
  const style = listStyleOf(search, stored)
  root.dataset.list = style
  return style
}

/** The record's choice on the page (the address still overrides it) and its mirror for the next first frame. */
export function setListStyle(root, value, { search = typeof location !== 'undefined' ? location.search : '', storage = typeof localStorage !== 'undefined' ? localStorage : null } = {}) {
  const chosen = LIST_STYLES.includes(value) ? value : DEFAULT_LIST_STYLE
  try { if (storage && storage.getItem(LIST_STYLE_KEY) !== chosen) storage.setItem(LIST_STYLE_KEY, chosen) } catch { /* not kept */ }
  const style = listStyleOf(search, chosen)
  root.dataset.list = style
  return style
}
