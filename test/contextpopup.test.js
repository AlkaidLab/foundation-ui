import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BACK_ID, applyThemeSnapshot, choose, itemOfKeyClose, levelItems, levelKey, menuSize, themeSnapshot } from '../src/contextmenu/popup.js'
import { handleFrameMenuMessage, installFramePresenter, itemAtPath, menuPresenter, presentMenu, setMenuPresenter, toMenuModel } from '../src/contextmenu/presenter.js'

// the menu in a window of its own (the Panel's menu window, which may extend beyond the main window): the model that crosses the window, the levels of a menu, the keys, the theme, the frame bridge
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const page = [
  { id: 'copy', label: 'Copy', icon: 'content_copy', shortcut: 'Ctrl+C', run() {} },
  { id: 'd1', divider: true },
  { id: 'size', label: 'Size', children: [{ id: 'small', label: 'Small', run() {} }, { id: 'back', label: 'Big', disabled: true }, { id: 'sub', label: 'More', children: [{ id: 'x', label: 'X' }] }] },
  { id: 'gone', label: 'Remove', danger: true, confirm: 'Remove it?', run() {} },
]

test('the menu model is data: the plain fields of every item and submenu, no functions; an item without an id gets one', () => {
  const model = toMenuModel(page)
  assert.deepEqual(model[0], { id: 'copy', label: 'Copy', icon: 'content_copy', shortcut: 'Ctrl+C' })
  assert.equal(JSON.stringify(model), JSON.stringify(JSON.parse(JSON.stringify(model))), 'survives a trip through JSON')
  assert.ok(!JSON.stringify(model).includes('run'))
  assert.deepEqual(model[2].children.map((c) => c.id), ['small', 'back', 'sub'])
  assert.equal(model[3].danger, true)
  assert.equal(toMenuModel([{ label: 'a' }])[0].id, 'item-0')
  assert.deepEqual(toMenuModel(null), [])
  assert.equal(model[3].confirm, undefined, 'the confirmation stays with the page that asks it')
})

test('a path of indexes names the chosen item; a path that leads nowhere, a divider, a disabled item and a submenu name none', () => {
  assert.equal(itemAtPath(page, [0]).id, 'copy')
  assert.equal(itemAtPath(page, [2, 0]).id, 'small')
  assert.equal(itemAtPath(page, [2, 2, 0]).id, 'x')
  assert.equal(itemAtPath(page, [1]), null, 'a divider')
  assert.equal(itemAtPath(page, [2, 1]), null, 'a disabled item')
  assert.equal(itemAtPath(page, [2]), null, 'a submenu is entered, not chosen')
  assert.equal(itemAtPath(page, [9]), null)
  assert.equal(itemAtPath(page, [0, 0]), null)
  assert.equal(itemAtPath(page, []), null)
  assert.equal(itemAtPath(page, null), null)
  assert.equal(itemAtPath(page, [1.5]), null)
  // two submenus may share an id ('back'): the index tells them apart
  assert.equal(itemAtPath(page, [3]).id, 'gone')
})

test('presentMenu: no presenter or one that declines leaves the menu to the page; a presenter that shows it returns the chosen item of the page (its actions are still there)', async () => {
  const stop0 = setMenuPresenter(null)
  assert.equal(menuPresenter(), null)
  assert.deepEqual(await presentMenu({ items: page, point: { x: 1, y: 2 } }), { handled: false })
  stop0()
  let got = null
  const stop = setMenuPresenter(async (req) => { got = req; return { handled: true, path: [2, 0] } })
  const shown = await presentMenu({ items: page, point: { x: 5, y: 6 }, pointer: true })
  assert.equal(shown.handled, true); assert.equal(shown.picked.id, 'small'); assert.equal(typeof shown.picked.run, 'function', 'the page\'s own item, not a copy of the model')
  assert.deepEqual(got.point, { x: 5, y: 6 }); assert.equal(got.pointer, true)
  stop()
  assert.equal(menuPresenter(), null, 'the removal works')
  const stop2 = setMenuPresenter(async () => ({ handled: true, path: null }))
  assert.deepEqual(await presentMenu({ items: page, point: { x: 0, y: 0 } }), { handled: true, picked: null }, 'closed without a choice')
  stop2()
  const stop3 = setMenuPresenter(async () => { throw new Error('no window') })
  assert.deepEqual(await presentMenu({ items: page, point: { x: 0, y: 0 } }), { handled: false }, 'a host that fails leaves the menu to the page')
  stop3()
  const stop4 = setMenuPresenter(async () => ({ handled: false }))
  assert.deepEqual(await presentMenu({ items: page, point: { x: 0, y: 0 } }), { handled: false })
  stop4()
})

