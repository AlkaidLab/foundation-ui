import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MAX_ITEMS, buildGroups, describeTarget, flattenGroups } from '../src/contextmenu/builders.js'
import { registerContext } from '../src/contextmenu/registry.js'
import { CONTEXT_TEXTS, contextTexts } from '../src/contextmenu/texts.js'

// the context menu of SPEC-context-menu: the builders per target type and the enabled states
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
// plain objects with what the DOM gives every element
const node = (tag, attrs = {}, parent = null) => {
  const n = { tagName: tag.toUpperCase(), parentElement: parent, ...attrs.props, getAttribute: (k) => attrs[k] ?? null }
  n.closest = (sel) => { for (let c = n; c; c = c.parentElement) if (c.matches?.(sel) || (sel === 'a[href]' && c.tagName === 'A' && c.href) || (sel === 'img' && c.tagName === 'IMG')) return c; return null }
  return n
}
const T = contextTexts('zh')
const ids = (groups) => groups.flatMap((g) => g.filter((i) => !i.divider).map((i) => i.id))
const ctx = (extra = {}) => ({ T, cb: {}, caps: {}, platform: 'Win32', ...extra })

test('what is under the pointer: a field (not a checkbox), a link, an image, the owners of the elements, the blank page', () => {
  const text = node('input', { props: { type: 'text', value: 'hello world', selectionStart: 0, selectionEnd: 5 } })
  const f = describeTarget(text); assert.equal(f.field.selected, 'hello'); assert.equal(f.field.readOnly, false); assert.equal(f.blank, false)
  assert.equal(describeTarget(node('input', { props: { type: 'checkbox' } })).field, null, 'a checkbox has no edit menu')
  assert.equal(describeTarget(node('input', { props: { type: 'password', value: 'x', selectionStart: 0, selectionEnd: 1 } })).field.password, true)
  assert.equal(describeTarget(node('input', { props: { type: 'text', value: '', readOnly: true } })).field.readOnly, true)
  const a = node('a', { props: { href: 'https://example.org/x' } }); assert.equal(describeTarget(a).link, 'https://example.org/x')
  assert.equal(describeTarget(node('img', { props: { src: 'c.png' } })).image, 'c.png')
  const row = node('div', { 'data-cfg': 'hevc_mode' }); const tile = node('div', { 'data-ctx': 'tile:hero' }); const inner = node('span', {}, tile); tile.parentElement = null; row.parentElement = tile
  const t = describeTarget(node('span', {}, row))
  assert.deepEqual(t.owners.map((o) => [o.kind, o.id]), [['setting', 'hevc_mode'], ['tile', 'hero']], 'the nearest first')
  assert.equal(describeTarget(node('div', {}), { selection: '' }).blank, true); assert.equal(describeTarget(node('p', {}), { selection: 'abc' }).selection, 'abc')
  void inner
})

test('a text field: undo, redo, cut, copy, paste, paste as plain text, delete, select all, with the enabled states; a read-only one only copies and selects', () => {
  const sel = describeTarget(node('input', { props: { type: 'text', value: 'hello', selectionStart: 0, selectionEnd: 5 } }))
  const g = buildGroups(sel, ctx({ cb: { search: () => {} } }))
  assert.deepEqual(ids(g).slice(0, 9), ['undo', 'redo', 'cut', 'copy', 'paste', 'paste-plain', 'delete', 'select-all', 'search-selection'])
  const item = (groups, id) => groups.flat().find((i) => i.id === id)
  assert.equal(item(g, 'cut').disabled, false); assert.equal(item(g, 'copy').shortcut, 'Ctrl+C'); assert.equal(item(g, 'select-all').disabled, false)
  const none = buildGroups(describeTarget(node('input', { props: { type: 'text', value: 'hello', selectionStart: 2, selectionEnd: 2 } })), ctx())
  for (const id of ['cut', 'copy', 'delete']) assert.equal(item(none, id).disabled, true, `${id} needs a selection`)
  assert.equal(item(buildGroups(describeTarget(node('input', { props: { type: 'text', value: '' } })), ctx()), 'select-all').disabled, true)
  const ro = buildGroups(describeTarget(node('input', { props: { type: 'text', value: 'abc', readOnly: true, selectionStart: 0, selectionEnd: 3 } })), ctx())
  assert.deepEqual(ids(ro).filter((i) => !['back', 'forward', 'reload'].includes(i)), ['copy', 'select-all'])
  const pw = buildGroups(describeTarget(node('input', { props: { type: 'password', value: 'secret', selectionStart: 0, selectionEnd: 6 } })), ctx({ cb: { search: () => {} } }))
  assert.equal(item(pw, 'copy').disabled, true, 'a password is not copied'); assert.equal(ids(pw).includes('search-selection'), false)
  assert.equal(item(buildGroups(sel, ctx({ platform: 'MacIntel' })), 'copy').shortcut, '⌘C')
})

