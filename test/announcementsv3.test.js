import test from 'node:test'
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { BUILTIN_ITEMS, OPEN_SOURCE_ID, OPEN_SOURCE_TEXT, REPO_URL, parseAnnouncements, toDocument, activeItems, popupItem, topItem, hideUntilUpdate, loadHidden, noteRevision, loadRevisions, mustReadReady, CATEGORIES } from '../src/announcements/index.js'

const doc = (...items) => ({ schema: 1, items })
const item = (over = {}) => ({ id: 'a', severity: 'info', title: { en: 'Title' }, ...over })
const memory = () => { const data = new Map(); return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)) }, removeItem: (k) => { data.delete(k) } } }

test('the new fields: category, banner, type, published and revision, with their defaults', () => {
  const [one] = parseAnnouncements(doc(item({ category: 'update', banner: 'https://example.org/b.webp', type: 'notice', published: '2026-11-02', revision: 3, importance: 'popup' })))
  assert.equal(one.category, 'update'); assert.equal(one.banner, 'https://example.org/b.webp'); assert.equal(one.type, 'notice'); assert.equal(one.revision, '3'); assert.equal(one.mode, 'modal')
  assert.equal(one.published, Date.parse('2026-11-02T00:00:00Z'))
  assert.deepEqual([...CATEGORIES], ['announce', 'update', 'guide'])
})

test('a bad category, banner, type, date, revision or importance drops the item', () => {
  for (const over of [{ category: 'news' }, { banner: 'http://example.org/b.png' }, { banner: 'javascript:1' }, { type: 'alert' }, { published: 'yesterday' }, { revision: 'a b' }, { revision: -1 }, { importance: 'urgent' }]) assert.deepEqual(parseAnnouncements(doc(item(over))), [], JSON.stringify(over))
})

test('importance maps to the mode: normal is a notice, popup a modal', () => {
  assert.equal(parseAnnouncements(doc(item({ importance: 'normal' })))[0].mode, 'notice')
  assert.equal(parseAnnouncements(doc(item({ importance: 'must-read' })))[0].mode, 'must-read')
})

test('only an explicit warning (or an old warn or critical severity) is a warning', () => {
  const types = parseAnnouncements(doc(item({ id: 'i' }), item({ id: 'w', severity: 'warn' }), item({ id: 'c', severity: 'critical' }), item({ id: 'n', severity: 'warn', type: 'notice' }), item({ id: 'x', severity: 'info', type: 'warning' }))).map((i) => `${i.id}:${i.type}`)
  assert.deepEqual(types, ['i:notice', 'w:warning', 'c:warning', 'n:notice', 'x:warning'])
})

test('toDocument keeps the new fields and parses back to the same items', () => {
  const items = parseAnnouncements(doc(item({ category: 'guide', banner: 'https://example.org/b.png', published: '2026-11-02T08:00:00Z', revision: 'r2', type: 'warning' })))
  assert.deepEqual(parseAnnouncements(toDocument(items)), items)
})

test('the list shows category, banner, date and revision; the date falls back to starts', () => {
  const items = parseAnnouncements(doc(item({ id: 'a', banner: 'https://example.org/b.png', category: 'update', starts: '2026-11-01' }), item({ id: 'b', published: '2026-11-05', starts: '2026-11-01' })))
  const list = activeItems(items, { now: Date.parse('2026-11-10'), locale: 'en' })
  assert.deepEqual(list.map((i) => i.id), ['b', 'a'], 'the newest date first')
  assert.equal(list[1].category, 'update'); assert.equal(list[1].banner, 'https://example.org/b.png'); assert.equal(list[1].published, Date.parse('2026-11-01')); assert.equal(list[1].revision, '1')
})

test('下次公告更新前不再显示: hidden for a revision, back with the next one; the list keeps it', () => {
  const store = memory()
  const items = parseAnnouncements(doc(item({ id: 'p', importance: 'popup', revision: '1' })))
  assert.equal(popupItem(items, {}).id, 'p')
  hideUntilUpdate('p', '1', store)
  assert.equal(popupItem(items, { hidden: loadHidden(store) }), null)
  assert.equal(activeItems(items, { hidden: loadHidden(store) })[0].snoozed, true)
  const next = parseAnnouncements(doc(item({ id: 'p', importance: 'popup', revision: '2' })))
  assert.equal(popupItem(next, { hidden: loadHidden(store) }).id, 'p')
})

test('a read state counts for the revision it was recorded for', () => {
  const store = memory()
  const v1 = parseAnnouncements(doc(item({ id: 'm', importance: 'must-read', revision: '1' })))
  noteRevision('m', '1', store)
  assert.equal(activeItems(v1, { acked: ['m'], revisions: loadRevisions(store) })[0].read, true)
  const v2 = parseAnnouncements(doc(item({ id: 'm', importance: 'must-read', revision: '2' })))
  assert.equal(activeItems(v2, { acked: ['m'], revisions: loadRevisions(store) })[0].read, false)
})

test('a must-read can be confirmed once it was read to the end, and there is nothing else to wait for', () => {
  assert.equal(mustReadReady({ atEnd: true }), true)
  assert.equal(mustReadReady({ atEnd: false }), false)
  assert.equal(mustReadReady({}), false)
})

test('the strip shows notices only, a popup does not', () => {
  const items = parseAnnouncements(doc(item({ id: 'n' }), item({ id: 'p', importance: 'popup' })))
  assert.equal(topItem(items, {}).id, 'n')
})

test('the sample file of the docs: every item survives validation and uses the new fields', () => {
  const sample = JSON.parse(fs.readFileSync(new URL('../docs/announcements.sample.json', import.meta.url), 'utf8'))
  const items = parseAnnouncements(sample)
  assert.equal(items.length, sample.items.length)
  assert.deepEqual([...new Set(items.map((i) => i.category))].sort(), ['announce', 'guide', 'update'])
  assert.ok(items.some((i) => i.banner) && items.some((i) => i.mode === 'modal') && items.some((i) => i.mode === 'must-read') && items.some((i) => i.type === 'warning'))
  assert.equal(items.filter((i) => i.type === 'warning').length, 1, 'only one item is a warning')
})

test('the open-source notice ships with the product: always there, a plain pinned notice, not dismissible, no popup, no warning', () => {
  const [zh] = activeItems(BUILTIN_ITEMS, { locale: 'zh' })
  assert.equal(zh.id, OPEN_SOURCE_ID); assert.equal(zh.builtin, true); assert.equal(zh.dismissible, false); assert.equal(zh.mode, 'notice'); assert.equal(zh.type, 'notice'); assert.equal(zh.category, 'announce'); assert.equal(zh.pinned, true)
  assert.equal(OPEN_SOURCE_TEXT.zh, 'Foundation Sunshine 是开源、免费的软件（GPL-3.0）。本项目未授权任何个人、商家或自媒体账号售卖；如果你是付费购买的，请立即申请退款。')
  assert.ok(zh.body.startsWith(OPEN_SOURCE_TEXT.zh) && zh.body.includes(REPO_URL))
  const [en] = activeItems(BUILTIN_ITEMS, { locale: 'en' })
  assert.ok(en.body.startsWith('Foundation Sunshine is free, open-source software (GPL-3.0).') && en.body.includes('refund'))
  assert.equal(popupItem(BUILTIN_ITEMS, {}), null, 'it never pops up')
  assert.equal(topItem(BUILTIN_ITEMS, {}), null, 'it is not a warning strip')
})