test('the levels of a menu: the top level marks submenus as staying open; inside a submenu the first entries are the way back and a divider', () => {
  const model = toMenuModel(page)
  const top = levelItems(model, [])
  assert.deepEqual(top.map((e) => e.ix), [0, 1, 2, 3])
  assert.equal(top[2].keepOpen, true); assert.equal(top[0].keepOpen, undefined)
  const sub = levelItems(model, [2], 'Zurück')
  assert.deepEqual(sub.map((e) => e.id), [BACK_ID, '__back-divider', 'small', 'back', 'sub'])
  assert.equal(sub[0].label, 'Zurück'); assert.equal(sub[0].ix, -1)
  assert.deepEqual(sub.slice(2).map((e) => e.ix), [0, 1, 2])
  const deep = levelItems(model, [2, 2])
  assert.deepEqual(deep.slice(2).map((e) => e.id), ['x'])
  assert.deepEqual(levelItems(model, [9]).map((e) => e.ix), [0, 1, 2, 3], 'a trail that leads nowhere is the top level')
  assert.deepEqual(levelItems(null, []), [])
})

test('choosing an entry: go up, go into a submenu, or answer with the path of the item', () => {
  const model = toMenuModel(page)
  assert.deepEqual(choose(model, [], levelItems(model, [])[0]), { kind: 'pick', path: [0] })
  assert.deepEqual(choose(model, [], levelItems(model, [])[2]), { kind: 'into', trail: [2] })
  const sub = levelItems(model, [2])
  assert.deepEqual(choose(model, [2], sub[2]), { kind: 'pick', path: [2, 0] })
  assert.deepEqual(choose(model, [2], sub[0]), { kind: 'up', trail: [] })
  assert.deepEqual(choose(model, [2], sub[4]), { kind: 'into', trail: [2, 2] })
  assert.deepEqual(choose(model, [2, 2], levelItems(model, [2, 2])[0]), { kind: 'up', trail: [2] })
  assert.deepEqual(choose(model, [2], sub[3]), { kind: 'none' }, 'a disabled item')
  assert.deepEqual(choose(model, [2], sub[1]), { kind: 'none' }, 'a divider')
  assert.deepEqual(choose(model, [], null), { kind: 'none' })
  // the way back and the path survive an item that is called "back"
  assert.deepEqual(choose(model, [2], levelItems(model, [2])[3]), { kind: 'none' })
})

test('keys: Right enters the submenu of the focused item, Left goes up; nothing else changes the level (mirrored in a right-to-left window)', () => {
  const withKids = { id: 's', children: [{ id: 'a' }] }
  assert.equal(levelKey('ArrowRight', { entry: withKids, depth: 0 }), 'into')
  assert.equal(levelKey('ArrowRight', { entry: { id: 'plain' }, depth: 0 }), null)
  assert.equal(levelKey('ArrowRight', { entry: { ...withKids, disabled: true }, depth: 0 }), null)
  assert.equal(levelKey('ArrowRight', { entry: null, depth: 0 }), null)
  assert.equal(levelKey('ArrowLeft', { entry: withKids, depth: 0 }), null, 'Left at the top level does nothing')
  assert.equal(levelKey('ArrowLeft', { entry: { id: 'plain' }, depth: 1 }), 'up')
  assert.equal(levelKey('ArrowDown', { entry: withKids, depth: 1 }), null)
  assert.equal(levelKey('ArrowLeft', { entry: withKids, depth: 0, rtl: true }), 'into')
  assert.equal(levelKey('ArrowRight', { entry: { id: 'plain' }, depth: 2, rtl: true }), 'up')
})