test('selected text, a link, an image: only what the product can do is there', () => {
  const s = describeTarget(node('p', {}), { selection: 'ds4 mode' })
  assert.deepEqual(ids(buildGroups(s, ctx())).slice(0, 2), ['copy', 'select-all'])
  const full = buildGroups(s, ctx({ cb: { search: () => {}, explain: () => {} } }))
  assert.deepEqual(ids(full).slice(0, 4), ['copy', 'search-selection', 'explain', 'select-all']); assert.ok(full.flat().find((i) => i.id === 'search-selection').label.includes('ds4 mode'))
  const l = describeTarget(node('a', { props: { href: 'https://x.y/' } }))
  assert.deepEqual(ids(buildGroups(l, ctx())).slice(0, 2), ['open-link', 'copy-link']); assert.ok(ids(buildGroups(l, ctx({ cb: { openExternal: () => {} } }))).includes('open-external'))
  const i = describeTarget(node('img', { props: { src: 'a.png' } }))
  assert.deepEqual(ids(buildGroups(i, ctx())).slice(0, 1), ['copy-image-url']); assert.ok(ids(buildGroups(i, ctx({ caps: { canCopyImage: true }, cb: { saveImage: () => {} } }))).slice(0, 3).join() === 'copy-image,copy-image-url,save-image')
})

test('the page: back (disabled with its reason where there is no history), forward, reload; print on the Web UI; the developer items with the developer option', () => {
  const blank = describeTarget(node('div', {}))
  const g = buildGroups(blank, ctx({ caps: { canGoBack: false } }))
  const page = g.at(-1)
  assert.deepEqual(page.map((i) => i.id), ['back', 'forward', 'reload']); assert.equal(page[0].disabled, true); assert.equal(page[0].reason, T.noHistory)
  assert.ok(buildGroups(blank, ctx({ caps: { print: true } })).at(-1).some((i) => i.id === 'print'))
  assert.deepEqual(buildGroups(blank, ctx({ caps: { devtools: true }, cb: { openDevtools: () => {} } })).at(-1).map((i) => i.id).slice(-2), ['inspect', 'copy-route'])
})

test('the blank page: search, connect, health check, appearance with the three modes (the one in use marked); the panel\'s own items only where the product gives them; a restart is dangerous and confirmed', () => {
  const blank = describeTarget(node('div', {}))
  const base = buildGroups(blank, ctx({ mode: 'dark', cb: { connect: () => {} } }))
  assert.deepEqual(ids(base), ['search', 'connect', 'appearance', 'back', 'forward', 'reload'])
  const ap = base.flat().find((i) => i.id === 'appearance'); assert.deepEqual(ap.children.map((c) => [c.id, !!c.selected]), [['mode:system', false], ['mode:light', false], ['mode:dark', true]])
  const panel = buildGroups(blank, ctx({ cb: { restartHost: () => {}, openWebUi: () => {}, pet: [{ id: 'pet:show', label: '显示' }] } }))
  const own = panel.find((g) => g.some((i) => i.id === 'restart-host'))
  assert.deepEqual(own.map((i) => i.id), ['pet', 'restart-host', 'open-webui']); const r = own.find((i) => i.id === 'restart-host'); assert.equal(r.danger, true); assert.equal(r.confirm, T.restartConfirm)
  assert.equal(ids(buildGroups(describeTarget(node('div', { 'data-ctx': 'x:1' })), ctx())).includes('search'), false, 'the blank page items are for the blank page')
})

