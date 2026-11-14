// Who shows a context menu. In a browser the menu is drawn inside the page (MContextMenu, placed by place.js) and can never leave the viewport. A host that owns a window of its own for it
// (the Panel: a borderless window that may extend beyond the main window, up to the work area of the monitor under the pointer, like a native menu) registers a presenter; MContextMenu hands the menu
// to it first and draws the menu in the page only when the presenter says it did not take it.
//
//   setMenuPresenter(async ({ items, point, pointer }) => ({ handled: true, path: [2, 0] | null }) | { handled: false })
//     items    the menu as the page built it (functions and all)
//     point    { x, y } in CSS px of the page (the pointer, or the corner of the focused element for the Menu key)
//     pointer  true when the menu was opened by the mouse (the host then takes the pointer's screen position itself)
//     path     the chosen item as indexes: [index in the menu, index in its submenu, ...]; null when the menu closed without a choice
//
// A menu model crosses a window boundary, so it holds data only: the actions (`run`, builders) stay with the page that built them and come back as the path of the chosen item.

let presenter = null

/** Registers the presenter of this window; returns the function that removes it. */
export function setMenuPresenter(next) {
  presenter = typeof next === 'function' ? next : null
  return () => { if (presenter === next) presenter = null }
}
/** The presenter of this window, or null: the menu is drawn in the page. */
export const menuPresenter = () => presenter

// what a window of its own needs to draw an item; everything else (run, confirm text, builders) stays with the page
const PLAIN = ['id', 'label', 'icon', 'text', 'shortcut', 'danger', 'divider', 'disabled', 'selected', 'keepOpen', 'reason']

/** The menu as data: the plain fields of every item and of its submenu (`children`). Indexes, not ids, say which item was chosen (two submenus may share an id such as `back`). */
export function toMenuModel(items) {
  return (items || []).map((item, index) => {
    const out = {}
    for (const key of PLAIN) { const v = item?.[key]; if (v !== undefined && v !== null && v !== false) out[key] = v }
    if (out.id === undefined) out.id = `item-${index}`
    if (Array.isArray(item?.children) && item.children.length) out.children = toMenuModel(item.children)
    return out
  })
}

/** Shows a menu with the presenter of this window: `{ handled: false }` when there is none or it did not take the menu (the page draws it), else `{ handled: true, picked }` when the menu has closed
 *  (`picked`: the item of `items` that was chosen, or null). */
export async function presentMenu({ items, point, pointer }) {
  if (!presenter) return { handled: false }
  let result = null
  try { result = await presenter({ items, point, pointer: pointer === true }) } catch { result = null }
  if (!result?.handled) return { handled: false }
  return { handled: true, picked: itemAtPath(items, result.path) }
}

/** The item a path of indexes names, or null when the path leads nowhere (the page's menu changed while the host showed it). */
export function itemAtPath(items, path) {
  if (!Array.isArray(path) || path.length === 0) return null
  let list = items
  let item = null
  for (const index of path) {
    if (!Array.isArray(list) || !Number.isInteger(index) || index < 0 || index >= list.length) return null
    item = list[index]
    list = item?.children
  }
  return item && !item.divider && !item.disabled && !(Array.isArray(item.children) && item.children.length) ? item : null
}

// A frame (the Web UI inside the Panel) cannot reach the host's window commands: it asks the page around it, which owns the window, to show the menu. Frame and host speak by postMessage:
//   frame -> host  { type: 'foundation-menu-open', id, model, point, pointer }      point in the frame's CSS px
//   host  -> frame { type: 'foundation-menu-ack', id }                              "I have it" (at once; the result below comes when the menu closes)
//   host  -> frame { type: 'foundation-menu-result', id, handled, path }
//   host  -> frame { type: 'foundation-menu-host' }                                 "I can show your menus" (sent when the frame loads and when it says hello)
//   frame -> host  { type: 'foundation-menu-hello' }
// The frame draws its own menu until the host has said it can (a Web UI that is opened in a browser tab, or in a frame of someone else's page, never waits for an answer).

/** The presenter of a frame: asks the parent window. Returns the function that stops it. `win` is the frame's window; `post(message)` sends to the parent (injectable for tests). */
export function installFramePresenter(win = globalThis, { ackTimeout = 1500 } = {}) {
  if (!win || win.parent === win || typeof win.addEventListener !== 'function') return () => {}
  let hosted = false
  let seq = 0
  const waiting = new Map()
  const post = (message) => { try { win.parent.postMessage(message, '*') } catch { /* no parent */ } }
  const onMessage = (event) => {
    if (event.source !== win.parent) return
    const data = event.data
    if (data?.type === 'foundation-menu-host') { hosted = true; return }
    if (data?.type === 'foundation-menu-ack' && waiting.has(data.id)) { clearTimeout(waiting.get(data.id).timer); return }
    if (data?.type === 'foundation-menu-result' && waiting.has(data.id)) {
      const entry = waiting.get(data.id); waiting.delete(data.id); clearTimeout(entry.timer)
      entry.done(data.handled ? { handled: true, path: Array.isArray(data.path) ? data.path : null } : { handled: false })
    }
  }
  win.addEventListener('message', onMessage)
  const stop = setMenuPresenter(({ items, point, pointer }) => new Promise((resolve) => {
    if (!hosted) { resolve({ handled: false }); return }
    const id = `${Date.now().toString(36)}-${++seq}`
    // the result comes when the menu closes (any time later); only a host that does not even acknowledge must not leave the page without its menu
    const timer = setTimeout(() => { if (waiting.delete(id)) resolve({ handled: false }) }, ackTimeout)
    waiting.set(id, { timer, done: resolve })
    post({ type: 'foundation-menu-open', id, model: toMenuModel(items), point, pointer: pointer === true })
  }))
  post({ type: 'foundation-menu-hello' })
  return () => { stop(); win.removeEventListener('message', onMessage); for (const entry of waiting.values()) clearTimeout(entry.timer); waiting.clear() }
}

/**
 * The host side of the frame protocol: turns a message of a frame into a call of the host's own presenter, with the point moved from the frame's coordinates to the host window's.
 *   handleFrameMenuMessage(event, { frame, present, reply })
 *     frame    the iframe element (its position moves the point; messages from any other window are ignored)
 *     present  the host's presenter ({ items, point, pointer }) -> Promise<{ handled, path }>; it gets the model (data) in `items`
 *     reply(message) posts to the frame
 * Returns true when the message was a menu message of this frame (so the caller stops looking at it).
 */
export function handleFrameMenuMessage(event, { frame, present, reply }) {
  const data = event?.data
  if (!data || typeof data !== 'object') return false
  if (data.type === 'foundation-menu-hello') { if (event.source === frame?.contentWindow) reply({ type: 'foundation-menu-host' }); return true }
  if (data.type !== 'foundation-menu-open') return false
  if (!frame || event.source !== frame.contentWindow) return true
  const rect = frame.getBoundingClientRect()
  const point = { x: (Number(data.point?.x) || 0) + rect.left, y: (Number(data.point?.y) || 0) + rect.top }
  const id = data.id
  reply({ type: 'foundation-menu-ack', id })
  Promise.resolve()
    .then(() => present({ items: Array.isArray(data.model) ? data.model : [], point, pointer: data.pointer === true }))
    .catch(() => ({ handled: false }))
    .then((res) => reply({ type: 'foundation-menu-result', id, handled: !!res?.handled, path: res?.handled ? res.path ?? null : null }))
  return true
}