test('the size of the menu: the surface as measured, rounded up; its height cut to the room the work area leaves (the menu scrolls inside)', () => {
  assert.deepEqual(menuSize({ width: 241.2, height: 400.4, maxHeight: Infinity }), { w: 242, h: 401, capped: false })
  assert.deepEqual(menuSize({ width: 240, height: 2000, maxHeight: 1024.7 }), { w: 240, h: 1024, capped: true })
  assert.deepEqual(menuSize({ width: 240, height: 300, maxHeight: 1024 }), { w: 240, h: 300, capped: false })
  assert.deepEqual(menuSize({ width: 0, height: 0, maxHeight: NaN }), { w: 1, h: 1, capped: false })
})

// a document with the few members the theme code touches
function fakeDoc(attrs = {}, classes = [], vars = {}, sheetText = '') {
  const a = new Map(Object.entries(attrs))
  const props = new Map(Object.entries(vars))
  const names = () => [...props.keys()]
  const style = new Proxy({ getPropertyValue: (n) => props.get(n) ?? '', setProperty: (n, v) => props.set(n, v), removeProperty: (n) => props.delete(n), get length() { return names().length } }, { get: (t, k) => (typeof k === 'string' && /^\d+$/.test(k) ? names()[Number(k)] : t[k]) })
  const doc = { sheet: sheetText === '' ? null : { id: 'foundation-ui-theme', textContent: sheetText } }
  const root = {
    get attributes() { return [...a.entries()].map(([name, value]) => ({ name, value })) },
    getAttribute: (n) => a.get(n) ?? null, setAttribute: (n, v) => a.set(n, v), removeAttribute: (n) => a.delete(n),
    classList: classes, className: classes.join(' '), style, lang: attrs.lang || '',
  }
  Object.defineProperty(root, 'className', { get() { return classes.join(' ') }, set(v) { classes.length = 0; classes.push(...String(v).split(' ').filter(Boolean)) } })
  return Object.assign(doc, { documentElement: root, head: { appendChild(el) { doc.sheet = el } }, getElementById: (id) => (id === 'foundation-ui-theme' ? doc.sheet : null), createElement: () => ({ textContent: '' }) })
}

test('the theme of the window travels with the menu: the colour sheet and the look attributes, without the wallpaper', () => {
  const main = fakeDoc({ 'data-bs-theme': 'dark', 'data-text-size': '16', 'data-wallpaper': 'wallpaper', 'data-picture-stats': 'read lo 0.1' }, ['m-has-wallpaper', 'm-lg'], { '--m-wallpaper': 'url(data:image/png;base64,AAAA)', '--m-card-corner': '20px', '--m-text-scale': '1.14' }, ':root{--md-sys-color-primary:#6750a4}')
  const snap = themeSnapshot(main)
  assert.equal(snap.sheet, ':root{--md-sys-color-primary:#6750a4}')
  assert.equal(snap.attrs['data-bs-theme'], 'dark'); assert.equal(snap.attrs['data-text-size'], '16')
  assert.ok(!('data-wallpaper' in snap.attrs) && !('data-picture-stats' in snap.attrs))
  assert.deepEqual(snap.classes, ['m-lg'])
  assert.deepEqual(snap.vars, { '--m-card-corner': '20px', '--m-text-scale': '1.14' })
  const menuWin = fakeDoc({ 'data-bs-theme': 'light', 'data-stale': 'x' }, ['old'], { '--m-stale': '1' })
  applyThemeSnapshot(menuWin, snap)
  const root = menuWin.documentElement
  assert.equal(root.getAttribute('data-bs-theme'), 'dark'); assert.equal(root.getAttribute('data-stale'), null, 'what the other window does not have goes')
  assert.equal(root.className, 'm-lg')
  assert.equal(root.style.getPropertyValue('--m-card-corner'), '20px'); assert.equal(root.style.getPropertyValue('--m-stale'), '')
  assert.equal(menuWin.sheet.textContent, ':root{--md-sys-color-primary:#6750a4}')
  assert.equal(themeSnapshot({ documentElement: null }), null)
  applyThemeSnapshot(menuWin, null)
})

// a frame and its host, joined by postMessage
function pair() {
  const frameWin = { listeners: [], posted: [], addEventListener(t, f) { this.listeners.push(f) }, removeEventListener(t, f) { this.listeners = this.listeners.filter((x) => x !== f) } }
  const hostWin = { posted: [] }
  frameWin.parent = { postMessage: (m) => hostWin.posted.push(m) }
  const frameElement = { contentWindow: { postMessage: (m) => frameWin.listeners.forEach((f) => f({ source: frameWin.parent, data: m })) }, getBoundingClientRect: () => ({ left: 230, top: 48 }) }
  return { frameWin, hostWin, frameElement }
}