test('what an element adds comes first, the dangerous items apart after it; a builder that throws adds nothing', () => {
  const off = [registerContext('tile', ({ id }) => [{ id: 'resize', label: 'R', children: [{ id: 'size:s', label: 'S' }] }, { id: 'remove', label: 'X', danger: true }, { id: `edit-${id}`, label: 'E' }]), registerContext('tile', () => { throw new Error('x') })]
  const t = describeTarget(node('div', { 'data-ctx': 'tile:hero' }))
  const g = buildGroups(t, ctx())
  assert.deepEqual(g[0].map((i) => i.id), ['resize', 'edit-hero']); assert.deepEqual(g[1].map((i) => i.id), ['remove'], 'danger in its own group'); assert.equal(g.at(-1).page, true)
  off.forEach((f) => f())
  assert.equal(buildGroups(t, ctx()).length, 1, 'removed builders add nothing')
})

test('about twelve items, then a submenu: the page\'s own group folds into one item; labels are words, in both languages', () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ id: `c${i}`, label: `c${i}` }))
  const off = registerContext('big', () => many)
  const g = buildGroups(describeTarget(node('div', { 'data-ctx': 'big:1' })), ctx({ caps: { print: true } }))
  const list = flattenGroups(g, T)
  const real = list.filter((i) => !i.divider)
  assert.ok(real.length <= MAX_ITEMS + 0, String(real.length)); const fold = real.at(-1); assert.deepEqual([fold.id, fold.children.map((c) => c.id).join()], ['page', 'back,forward,reload,print'])
  assert.ok(list.some((i) => i.divider)); off()
  const small = flattenGroups(buildGroups(describeTarget(node('div', {})), ctx()), T); assert.equal(small.some((i) => i.id === 'page'), false)
  assert.deepEqual(Object.keys(CONTEXT_TEXTS.zh), Object.keys(CONTEXT_TEXTS.en)); assert.equal(contextTexts('fr').undo, CONTEXT_TEXTS.en.undo); assert.equal(contextTexts('fr').developer, 'Développeur')
  for (const lang of ['zh', 'en']) for (const [k, v] of Object.entries(CONTEXT_TEXTS[lang])) assert.ok(typeof v === 'string' && v && !/\[object|undefined/.test(v), `${lang} ${k}`)
})

test('the provider: the right-click, the Menu key and Shift+F10 open it; Shift or a held right-click or the developer option give the platform\'s own menu; a menu a component opened is left alone', () => {
  const p = src('../src/vue/MContextProvider.vue')
  assert.ok(p.includes("document.addEventListener('contextmenu', onContext)") && p.includes("event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')"))
  assert.ok(p.includes('event.__mContext || nativeAlways() || event.shiftKey || (downAt && performance.now() - downAt >= HOLD_MS)'))
  assert.ok(p.includes("localStorage?.getItem('foundation-ui.contextmenu') === 'native'") || p.includes("getItem('foundation-ui.contextmenu') === 'native'"))
  assert.ok(p.includes('const HOLD_MS = 600') && p.includes('focusBack'))
  assert.ok(src('../src/vue/MContextMenu.vue').includes('event.__mContext = true'))
  const menu = src('../src/vue/MMenu.vue') + src('../src/vue/MMenuRow.vue')
  assert.ok(menu.includes('slot="trailing-supporting-text"') && menu.includes(':title="item.reason || undefined"') && menu.includes(':aria-keyshortcuts='))
  assert.ok(src('../src/vue/MHomeDash.vue').includes(':data-ctx="`tile:${c.id}`"') && src('../src/vue/dash/dashContext.js').includes("registerContext('tile'"))
})

