// The logic of the menu window (MMenuPopup): what the window shows at each level of a menu, what a key does, the theme of the window the menu belongs to. Plain functions, no DOM beyond what is passed in.
//
// The window shows ONE level at a time, as the in-page menu does: a submenu replaces the items by [back, divider, ...its items], so a submenu never has to open beside the window. Right enters the
// focused submenu, Left (or the back item) goes up one level.

/** Room around the menu surface inside the window for its elevation (the window is transparent): CSS px. The host places the surface, not the window, at the pointer. */
export const POPUP_PAD = 16
export const BACK_ID = '__back'

/** The items of one level: the model's items, or, inside a submenu, the way back and its items. `trail` is the indexes of the submenus entered. Each entry carries `ix`, its index in its level (-1: the way back). */
export function levelItems(model, trail = [], backLabel = 'Back') {
  let list = model || []
  for (const index of trail) {
    const parent = list[index]
    if (!parent || !Array.isArray(parent.children)) return levelItems(model, [], backLabel)
    list = parent.children
  }
  const own = list.map((item, ix) => ({ ...item, ix, keepOpen: Array.isArray(item.children) && item.children.length ? true : item.keepOpen }))
  if (!trail.length) return own
  return [{ id: BACK_ID, label: backLabel, icon: 'arrow_back', ix: -1, keepOpen: true }, { id: '__back-divider', divider: true, ix: -2 }, ...own]
}

/** What choosing an entry of the shown level does: go up, go into a submenu, or answer with the path of the item. `entry` is an item of levelItems(). */
export function choose(model, trail, entry) {
  if (!entry || entry.divider || entry.disabled) return { kind: 'none' }
  if (entry.ix === -1) return { kind: 'up', trail: trail.slice(0, -1) }
  if (Array.isArray(entry.children) && entry.children.length) return { kind: 'into', trail: [...trail, entry.ix] }
  return { kind: 'pick', path: [...trail, entry.ix] }
}

/** The arrow keys that change the level: Right on an item that has a submenu enters it; Left inside a submenu goes up. */
export function levelKey(key, { entry, depth, rtl = false }) {
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
  const backward = rtl ? 'ArrowRight' : 'ArrowLeft'
  if (key === forward && entry && !entry.divider && !entry.disabled && Array.isArray(entry.children) && entry.children.length) return 'into'
  if (key === backward && depth > 0) return 'up'
  return null
}

/** The size of the menu to show: the surface as measured (CSS px), its height cut to what the work area allows (the menu scrolls inside). */
export function menuSize({ width, height, maxHeight }) {
  const w = Math.max(1, Math.ceil(width))
  const natural = Math.max(1, Math.ceil(height))
  const cap = Number.isFinite(maxHeight) && maxHeight > 0 ? Math.floor(maxHeight) : Infinity
  return { w, h: Math.min(natural, cap), capped: natural > cap }
}

// ---- the theme of the window that opened the menu --------------------------------------------------------------------------------------------------------------------------------------------
// The colours of a window are one <style id="foundation-ui-theme"> and a few attributes of <html>; the menu window is another document, so the host sends both along with the menu. The wallpaper stays
// behind (a menu has no use for it and it can be megabytes).

const THEME_SHEET = 'foundation-ui-theme'
const SKIP_ATTR = new Set(['class', 'style', 'data-wallpaper', 'data-wallpaper-id', 'data-picture-stats', 'data-frost', 'data-scrim-ratio'])
const SKIP_CLASS = new Set(['m-has-wallpaper', 'm-theming', 'm-theme-fade'])

/** `{ sheet, attrs, classes, vars, lang }` of a document: what the menu window needs to look like it. */
export function themeSnapshot(doc = globalThis.document) {
  const root = doc?.documentElement
  if (!root) return null
  const attrs = {}
  for (const attr of Array.from(root.attributes || [])) if (!SKIP_ATTR.has(attr.name)) attrs[attr.name] = attr.value
  const vars = {}
  const style = root.style
  for (let i = 0; style && i < style.length; i++) {
    const name = style[i]
    if (name.startsWith('--') && !name.startsWith('--m-wallpaper')) vars[name] = style.getPropertyValue(name)
  }
  const classes = Array.from(root.classList || []).filter((c) => !SKIP_CLASS.has(c))
  return { sheet: doc.getElementById?.(THEME_SHEET)?.textContent || '', attrs, classes, vars, lang: root.lang || '' }
}

/** Gives the menu window's document the theme of a snapshot. */
export function applyThemeSnapshot(doc, snap) {
  const root = doc?.documentElement
  if (!root || !snap) return
  let sheet = doc.getElementById(THEME_SHEET)
  if (!sheet) { sheet = doc.createElement('style'); sheet.id = THEME_SHEET; doc.head.appendChild(sheet) }
  if (snap.sheet && sheet.textContent !== snap.sheet) sheet.textContent = snap.sheet
  for (const attr of Array.from(root.attributes || [])) if (!SKIP_ATTR.has(attr.name) && !(attr.name in (snap.attrs || {}))) root.removeAttribute(attr.name)
  for (const [name, value] of Object.entries(snap.attrs || {})) if (root.getAttribute(name) !== value) root.setAttribute(name, value)
  root.className = (snap.classes || []).join(' ')
  const style = root.style
  for (let i = style.length - 1; i >= 0; i--) { const name = style[i]; if (name.startsWith('--') && !(name in (snap.vars || {}))) style.removeProperty(name) }
  for (const [name, value] of Object.entries(snap.vars || {})) if (style.getPropertyValue(name) !== value) style.setProperty(name, value)
  if (snap.lang) root.lang = snap.lang
}

// ---- the keyboard chooses ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Material Web's menu item does not click when Enter or Space activates it: it asks its menu to close (`close-menu`, reason kind `keydown`, the key) and nothing else. A menu that wants the choice
// reads it from that event. The item is the element the event came from; the menu's children are the items in order, so its place among them is the place of the item in the list.

/** The item a keyboard activation (`close-menu` event detail) chose, or null (a pointer click, another key, a divider, a disabled item). */
export function itemOfKeyClose(detail, children, items) {
  const reason = detail?.reason
  if (reason?.kind !== 'keydown' || (reason.key !== 'Enter' && reason.key !== 'Space')) return null
  const index = Array.prototype.indexOf.call(children || [], detail.initiator)
  const item = index >= 0 ? items?.[index] : null
  return item && !item.divider && !item.disabled ? item : null
}