test('a frame asks the page around it to show the menu; until the host says it can, the frame draws its own', async () => {
  const { frameWin, hostWin } = pair()
  const stop = installFramePresenter(frameWin, { ackTimeout: 30 })
  assert.deepEqual(hostWin.posted.map((m) => m.type), ['foundation-menu-hello'])
  assert.deepEqual(await presentMenu({ items: page, point: { x: 1, y: 1 } }), { handled: false }, 'no host yet')
  stop()
  assert.equal(menuPresenter(), null)
  // a window that is its own top (a browser tab) has no frame presenter at all
  const top = { addEventListener() {}, removeEventListener() {} }; top.parent = top
  installFramePresenter(top)()
  assert.equal(menuPresenter(), null)
})

test('frame and host: the model goes up with the point in the frame\'s coordinates, the host moves the point into its own, the result comes back as a path', async () => {
  const { frameWin, hostWin, frameElement } = pair()
  const stop = installFramePresenter(frameWin, { ackTimeout: 200 })
  const calls = []
  const present = async (req) => { calls.push(req); return { handled: true, path: [2, 0] } }
  const reply = (m) => frameElement.contentWindow.postMessage(m)
  // the hello is answered: the host can show menus
  assert.equal(handleFrameMenuMessage({ source: frameElement.contentWindow, data: hostWin.posted[0] }, { frame: frameElement, present, reply }), true)
  const shown = presentMenu({ items: page, point: { x: 40, y: 50 }, pointer: true })
  await new Promise((r) => setTimeout(r, 5))
  const open = hostWin.posted.find((m) => m.type === 'foundation-menu-open')
  assert.ok(open); assert.deepEqual(open.point, { x: 40, y: 50 }); assert.equal(open.pointer, true); assert.ok(!JSON.stringify(open).includes('"run"'))
  // a message from another window is ignored
  assert.equal(handleFrameMenuMessage({ source: {}, data: open }, { frame: frameElement, present, reply }), true)
  assert.equal(calls.length, 0)
  handleFrameMenuMessage({ source: frameElement.contentWindow, data: open }, { frame: frameElement, present, reply })
  const res = await shown
  assert.equal(calls.length, 1); assert.deepEqual(calls[0].point, { x: 270, y: 98 }, 'the frame sits at 230,48 in the host window'); assert.equal(calls[0].pointer, true)
  assert.equal(res.handled, true); assert.equal(res.picked.id, 'small'); assert.equal(typeof res.picked.run, 'function')
  assert.equal(handleFrameMenuMessage({ source: null, data: { type: 'something-else' } }, { frame: frameElement, present, reply }), false)
  assert.equal(handleFrameMenuMessage({ source: null, data: null }, { frame: frameElement, present, reply }), false)
  stop()
})

test('a host that does not acknowledge, or that fails, leaves the menu to the frame', async () => {
  const { frameWin, hostWin, frameElement } = pair()
  const stop = installFramePresenter(frameWin, { ackTimeout: 20 })
  frameWin.listeners.forEach((f) => f({ source: frameWin.parent, data: { type: 'foundation-menu-host' } }))
  assert.deepEqual(await presentMenu({ items: page, point: { x: 1, y: 1 } }), { handled: false }, 'nobody answers the open message')
  assert.ok(hostWin.posted.some((m) => m.type === 'foundation-menu-open'))
  const reply = (m) => frameElement.contentWindow.postMessage(m)
  const shown = presentMenu({ items: page, point: { x: 1, y: 1 } })
  await new Promise((r) => setTimeout(r, 2))
  const open = hostWin.posted.filter((m) => m.type === 'foundation-menu-open').pop()
  handleFrameMenuMessage({ source: frameElement.contentWindow, data: open }, { frame: frameElement, present: async () => { throw new Error('window failed') }, reply })
  assert.deepEqual(await shown, { handled: false })
  // the ack stops the timer: a menu that stays open longer than the timeout is not given back to the page
  const slow = presentMenu({ items: page, point: { x: 1, y: 1 } })
  await new Promise((r) => setTimeout(r, 2))
  const open2 = hostWin.posted.filter((m) => m.type === 'foundation-menu-open').pop()
  let finish
  handleFrameMenuMessage({ source: frameElement.contentWindow, data: open2 }, { frame: frameElement, present: () => new Promise((r) => { finish = r }), reply })
  await new Promise((r) => setTimeout(r, 60))
  finish({ handled: true, path: [0] })
  const r2 = await slow
  assert.equal(r2.handled, true); assert.equal(r2.picked.id, 'copy')
  stop()
})

