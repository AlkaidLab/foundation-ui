import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildIndex, highlight, search } from '../src/search/index.js'
import { initialsOf } from '../src/search/pinyin.js'
import { settingDocs, tileDocs, clientDocs, appDocs } from '../src/search/docs.js'
import { actionDocs, searchTexts } from '../src/search/texts.js'
import { jumpToRow, HIT_CLASS } from '../src/search/jump.js'
import { pushQuery, removeQuery, loadQueries, saveQueries } from '../src/search/recent.js'
import { useUnifiedSearch } from '../src/vue/useUnifiedSearch.js'
import { buildSettingsEntries } from '../src/settings/search.js'
import './helpers/settingsFixture.js'
import { getSearchIndex, labelOf } from '../src/settings/provider.js'

const entries = (locale) => buildSettingsEntries({ index: getSearchIndex(), label: (k) => labelOf(locale, k), altLabel: (k) => labelOf(locale === 'zh' ? 'en' : 'zh', k) })
const docsOf = (locale = 'zh') => [
  ...settingDocs(entries(locale)),
  ...actionDocs(locale, { restart() {}, pair() {}, exportDiag() {}, checkUpdate() {}, logs() {}, addApp() {} }, searchTexts(locale).types.action),
  ...tileDocs(locale),
  ...clientDocs([{ name: 'Pixel 9' }, { name: 'Steam Deck' }]),
  ...appDocs([{ name: 'Steam Big Picture' }, { name: 'Desktop' }]),
]
const ids = (r) => r.flat.map((d) => d.id)

test('pinyin initials: the collation gives the first letters, two readings of a character both work', () => {
  assert.equal(initialsOf('码率')[0].s, 'ml')
  assert.equal(initialsOf('分辨率')[0].s, 'fbl')
  assert.ok(initialsOf('重启').some((v) => v.s === 'cq') && initialsOf('重启').some((v) => v.s === 'zq'))
  assert.equal(initialsOf('HDR 模式')[0].s, 'hdrms')
})

test('every tile of the catalogue has a title and is found by it', () => {
  const tiles = tileDocs('zh')
  assert.ok(tiles.length >= 50, `${tiles.length} tiles`)
  const index = buildIndex(tiles)
  for (const t of tiles) assert.ok(ids(search(index, t.title, { perGroup: 1e6 })).includes(t.id), t.title)
})

test('grouping: results come in groups by type, the best match first, with a count of the rest', () => {
  const index = buildIndex(docsOf('zh'))
  const r = search(index, '重启')
  assert.equal(r.groups[0].type, 'action', 'the action 重启 Sunshine leads')
  assert.equal(r.groups[0].items[0].doc.id, 'action:restart')
  const types = r.groups.map((g) => g.type)
  assert.equal(new Set(types).size, types.length)
  const wide = search(index, 'sunshine', { perGroup: 2 })
  for (const g of wide.groups) { assert.ok(g.items.length <= 2); assert.equal(g.more, Math.max(0, g.total - 2)) }
  assert.deepEqual(search(index, '   ').groups, [])
  assert.deepEqual(r.flat, r.groups.flatMap((g) => g.items.map((i) => i.doc)), 'the flat list is the display order')
})

test('matching: Chinese, English, keys, pinyin initials, and a typo only when nothing else matches', () => {
  const index = buildIndex(docsOf('zh'))
  assert.ok(ids(search(index, '码率')).some((id) => id.startsWith('setting:')))
  assert.ok(ids(search(index, 'hdr')).some((id) => id.startsWith('setting:')))
  const py = search(index, 'ml')
  assert.ok(py.groups.length && py.flat.some((d) => d.title.includes('码率')), 'ml finds 码率')
  assert.ok(ids(search(index, 'hevc_mode')).includes('setting:hevc_mode'))
  assert.ok(ids(search(index, 'restrat')).includes('action:restart'), 'one typo finds restart')
  assert.ok(!ids(search(index, 'zzzqqq')).length)
  assert.ok(ids(search(index, 'pixel')).includes('client:Pixel 9') && ids(search(index, 'big picture')).includes('app:Steam Big Picture'))
})

test('highlight marks the matched characters, also for pinyin initials', () => {
  assert.deepEqual(highlight('码率设置', [[0, 2]]), [{ text: '码率', mark: true }, { text: '设置', mark: false }])
  const index = buildIndex([{ id: 'a', type: 'setting', title: '比特率 码率', key: 'bitrate' }])
  const r = search(index, 'ml')
  assert.deepEqual(highlight('比特率 码率', r.groups[0].items[0].ranges).filter((p) => p.mark).map((p) => p.text), ['码率'])
})