test('the tile menu: the dangerous remove of a tile asks first, in both languages', () => {
  const d = src('../src/vue/dash/dashContext.js')
  assert.ok(d.includes('danger: true, confirm: texts.removeTileConfirm'), 'a dangerous item says what it will do before it does it')
  assert.ok(d.includes("id: 'remove-tile'"))
  for (const lang of ['zh', 'en']) assert.ok(typeof CONTEXT_TEXTS[lang].removeTileConfirm === 'string' && CONTEXT_TEXTS[lang].removeTileConfirm.length > 4, lang)
})

// the object actions: stacks, the tile's join, client and application rows, log lines, the pet's one entry, the pages that can be pinned
const dashD = (extra = {}) => {
  const calls = []
  const st = { members: ['hero', 'pair'], size: 'm', smartRotate: true, suggestions: false, active: 1 }
  const D = {
    stacksOn: true, stacks: { state: { stacks: { 'stack:1': st } }, setFlags: (...a) => calls.push(['flags', ...a]), dissolve: (...a) => calls.push(['dissolve', ...a]) },
    T: { value: { stackEdit: '编辑轮换组', stackSmart: '智能轮换', stackDissolve: '拆散轮换组', sizeS: '方形', sizeM: '中' } },
    allCards: { value: [{ id: 'hero' }, { id: 'pair' }, { id: 'quick' }] }, sizeKeysOf: () => ['s', 'm'],
    shown: { value: [{ id: 'stack:1', kind: 'stack', stackMembers: [{ id: 'hero', title: '本主机' }, { id: 'pair', title: '配对' }] }, { id: 'quick', size: 'm' }] },
    ghostIconOf: (m) => (m.id === 'hero' ? 'dns' : 'link'), stackSheetId: { value: '' }, openStackSheet: (id) => calls.push(['sheet', id]), onStackRotate: (a) => calls.push(['rotate', a]),
    joinTargetsOf: (me) => (me.id === 'quick' ? [{ id: 'stack:1', kind: 'stack' }] : []), joinTitle: () => '本主机 · 配对', joinIcon: () => 'library_add', joinFor: { value: '' }, joinInto: (t) => calls.push(['join', t.id]),
    setCardSize: () => {}, removeCard: () => {}, edit: { value: false }, onAct: (a) => calls.push(['act', a]), ...extra,
  }
  return { D, calls }
}
const withDash = async (D, fn) => {
  const { useDashContext } = await import('../src/vue/dash/dashContext.js')
  const off = useDashContext(D)
  try { return await fn() } finally { off() }
}
const { contextItemsOf } = await import('../src/contextmenu/registry.js')

test('a stack: edit, switch to a member, smart rotation (marked), break up (dangerous, asks first); each does what the stack sheet does', async () => {
  const { D, calls } = dashD()
  await withDash(D, () => {
    const items = contextItemsOf('tile', { id: 'stack:1', el: null, T, cb: {} })
    assert.deepEqual(items.map((i) => i.id), ['stack-edit', 'stack-switch', 'stack-smart', 'stack-dissolve'])
    items[0].run(); assert.deepEqual(calls.at(-1), ['sheet', 'stack:1'])
    const to = items[1].children; assert.deepEqual(to.map((c) => [c.label, !!c.selected]), [['本主机', false], ['配对', true]])
    // the design of the menu: every item and every item of a submenu has its leading icon, as the items of the menu before
    for (const i of items) { assert.ok(i.icon, i.id); for (const c of i.children || []) assert.ok(c.icon, c.id) }
    to[0].run(); assert.deepEqual(calls.at(-1), ['rotate', { id: 'stack:1', index: 0, source: 'manual' }])
    assert.equal(items[2].selected, true); items[2].run(); assert.deepEqual(calls.at(-1), ['flags', 'stack:1', { smartRotate: false }])
    assert.equal(items[3].danger, true); assert.equal(items[3].confirm, T.dissolveConfirm); items[3].run(); assert.deepEqual(calls.at(-1), ['dissolve', 'stack:1'])
  })
})