test('the in-page menu asks the presenter first and keeps its own placement as the fallback; the provider says whether the pointer opened the menu; the popup page is exported', () => {
  const ctx = src('../src/vue/MContextMenu.vue')
  assert.ok(ctx.includes("presentMenu({ items: list, point, pointer })"))
  assert.ok(ctx.includes('if (await presented(event, list, point, ctx)) return'), 'before anything is measured or positioned in the page')
  assert.ok(ctx.includes('placeMenu('), 'the fallback is still the in-page placement')
  assert.ok(ctx.includes("emit('select', shown.picked, ctx)") && ctx.includes("emit('closed')"))
  const provider = src('../src/vue/MContextProvider.vue')
  assert.ok(provider.includes('pointer: true') && provider.includes('pointer: point.pointer === true'))
  const index = src('../src/vue/index.js')
  for (const name of ['MMenuPopup', 'setMenuPresenter', 'installFramePresenter', 'handleFrameMenuMessage', 'themeSnapshot', 'applyThemeSnapshot']) assert.ok(index.includes(name), name)
  const popup = src('../src/vue/MMenuPopup.vue')
  assert.ok(popup.includes('transport.ready(') && popup.includes('transport.pick(') && popup.includes('transport.cancel('))
  assert.ok(popup.includes('<MMenu') && popup.includes('quick'), 'the same Material menu component as the in-page menu')
  assert.ok(popup.includes('background: transparent !important'), 'the window is transparent')
})

test('Enter and Space choose the item that asked its menu to close; a pointer click, another key, a divider and a disabled item choose nothing', () => {
  const a = {}; const b = {}; const d = {}; const c = {}
  const children = [a, d, b, c]
  const list = [{ id: 'a' }, { id: 'd', divider: true }, { id: 'b' }, { id: 'c', disabled: true }]
  const key = (initiator, k) => ({ initiator, reason: { kind: 'keydown', key: k } })
  assert.equal(itemOfKeyClose(key(a, 'Enter'), children, list).id, 'a')
  assert.equal(itemOfKeyClose(key(b, 'Space'), children, list).id, 'b')
  assert.equal(itemOfKeyClose(key(b, 'Escape'), children, list), null)
  assert.equal(itemOfKeyClose({ initiator: b, reason: { kind: 'click-selection' } }, children, list), null, 'a click selects through its own event')
  assert.equal(itemOfKeyClose(key(d, 'Enter'), children, list), null)
  assert.equal(itemOfKeyClose(key(c, 'Enter'), children, list), null)
  assert.equal(itemOfKeyClose(key({}, 'Enter'), children, list), null, 'an element that is not one of the menu\'s')
  assert.equal(itemOfKeyClose(null, children, list), null)
  assert.ok(src('../src/vue/MMenu.vue').includes('@close-menu="onCloseMenu"') && src('../src/vue/MMenuPopup.vue').includes("event.key === 'Enter'"))
})

test("the menu window locks the document only in its own page: no bare html/body overflow rule rides along in the shared sheet", () => {
  const sheet = src("../src/vue/MMenuPopup.vue").split("<style>")[1] || ""
  assert.ok(!/(^|\n)\s*html, body \{[^}]*overflow/.test(sheet), "a bare html, body {overflow:hidden} stops every page that scrolls the document")
  assert.match(sheet, /html:has\(> body \.m-popup\)/)
})

test("the popup transparency rule is scoped to the popup document (1814 regression)", () => {
  const popup = src("../src/vue/MMenuPopup.vue").split("<style>")[1] || ""
  assert.ok(!/(^|\n)\s*html, body \{/.test(popup), "a bare html, body rule changes the Panel page background")
  assert.match(popup, /html:has\(> body \.m-popup\)/)
})