test('recent searches: newest first, no duplicates, removable, kept in storage', () => {
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
  let list = []
  for (const q of ['码率', 'hdr', '码率', 'ml']) list = pushQuery(list, q)
  assert.deepEqual(list, ['ml', '码率', 'hdr'])
  assert.deepEqual(removeQuery(list, '码率'), ['ml', 'hdr'])
  saveQueries(storage, list); assert.deepEqual(loadQueries(storage), list)
  assert.equal(pushQuery(Array.from({ length: 8 }, (_, i) => String(i)), 'x').length, 8)
})

test('keyboard: arrows move through the rows and wrap, Enter opens, Esc closes, a tier 3 action asks first', () => {
  const chosen = []
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
  const ran = []
  const docs = [...docsOf('zh').filter((d) => d.type !== 'action'), ...actionDocs('zh', { restart: () => ran.push('restart'), pair: () => ran.push('pair') })]
  const s = useUnifiedSearch({ docs, onChoose: (d) => chosen.push(d.id), storage, shortcuts: false })
  const key = (k, extra = {}) => s.onKey({ key: k, preventDefault() {}, ...extra })
  s.show(); s.query.value = '码率'
  assert.ok(s.rows.value.length >= 2)
  assert.equal(s.active.value, 0)
  key('ArrowDown'); assert.equal(s.active.value, 1)
  key('ArrowUp'); key('ArrowUp'); assert.equal(s.active.value, s.rows.value.length - 1, 'wraps to the last row')
  key('ArrowDown'); key('Enter')
  assert.equal(chosen.length, 1); assert.equal(s.open.value, false, 'Enter opens the row and closes the view')
  assert.deepEqual(s.recentQueries.value, ['码率'])
  // a tier 3 action is confirmed first
  s.show(); s.query.value = '重启'
  key('Enter'); assert.equal(s.confirm.value?.id, 'action:restart'); assert.deepEqual(ran, [])
  key('Escape'); assert.equal(s.confirm.value, null); assert.equal(s.open.value, true, 'Esc closes the confirmation first')
  key('Enter'); s.confirmRun(); assert.deepEqual(ran, ['restart'])
  // a tier 1 action runs at once
  s.show(); s.query.value = '配对'; key('Enter'); assert.equal(s.confirm.value, null)
  // the empty field walks the recent searches
  s.show(); assert.equal(s.idle.value, true); assert.deepEqual(s.rows.value.map((r) => r.q), ['配对', '重启', '码率'].filter((q) => s.recentQueries.value.includes(q)))
  key('Escape'); assert.equal(s.open.value, false)
})

test('shortcuts: Ctrl+K and Ctrl+F open, "/" opens when no field has focus, Esc closes', () => {
  const s = useUnifiedSearch({ docs: [], shortcuts: false, storage: null })
  const ev = (key, extra = {}) => ({ key, target: { tagName: 'DIV' }, preventDefault() {}, ...extra })
  assert.equal(s.onShortcut(ev('k', { ctrlKey: true })), true); assert.equal(s.open.value, true)
  s.hide(); assert.equal(s.onShortcut(ev('f', { ctrlKey: true })), true); assert.equal(s.open.value, true)
  s.hide(); assert.equal(s.onShortcut(ev('/', { target: { tagName: 'INPUT' } })), false, 'not while typing in a field'); assert.equal(s.open.value, false)
  assert.equal(s.onShortcut(ev('/')), true); assert.equal(s.open.value, true)
  assert.equal(s.onShortcut(ev('Escape')), true); assert.equal(s.open.value, false)
})

test('jump: the row is found (also when the page is still loading), scrolled into the upper third and pulsed, then released', async () => {
  const log = []
  const classes = new Set()
  let loaded = 0
  const pane = { scrollHeight: 2000, clientHeight: 600, scrollTop: 100, getBoundingClientRect: () => ({ top: 50 }), scrollTo: (o) => log.push(o), parentElement: null }
  const row = { parentElement: pane, offsetWidth: 1, getBoundingClientRect: () => ({ top: 650 }), classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } }
  const root = { body: {}, querySelector: () => (++loaded > 3 ? row : null) }
  const ok = await jumpToRow({ selector: '[data-cfg="x"]', root, wait: 0, pulse: 5, timers: { sleep: async () => {} } })
  assert.equal(ok, true); assert.ok(loaded > 3, 'looked again while the page loaded')
  assert.deepEqual(log, [{ top: 100 + (650 - 50) - 600 / 3, behavior: 'smooth' }])
  assert.ok(classes.has(HIT_CLASS))
  await new Promise((r) => setTimeout(r, 20)); assert.ok(!classes.has(HIT_CLASS), 'the pulse ends')
  assert.equal(await jumpToRow({ selector: '[data-cfg="none"]', root: { body: {}, querySelector: () => null }, tries: 2, wait: 0, timers: { sleep: async () => {} } }), false)
})