test('a tile: 加入轮换组 lists the stacks and tiles it can join, through the join sheet\'s own function; absent where there is none', async () => {
  const { D, calls } = dashD()
  await withDash(D, () => {
    const quick = contextItemsOf('tile', { id: 'quick', el: null, T, cb: {} })
    assert.deepEqual(quick.map((i) => i.id), ['resize', 'add-to-stack', 'edit-overview', 'remove-tile'])
    for (const i of quick.filter((x) => x.id !== 'resize')) { assert.ok(i.icon, i.id); for (const c of i.children || []) assert.ok(c.icon, c.id) }
    quick[1].children[0].run(); assert.deepEqual([D.joinFor.value, calls.at(-1)], ['quick', ['join', 'stack:1']])
    assert.equal(contextItemsOf('tile', { id: 'hero', el: null, T, cb: {} }).some((i) => i.id === 'add-to-stack'), false)
  })
})

test('a client row of the table (one that carries the host\'s device ID): open and copy the device ID; an application: open', async () => {
  const { D, calls } = dashD()
  const copied = []
  globalThis.navigator ??= {}
  const was = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (x) => { copied.push(x) } } } })
  try {
    await withDash(D, async () => {
      const uuid = '1B2C3D4E-0000-4A5B-8C9D-ABCDEF012345'
      const row = contextItemsOf('client', { id: uuid, T, cb: { notice: (m) => calls.push(['notice', m]) } })
      assert.deepEqual(row.map((i) => i.id), ['open-client', 'copy-device-id'])
      row[0].run(); assert.deepEqual(calls.at(-1), ['act', { type: 'table-row', value: { id: uuid, tab: 'clients' } }])
      await row[1].run(); await new Promise((r) => setTimeout(r, 0)); assert.deepEqual([copied, calls.at(-1)], [[uuid], ['notice', T.copied]])
      const app = contextItemsOf('app', { id: 'Steam', T, cb: {} }); assert.deepEqual(app.map((i) => i.id), ['open-app']); app[0].run(); assert.deepEqual(calls.at(-1), ['act', { type: 'app', value: { name: 'Steam' } }])
    })
  } finally { if (was) Object.defineProperty(globalThis, 'navigator', was); else delete globalThis.navigator }
})

test('the pet\'s one entry is the item itself; the log line, the client rows and the pinned pages are wired to the controls they mirror', async () => {
  const blank = describeTarget(node('div', {}))
  const one = buildGroups(blank, ctx({ cb: { pet: [{ id: 'pet:settings', label: '桌宠设置', run: () => {} }] } })).flat().find((i) => i.id === 'pet')
  assert.deepEqual([one.label, one.children], ['桌宠设置', undefined])
  const two = buildGroups(blank, ctx({ cb: { pet: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] } })).flat().find((i) => i.id === 'pet'); assert.equal(two.children.length, 2)
  const log = src('../src/vue/MLogViewer.vue')
  assert.ok(log.includes(':data-ctx="`log:${item.ids[0]}`"') && log.includes("registerContext('log'") && log.includes("inject('m-diag-actions'") && log.includes('await writeClip(kind === '), 'the viewer copies through the one function')
  assert.ok(src('../src/vue/MDiagnostics.vue').includes("provide('m-diag-actions'") && src('../src/vue/MPinHost.vue').includes('defineExpose({ open, pin, unpin, toggle, isPinned })'))
  assert.ok(src('../src/vue/tiles/TileTable.vue').includes('r.uuid ? `client:${r.uuid}`') && src('../src/vue/tiles/TileLibrary.vue').includes('app:${a.name}'))
  const { pinSpecForPage } = await import('../src/pins/registry.js')
  assert.deepEqual(pinSpecForPage('clients', { title: 'C', icon: 'devices' }), { type: 'tile', tile: 'act-clients', title: 'C', icon: 'devices' }); assert.equal(pinSpecForPage('welcome'), null)
  for (const k of ['pin', 'unpin', 'addToStack', 'editStack', 'switchTo', 'smartRotate', 'dissolveStack', 'dissolveConfirm', 'copyDeviceId', 'copyLine', 'copyAll', 'analyze', 'exportDiag', 'petSettings']) for (const lang of ['zh', 'en']) assert.ok(CONTEXT_TEXTS[lang][k], `${lang} ${k}`)
})