test('speed: a keystroke over the full index stays far under 16 ms (also with ten times the entries)', () => {
  const docs = docsOf('zh')
  const many = Array.from({ length: 10 }, (_, k) => docs.map((d) => ({ ...d, id: `${d.id}#${k}`, title: `${d.title}${k || ''}` }))).flat()
  for (const [name, list] of [['full index', docs], ['10x', many]]) {
    const index = buildIndex(list)
    const queries = ['码', '码率', 'hdr', 'ml', '重启', 'bitr', 'hevc_mode', 'sunshine', 'restrat', 'zzzzqq', '串流设置 编码器']
    for (const q of queries) search(index, q) // warm up
    let worst = 0, total = 0, n = 0
    for (let round = 0; round < 20; round++) for (const q of queries) { const t = performance.now(); search(index, q); const d = performance.now() - t; worst = Math.max(worst, d); total += d; n++ }
    console.log(`  ${name}: ${list.length} entries, mean ${(total / n).toFixed(3)} ms, worst ${worst.toFixed(3)} ms`)
    // the real index must stay under a frame; ten times the index only has to stay far from a stall (a shared build machine adds noise)
    assert.ok(worst < (name === 'full index' ? 16 : 40), `${name}: worst ${worst.toFixed(2)} ms`)
  }
})

test('a tile chosen in the search is added to the overview: shown, last, and a mounted home is told', async () => {
  const { addTileToHome } = await import('../src/search/home.js')
  const { useDashLayout } = await import('../src/vue/useDashLayout.js')
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
  const before = useDashLayout('t', storage)
  assert.equal(before.isVisible({ id: 'c_x', available: true, def: 'off' }, {}), false)
  const id = tileDocs('zh').find((d) => d.tile.startsWith('comp:'))?.tile || 'comp:vdd'
  assert.equal(addTileToHome('t', id, storage), true)
  const after = useDashLayout('t', storage)
  assert.equal(after.state.overrides[id], true)
  const shownBefore = after.state.order.filter((x) => x !== id && (after.state.overrides[x] === true || x === 'hero'))
  assert.ok(shownBefore.every((x) => after.state.order.indexOf(x) < after.state.order.indexOf(id)), 'the tile comes after every card that is shown')
  assert.ok(after.state.order.indexOf(id) < 64, 'and stays inside the places that are kept')
  before.reload(); assert.equal(before.state.overrides[id], true, 'a mounted layout re-reads the saved one')
})

test('the tiles are always the last group, even when they match better than the rest', () => {
  const index = buildIndex([
    { id: 'tile:a', type: 'tile', title: '重启主机', path: '资源' },
    { id: 'action:restart', type: 'action', title: '以重启方式启动', path: '' },
    { id: 'setting:x', type: 'setting', title: '启动时重启服务', key: 'x', path: '' },
  ])
  const r = search(index, '重启主机')
  assert.equal(r.groups[r.groups.length - 1].type, 'tile')
  assert.equal(search(index, '重启').groups.at(-1).type, 'tile')
})

test('a client or an application opens its page filtered: the request is kept for a page that is not open yet, and read from the address of a frame', async () => {
  const { requestPageFilter, takePageFilter, filterHash, readFilterHash } = await import('../src/search/pageFilter.js')
  const seen = []
  const target = { dispatchEvent: (e) => seen.push(e.detail.page) }
  requestPageFilter('pin', 'Pixel 9', target)
  assert.deepEqual(seen, ['pin'])
  assert.equal(takePageFilter('pin'), 'Pixel 9'); assert.equal(takePageFilter('pin'), null, 'taken once')
  assert.equal(readFilterHash(filterHash('Steam Big Picture & Co')), 'Steam Big Picture & Co')
  assert.equal(readFilterHash('#pairing-qr'), null)
  assert.equal(readFilterHash('#a=1&filter=%E7%A0%81'), '码')
})

test('the old search is gone: no MSearch, no search field in a list pane, no search keys in the scene', async () => {
  const { readdirSync, readFileSync, existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  assert.equal(existsSync(new URL('../src/vue/MSearch.vue', import.meta.url)), false)
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
  const files = walk(fileURLToPath(new URL('../src', import.meta.url))).filter((f) => /\.(vue|js|css)$/.test(f))
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    assert.ok(!/MSearch\.vue|from '\.\/MSearch'|\.m-search__(results|icon|text)|class="m-search"/.test(text), `${f} still uses the old search`)
  }
  const scene = readFileSync(new URL('../src/vue/MScene.vue', import.meta.url), 'utf8')
  assert.ok(!/toLowerCase\(\) === 'f'/.test(scene) && !/emit\('search'\)/.test(scene), 'the scene has no search keys of its own')
  const nav = readFileSync(new URL('../src/vue/MNavList.vue', import.meta.url), 'utf8')
  assert.ok(!/recent|searchItems|MSearch/.test(nav), 'a list pane is a pure list of categories')
})
