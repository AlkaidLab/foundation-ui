import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ANNOUNCEMENT_URLS,
  MIN_GAP_MS,
  announcementUrlsFor,
  CACHE_KEY,
  CACHE_TTL_MS,
  DISMISSED_CAP,
  DISMISSED_KEY,
  LIMITS,
  STALE_MAX_MS,
  activeItems,
  clearAnnouncementsCache,
  clearDismissed,
  compareVersions,
  dismiss,
  fetchAnnouncements,
  isDismissed,
  loadDismissed,
  parseAnnouncements,
  parseIsoDate,
  resolveLocaleKey,
  toDocument,
  topItem,
} from '../src/announcements/index.js'
import * as viaExports from 'foundation-ui/announcements'

const memory = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }
}

const item = (over = {}) => ({ id: 'a', severity: 'info', title: { en: 'Title' }, ...over })
const doc = (...items) => ({ schema: 1, items })
const T = Date.parse('2026-11-10T12:00:00Z')

// ---- schema ----------------------------------------------------------------

test('package export resolves to the announcements module', () => {
  assert.equal(viaExports.parseAnnouncements, parseAnnouncements)
})

test('the sample file is valid and keeps every item', () => {
  const sample = JSON.parse(readFileSync(new URL('../docs/announcements.sample.json', import.meta.url), 'utf8'))
  const items = parseAnnouncements(sample)
  assert.deepEqual(items.map((i) => i.id), sample.items.map((i) => i.id))
  const byId = Object.fromEntries(items.map((i) => [i.id, i]))
  assert.equal(byId['2026-11-driver-update'].pinned, true)
  assert.equal(byId['2026-11-driver-update'].starts, Date.parse('2026-11-01T00:00:00Z'))
  assert.equal(byId['2026-11-driver-update'].ends, Date.parse('2026-12-01T00:00:00Z'))
  assert.equal(byId['2026-10-pairing-tips'].published, Date.parse('2026-10-20T00:00:00Z'))
  assert.ok(byId['2026-11-release-notes'].body.en.includes('### Added'))
})

test('parse output round-trips through toDocument', () => {
  const sample = JSON.parse(readFileSync(new URL('../docs/announcements.sample.json', import.meta.url), 'utf8'))
  const items = parseAnnouncements(sample)
  assert.deepEqual(parseAnnouncements(toDocument(items)), items)
})

test('malformed documents give []', () => {
  for (const bad of [null, undefined, 5, 'x', true, [], [doc()], {}, { schema: 1 }, { items: [] }, { schema: 2, items: [item()] },
    { schema: '1', items: [item()] }, { schema: 1, items: 'no' }, { schema: 1, items: { 0: item() } }]) {
    assert.deepEqual(parseAnnouncements(bad), [], JSON.stringify(bad))
  }
  assert.deepEqual(parseAnnouncements(doc(null, 1, 'x', [], undefined)), [])
})

test('unknown fields are ignored and optional fields default', () => {
  const [one] = parseAnnouncements(doc(item({ extra: { a: 1 }, __proto__: { x: 1 } })))
  assert.deepEqual(one, { id: 'a', severity: 'info', mode: 'notice', countdown: 0, title: { en: 'Title' }, body: {}, url: null, starts: null, ends: null, minVersion: null, maxVersion: null, pinned: false, category: 'announce', type: 'notice', banner: null, published: null, revision: '1' })
})

test('ids: allowed characters and length', () => {
  const ok = ['a', 'A-b_c.9', 'x'.repeat(64)]
  const bad = ['', 'x'.repeat(65), 'has space', 'a/b', 'é', 'a\n', 5, null, {}]
  assert.equal(parseAnnouncements(doc(...ok.map((id) => item({ id })))).length, 3)
  for (const id of bad) assert.deepEqual(parseAnnouncements(doc(item({ id }))), [], String(id))
})

test('severity must be one of the three values', () => {
  for (const severity of ['info', 'warn', 'critical']) assert.equal(parseAnnouncements(doc(item({ severity }))).length, 1)
  for (const severity of ['INFO', 'error', '', null, 1, undefined]) assert.deepEqual(parseAnnouncements(doc(item({ severity }))), [])
})

test('title limits: required, 120 characters, wrong types', () => {
  assert.equal(parseAnnouncements(doc(item({ title: { en: 'x'.repeat(120) } }))).length, 1)
  assert.deepEqual(parseAnnouncements(doc(item({ title: { en: 'x'.repeat(121) } }))), [])
  for (const title of [undefined, null, 'text', [], {}, { en: '' }, { en: '   ' }, { en: 5 }, { en: null }]) {
    assert.deepEqual(parseAnnouncements(doc(item({ title }))), [], JSON.stringify(title))
  }
  // Counted in code points, not UTF-16 units.
  assert.equal(parseAnnouncements(doc(item({ title: { en: '😀'.repeat(120) } }))).length, 1)
  assert.deepEqual(parseAnnouncements(doc(item({ title: { en: '😀'.repeat(121) } }))), [])
  // An over-long entry only drops that locale.
  const [kept] = parseAnnouncements(doc(item({ title: { en: 'ok', zh: 'x'.repeat(500) } })))
  assert.deepEqual(kept.title, { en: 'ok' })
})

test('body limits: optional, 8000 characters (Markdown), newlines kept', () => {
  assert.equal(parseAnnouncements(doc(item({ body: { en: 'x'.repeat(8000) } }))).length, 1)
  const [trimmed] = parseAnnouncements(doc(item({ body: { en: 'x'.repeat(8001), zh: 'ok' } })))
  assert.deepEqual(trimmed.body, { zh: 'ok' })
  for (const body of ['text', [], 5, true]) assert.deepEqual(parseAnnouncements(doc(item({ body }))), [], JSON.stringify(body))
  const [multi] = parseAnnouncements(doc(item({ body: { en: 'a\r\nb\rc\n\n\nd' } })))
  assert.equal(multi.body.en, 'a\nb\nc\n\n\nd')
})

test('text is plain: markup stays literal, control characters are stripped', () => {
  const [one] = parseAnnouncements(doc(item({
    title: { en: '<b>Hi</b>\u0000\u0007 [x](y)\nthere\u202e\u200bz' },
    body: { en: 'line\u0000one\u001b[31m\ttab\u0085\u2028end\ufeff' },
  })))
  assert.equal(one.title.en, '<b>Hi</b> [x](y)there\u200bz')
  assert.equal(one.body.en, 'lineone[31mtabend')
})

test('url must be a plain https url of at most 500 characters', () => {
  const ok = ['https://example.org/', 'https://example.org/a?b=1#c', 'HTTPS://EXAMPLE.ORG/x']
  const bad = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'http://example.org/', 'data:text/html,<script>1</script>',
    'ftp://example.org/', '//example.org/', 'example.org', '', 'https://', 'https://user:pw@example.org/',
    'https://exa mple.org/', 'https://example.org/\n', ' https://example.org/', `https://example.org/${'a'.repeat(500)}`, 5, {}, []]
  for (const url of ok) assert.equal(parseAnnouncements(doc(item({ url }))).length, 1, url)
  for (const url of bad) assert.deepEqual(parseAnnouncements(doc(item({ url }))), [], String(url))
  assert.equal(parseAnnouncements(doc(item({ url: `https://example.org/${'a'.repeat(480)}` }))).length, 1)
  assert.equal(parseAnnouncements(doc(item({ url: 'HTTPS://EXAMPLE.ORG/x' })))[0].url, 'https://example.org/x')
})

test('dates: ISO-8601 only, offsets honoured, impossible dates rejected', () => {
  assert.equal(parseIsoDate('2026-11-01'), Date.UTC(2026, 10, 1))
  assert.equal(parseIsoDate('2026-11-01T08:00:00+08:00'), Date.UTC(2026, 10, 1))
  assert.equal(parseIsoDate('2026-11-01T08:00:00+0800'), Date.UTC(2026, 10, 1))
  assert.equal(parseIsoDate('2026-11-01T00:00Z'), Date.UTC(2026, 10, 1))
  assert.equal(parseIsoDate('2026-11-01T00:00:00.123Z'), Date.UTC(2026, 10, 1) + 123)
  assert.equal(parseIsoDate('2028-02-29'), Date.UTC(2028, 1, 29))
  for (const bad of ['', 'now', '2026-02-29', '2026-02-31', '2026-13-01', '2026-00-10', '2026-11-00', '2026-11-01T24:00:00Z',
    '2026-11-01T12:60:00Z', '2026-11-01T12:00:00', '2026-11-01 12:00:00Z', '11/01/2026', '2026-1-1', 20261101, null, undefined, {}, 'x'.repeat(5000)]) {
    assert.equal(parseIsoDate(bad), null, String(bad))
  }
  assert.deepEqual(parseAnnouncements(doc(item({ starts: 'tomorrow' }))), [])
  assert.deepEqual(parseAnnouncements(doc(item({ ends: 12 }))), [])
  assert.deepEqual(parseAnnouncements(doc(item({ starts: '2026-11-02', ends: '2026-11-01' }))), [])
  assert.deepEqual(parseAnnouncements(doc(item({ starts: '2026-11-02', ends: '2026-11-02' }))), [])
})

test('version bounds and pinned must be well formed', () => {
  assert.equal(parseAnnouncements(doc(item({ minVersion: 'v1.2.3', maxVersion: '2026.925.152547.suffix' }))).length, 1)
  for (const v of ['', 'latest', 'x1', 5, {}, 'v', '1'.repeat(65)]) {
    assert.deepEqual(parseAnnouncements(doc(item({ minVersion: v }))), [], String(v))
    assert.deepEqual(parseAnnouncements(doc(item({ maxVersion: v }))), [], String(v))
  }
  assert.equal(parseAnnouncements(doc(item({ pinned: true })))[0].pinned, true)
  for (const pinned of ['true', 1, 'yes', {}]) assert.deepEqual(parseAnnouncements(doc(item({ pinned }))), [], String(pinned))
})

test('invalid items are dropped one by one, valid ones kept', () => {
  const items = parseAnnouncements(doc(item({ id: 'one' }), item({ id: 'bad', severity: 'x' }), null, item({ id: 'two', url: 'javascript:1' }), item({ id: 'three' })))
  assert.deepEqual(items.map((i) => i.id), ['one', 'three'])
})

test('duplicate ids: the first wins', () => {
  const items = parseAnnouncements(doc(item({ id: 'd', title: { en: 'first' } }), item({ id: 'd', title: { en: 'second' } })))
  assert.equal(items.length, 1)
  assert.equal(items[0].title.en, 'first')
})

test('at most 50 items are kept, even from 10 000', () => {
  const many = Array.from({ length: 10000 }, (_, i) => item({ id: `id-${i}` }))
  const items = parseAnnouncements(doc(...many))
  assert.equal(items.length, LIMITS.maxItems)
  assert.equal(items[49].id, 'id-49')
  // Invalid leading entries do not use up the quota, but the scan is bounded.
  const mixed = [...Array.from({ length: 100 }, () => null), ...many.slice(0, 80)]
  assert.equal(parseAnnouncements(doc(...mixed)).length, 50)
  const hopeless = [...Array.from({ length: 600 }, () => null), item({ id: 'late' })]
  assert.deepEqual(parseAnnouncements(doc(...hopeless)), [])
})

test('huge strings are rejected cheaply', () => {
  const huge = 'x'.repeat(5_000_000)
  const started = Date.now()
  assert.deepEqual(parseAnnouncements(doc(item({ title: { en: huge } }))), [])
  assert.deepEqual(parseAnnouncements(doc(item({ id: huge }))), [])
  assert.deepEqual(parseAnnouncements(doc(item({ url: huge }))), [])
  assert.deepEqual(parseAnnouncements(doc(item({ starts: huge }))), [])
  assert.ok(Date.now() - started < 1000)
})

test('locale keys that are not locales are dropped', () => {
  const [one] = parseAnnouncements(doc(item({ title: { en: 'ok', '': 'a', '__proto__': 'b', 'not a locale': 'c', constructor: 'd', zh_TW: 'e' } })))
  assert.deepEqual(Object.keys(one.title).sort(), ['en', 'zh_TW'])
})

// ---- selection --------------------------------------------------------------

test('locale resolution: exact, prefix, same language, en, first', () => {
  const map = { en: 'E', zh: 'Z', zh_TW: 'T', pt_BR: 'P' }
  assert.equal(resolveLocaleKey(map, 'zh_TW'), 'zh_TW')
  assert.equal(resolveLocaleKey(map, 'zh-tw'), 'zh_TW')
  assert.equal(resolveLocaleKey(map, 'zh-CN'), 'zh')
  assert.equal(resolveLocaleKey(map, 'zh-Hant-TW'), 'zh')
  assert.equal(resolveLocaleKey(map, 'EN-us'), 'en')
  assert.equal(resolveLocaleKey(map, 'pt'), 'pt_BR')
  assert.equal(resolveLocaleKey(map, 'fr'), 'en')
  assert.equal(resolveLocaleKey(map, ''), 'en')
  assert.equal(resolveLocaleKey(map, undefined), 'en')
  assert.equal(resolveLocaleKey({ ja: 'J', ko: 'K' }, 'fr'), 'ja')
  assert.equal(resolveLocaleKey({ zh_TW: 'T', zh_CN: 'C' }, 'zh'), 'zh_TW')
  assert.equal(resolveLocaleKey({}, 'en'), null)
  assert.equal(resolveLocaleKey(null, 'en'), null)
})

test('activeItems resolves text per locale', () => {
  const items = parseAnnouncements(doc(item({ title: { en: 'Hello', zh: '你好' }, body: { en: 'B' } })))
  const zh = activeItems(items, { now: T, locale: 'zh_CN' })[0]
  assert.equal(zh.title, '你好')
  assert.equal(zh.body, 'B')
  assert.equal(activeItems(items, { now: T, locale: 'de' })[0].title, 'Hello')
})

test('version comparison ignores a leading v and suffixes', () => {
  assert.equal(compareVersions('v1.2.3', '1.2.3'), 0)
  assert.equal(compareVersions('1.2', '1.2.0.0'), 0)
  assert.equal(compareVersions('1.10', '1.9'), 1)
  assert.equal(compareVersions('2026.925.152547.杂鱼', 'v2026.925.152548'), -1)
  assert.equal(compareVersions('1.2.3-beta.1', '1.2.3'), 0)
  assert.equal(compareVersions('V1.0', '0.99.99'), 1)
  assert.equal(compareVersions('', '1.0'), null)
  assert.equal(compareVersions(null, '1.0'), null)
  assert.equal(compareVersions('abc', '1.0'), null)
  assert.equal(compareVersions('1.0', undefined), null)
})

test('version windows are inclusive; unknown version hides bounded items', () => {
  const items = parseAnnouncements(doc(
    item({ id: 'min', minVersion: '2.0' }),
    item({ id: 'max', maxVersion: '2.0' }),
    item({ id: 'both', minVersion: 'v1.5', maxVersion: '2.5.1-rc' }),
    item({ id: 'free' }),
  ))
  const ids = (version) => activeItems(items, { now: T, version }).map((i) => i.id).sort()
  assert.deepEqual(ids('2.0'), ['both', 'free', 'max', 'min'])
  assert.deepEqual(ids('1.9.9'), ['both', 'free', 'max'])
  assert.deepEqual(ids('2.0.1'), ['both', 'free', 'min'])
  assert.deepEqual(ids('v2.5.1'), ['both', 'free', 'min'])
  assert.deepEqual(ids('2.5.2'), ['free', 'min'])
  assert.deepEqual(ids('1.0'), ['free', 'max'])
  assert.deepEqual(ids(null), ['free'])
  assert.deepEqual(ids('garbage'), ['free'])
})

test('date windows: starts inclusive, ends exclusive', () => {
  const items = parseAnnouncements(doc(item({ id: 'w', starts: '2026-11-10T00:00:00Z', ends: '2026-11-11T00:00:00Z' }), item({ id: 'open' })))
  const at = (iso) => activeItems(items, { now: Date.parse(iso) }).map((i) => i.id).sort()
  assert.deepEqual(at('2026-11-09T23:59:59.999Z'), ['open'])
  assert.deepEqual(at('2026-11-10T00:00:00Z'), ['open', 'w'])
  assert.deepEqual(at('2026-11-10T23:59:59.999Z'), ['open', 'w'])
  assert.deepEqual(at('2026-11-11T00:00:00Z'), ['open'])
  assert.deepEqual(activeItems(items, { now: () => Date.parse('2026-11-10T01:00:00Z') }).map((i) => i.id).sort(), ['open', 'w'])
})

test('items with invalid dates never reach selection; hand-made bad data is tolerated', () => {
  assert.deepEqual(parseAnnouncements(doc(item({ starts: '2026-13-45', ends: 'x' }))), [])
  assert.deepEqual(activeItems(null, { now: T }), [])
  assert.deepEqual(activeItems([null, {}, { id: 5 }], { now: T }), [])
})

test('priority: critical, warn, info; pinned first; newest starts first', () => {
  const items = parseAnnouncements(doc(
    item({ id: 'info-new', severity: 'info', starts: '2026-11-05' }),
    item({ id: 'info-pin', severity: 'info', pinned: true, starts: '2026-11-01' }),
    item({ id: 'warn-old', severity: 'warn', starts: '2026-10-01' }),
    item({ id: 'crit', severity: 'critical', starts: '2026-10-01' }),
    item({ id: 'warn-new', severity: 'warn', starts: '2026-11-02' }),
    item({ id: 'info-none', severity: 'info' }),
    item({ id: 'warn-pin', severity: 'warn', pinned: true, starts: '2026-09-01' }),
    item({ id: 'info-newer', severity: 'info', starts: '2026-11-08' }),
  ))
  assert.deepEqual(activeItems(items, { now: T }).map((i) => i.id),
    ['crit', 'warn-pin', 'warn-new', 'warn-old', 'info-pin', 'info-newer', 'info-new', 'info-none'])
})

test('topItem is the best unread item', () => {
  const items = parseAnnouncements(doc(item({ id: 'w', severity: 'warn' }), item({ id: 'i', severity: 'info' })))
  assert.equal(topItem(items, { now: T }).id, 'w')
  assert.equal(topItem(items, { now: T, dismissed: ['w'] }).id, 'i')
  assert.equal(topItem(items, { now: T, dismissed: new Set(['w', 'i']) }), null)
  assert.equal(topItem([], { now: T }), null)
  const listed = activeItems(items, { now: T, dismissed: ['w'] })
  assert.deepEqual(listed.map((i) => [i.id, i.read, i.dismissible]), [['w', true, true], ['i', false, true]])
})

test('critical items are not dismissible while active; no ends means never', () => {
  const items = parseAnnouncements(doc(
    item({ id: 'c1', severity: 'critical', ends: '2026-12-01' }),
    item({ id: 'c2', severity: 'critical' }),
  ))
  const listed = activeItems(items, { now: T, dismissed: ['c1', 'c2'] })
  assert.deepEqual(listed.map((i) => [i.id, i.dismissible, i.read]), [['c1', false, false], ['c2', false, false]])
  assert.equal(topItem(items, { now: T, dismissed: ['c1', 'c2'] }).id, 'c1')
  // Once ends has passed the item is outside its window and not shown at all.
  assert.deepEqual(activeItems(items, { now: Date.parse('2027-01-01') }).map((i) => i.id), ['c2'])
  const storage = memory()
  assert.equal(dismiss('c1', { storage, item: listed[0] }), false)
  assert.deepEqual(loadDismissed(storage), [])
})

// ---- dismissal storage -------------------------------------------------------

test('dismissal storage round-trips, dedupes and moves repeats to the end', () => {
  const storage = memory()
  assert.deepEqual(loadDismissed(storage), [])
  assert.equal(dismiss('a', { storage }), true)
  assert.equal(dismiss('b', { storage }), true)
  assert.equal(dismiss('a', { storage }), true)
  assert.deepEqual(loadDismissed(storage), ['b', 'a'])
  assert.equal(JSON.parse(storage.m.get(DISMISSED_KEY)).length, 2)
  assert.equal(isDismissed('a', storage), true)
  assert.equal(isDismissed('z', storage), false)
  clearDismissed(storage)
  assert.deepEqual(loadDismissed(storage), [])
})

test('corrupted dismissal values read as empty or are cleaned', () => {
  const storage = memory()
  for (const bad of ['{', 'null', '5', '"a"', '{"a":1}', '', 'undefined', 'x'.repeat(100000)]) {
    storage.setItem(DISMISSED_KEY, bad)
    assert.deepEqual(loadDismissed(storage), [], bad.slice(0, 20))
  }
  storage.setItem(DISMISSED_KEY, JSON.stringify(['ok', 5, null, 'bad id', {}, 'ok', 'also.ok', 'x'.repeat(65)]))
  assert.deepEqual(loadDismissed(storage), ['ok', 'also.ok'])
  assert.equal(dismiss('', { storage }), false)
  assert.equal(dismiss(5, { storage }), false)
  assert.equal(dismiss('new', { storage }), true)
  assert.deepEqual(loadDismissed(storage), ['ok', 'also.ok', 'new'])
})

test('dismissal list is capped at 200, forgetting the oldest', () => {
  const storage = memory()
  for (let i = 0; i < 250; i += 1) dismiss(`id-${i}`, { storage })
  const ids = loadDismissed(storage)
  assert.equal(ids.length, DISMISSED_CAP)
  assert.equal(ids[0], 'id-50')
  assert.equal(ids.at(-1), 'id-249')
  storage.setItem(DISMISSED_KEY, JSON.stringify(Array.from({ length: 1000 }, (_, i) => `n${i}`)))
  assert.equal(loadDismissed(storage).length, 200)
})

test('storage that throws or is missing never throws', () => {
  const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('full') }, removeItem() { throw new Error('x') } }
  assert.deepEqual(loadDismissed(broken), [])
  assert.equal(dismiss('a', { storage: broken }), false)
  assert.doesNotThrow(() => clearDismissed(broken))
  assert.deepEqual(loadDismissed(null), [])
  assert.equal(dismiss('a', { storage: null }), false)
})

// ---- fetch ------------------------------------------------------------------

const COM = ANNOUNCEMENT_URLS[0]
const CN = ANNOUNCEMENT_URLS[1]
const json = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
})
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const abortable = (signal, work) =>
  new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    work.then(resolve, reject)
  })
// Builds a fetch from { url: () => Promise<response> } and records the calls.
const fakeFetch = (routes) => {
  const calls = []
  const fn = (url, options) => {
    calls.push({ url, options })
    return abortable(options.signal, (routes[url] ?? (() => Promise.resolve(json({}, 404))))())
  }
  fn.calls = calls
  return fn
}
const fresh = () => { clearAnnouncementsCache(); return memory() }
const valid = doc(item({ id: 'x' }))

test('hosts are the two release-metadata hosts', () => {
  assert.deepEqual([...ANNOUNCEMENT_URLS], [
    'https://www.alkaidlab.com/release-metadata/foundation-sunshine-announcements.json',
    'https://www.alkaidlab.cn/release-metadata/foundation-sunshine-announcements.json',
  ])
})

test('fetch: one host is asked first, through the HTTP cache, privacy-preserving options, no query, no headers', async () => {
  const storage = fresh()
  const f = fakeFetch({ [COM]: async () => json(valid), [CN]: async () => json(valid) })
  const items = await fetchAnnouncements({ fetch: f, storage })
  assert.deepEqual(items.map((i) => i.id), ['x'])
  assert.deepEqual(f.calls.map((c) => c.url), [COM], 'the mirror is not asked when the first host answered')
  for (const { url, options } of f.calls) {
    assert.equal(new URL(url).search, '')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.referrerPolicy, 'no-referrer')
    assert.equal(options.cache, 'default', 'the browser revalidates with the ETag and honours Cache-Control')
    assert.equal(options.headers, undefined)
    assert.equal(options.body, undefined)
    assert.equal(options.method, 'GET')
  }
})

test('fetch: the mirror is asked only after the first host failed; a missing file is an answer', async () => {
  const g = fakeFetch({ [COM]: async () => { throw new Error('offline') }, [CN]: async () => json(valid) })
  assert.equal((await fetchAnnouncements({ fetch: g, storage: fresh() })).length, 1)
  assert.deepEqual(g.calls.map((c) => c.url), [COM, CN])
  const h = fakeFetch({ [COM]: async () => json({}, 404), [CN]: async () => json(valid) })
  assert.deepEqual(await fetchAnnouncements({ fetch: h, storage: fresh() }), [])
  assert.equal(h.calls.length, 1, '404 means the file is not published: the mirror holds the same files')
  const slow = fakeFetch({ [COM]: () => new Promise(() => {}), [CN]: async () => json(valid) })
  assert.equal((await fetchAnnouncements({ fetch: slow, storage: fresh(), timeoutMs: 30 })).length, 1)
  assert.deepEqual(slow.calls.map((c) => c.url), [COM, CN])
  assert.equal(slow.calls[0].options.signal.aborted, true)
  const zh = announcementUrlsFor('zh-CN')
  assert.deepEqual(zh, [CN, COM], 'a Chinese interface reads the nearer mirror first')
  assert.deepEqual(announcementUrlsFor('en'), [COM, CN])
})

test('fetch: an unusable answer from the first host falls back to the mirror', async () => {
  for (const bad of [json('<html>portal</html>'), json('not json'), json([1]), json({ schema: 9, items: [] }), json({ schema: 1 }), json('x'.repeat(LIMITS.maxFileBytes + 1))]) {
    const f = fakeFetch({ [COM]: async () => bad, [CN]: async () => json(valid) })
    assert.equal((await fetchAnnouncements({ fetch: f, storage: fresh() })).length, 1)
    assert.equal(f.calls.length, 2)
  }
})

test('fetch: both failing gives [] and never throws', async () => {
  const cases = [
    { [COM]: async () => { throw new Error('a') }, [CN]: async () => { throw new Error('b') } },
    { [COM]: async () => json({}, 404), [CN]: async () => json({}, 404) },
    { [COM]: async () => json({}, 500), [CN]: async () => json({}, 503) },
    { [COM]: async () => json('<html>'), [CN]: async () => json('nope') },
    { [COM]: async () => ({ ok: true, status: 200, text: async () => { throw new Error('reset') } }), [CN]: async () => null },
    {},
  ]
  for (const routes of cases) {
    assert.deepEqual(await fetchAnnouncements({ fetch: fakeFetch(routes), storage: fresh() }), [])
  }
  assert.deepEqual(await fetchAnnouncements({ fetch: () => { throw new Error('sync') }, storage: fresh() }), [])
  assert.deepEqual(await fetchAnnouncements({ fetch: null, storage: fresh() }), [])
  assert.deepEqual(await fetchAnnouncements({ fetch: fakeFetch({}), urls: [], storage: fresh() }), [])
})

test('fetch: timeout gives [] after about timeoutMs, and aborts the requests', async () => {
  const f = fakeFetch({ [COM]: () => new Promise(() => {}), [CN]: () => new Promise(() => {}) })
  const started = Date.now()
  const items = await fetchAnnouncements({ fetch: f, storage: fresh(), timeoutMs: 40 })
  const took = Date.now() - started
  assert.deepEqual(items, [])
  assert.ok(took >= 60 && took < 1000, `took ${took}`)
  assert.ok(f.calls.every((c) => c.options.signal.aborted))
  // A fetch that ignores the signal is still cut off.
  const stubborn = () => new Promise(() => {})
  const t2 = Date.now()
  assert.deepEqual(await fetchAnnouncements({ fetch: stubborn, storage: fresh(), timeoutMs: 40 }), [])
  assert.ok(Date.now() - t2 < 1000)
})

test('fetch: urls with a query, fragment, credentials or a non-https scheme are never requested', async () => {
  const f = fakeFetch({})
  await fetchAnnouncements({
    fetch: f, storage: fresh(),
    urls: [`${COM}?x=1`, `${COM}#a`, 'http://www.alkaidlab.com/a.json', 'https://u:p@www.alkaidlab.com/a.json', 'junk', 5, null],
  })
  assert.equal(f.calls.length, 0)
})

test('fetch: output is validated; a bad item in a good file is dropped', async () => {
  const f = fakeFetch({ [COM]: async () => json(doc(item({ id: 'good' }), item({ id: 'evil', url: 'javascript:alert(1)' }))), [CN]: async () => json({}, 404) })
  assert.deepEqual((await fetchAnnouncements({ fetch: f, storage: fresh() })).map((i) => i.id), ['good'])
})

test('cache: served for 30 minutes from memory and from storage, then refetched', async () => {
  const storage = fresh()
  let clock = 1_000_000
  let version = 1
  const f = fakeFetch({ [COM]: async () => json(doc(item({ id: `v${version}` }))), [CN]: async () => json({}, 404) })
  const get = (extra = {}) => fetchAnnouncements({ fetch: f, storage, now: () => clock, ...extra })
  assert.deepEqual((await get()).map((i) => i.id), ['v1'])
  const calls = f.calls.length
  version = 2
  clock += CACHE_TTL_MS - 1
  assert.deepEqual((await get()).map((i) => i.id), ['v1'])
  assert.equal(f.calls.length, calls)
  // A new process: memory is empty, storage still holds the copy.
  clearAnnouncementsCache()
  assert.deepEqual((await get()).map((i) => i.id), ['v1'])
  assert.equal(f.calls.length, calls)
  clock += 1
  assert.deepEqual((await get()).map((i) => i.id), ['v2'])
  assert.ok(f.calls.length > calls)
  // force bypasses the cache.
  version = 3
  assert.deepEqual((await get({ force: true })).map((i) => i.id), ['v3'])
  const record = JSON.parse(storage.m.get(CACHE_KEY))
  assert.equal(record.at, clock)
  assert.equal(record.document.items[0].id, 'v3')
})

test('cache: a missing file is remembered for the same time', async () => {
  const storage = fresh()
  let clock = 5_000
  const f = fakeFetch({})
  const get = () => fetchAnnouncements({ fetch: f, storage, now: () => clock })
  assert.deepEqual(await get(), [])
  const calls = f.calls.length
  clock += 60_000
  assert.deepEqual(await get(), [])
  assert.equal(f.calls.length, calls)
  clock += CACHE_TTL_MS
  clearAnnouncementsCache() // a new app start
  assert.deepEqual(await get(), [])
  assert.ok(f.calls.length > calls)
})

test('cache: after a failed refresh the last good copy is shown for 24 hours, then nothing', async () => {
  const storage = fresh()
  let clock = 10_000
  let online = true
  const f = fakeFetch({
    [COM]: async () => { if (!online) throw new Error('offline'); return json(valid) },
    [CN]: async () => { if (!online) throw new Error('offline'); return json(valid) },
  })
  const get = () => fetchAnnouncements({ fetch: f, storage, now: () => clock })
  assert.equal((await get()).length, 1)
  online = false
  clock += CACHE_TTL_MS + 1
  clearAnnouncementsCache() // a new app start
  assert.deepEqual((await get()).map((i) => i.id), ['x'])
  clock += STALE_MAX_MS
  clearAnnouncementsCache()
  assert.deepEqual(await get(), [])
})

test('the network is asked once per app start (a failure counts), once per 30 minutes across windows, and again only by hand', async () => {
  const storage = fresh()
  let clock = 1
  const f = fakeFetch({ [COM]: async () => json({}, 500), [CN]: async () => json({}, 500) })
  const get = (extra = {}) => fetchAnnouncements({ fetch: f, storage, now: () => clock, ...extra })
  await get()
  const calls = f.calls.length
  assert.equal(calls, 2, 'the first host, then the mirror after the failure')
  clock += 1000
  await get()
  clock += 60 * 60 * 1000
  await get()
  assert.equal(f.calls.length, calls, 'no retry loop in a process, however long it runs')
  // another window of the same storage, a moment after the first asked
  clearAnnouncementsCache()
  clock = 2000
  await get()
  assert.equal(f.calls.length, calls, 'another window within 30 minutes does not ask')
  // by hand
  await get({ force: true })
  assert.equal(f.calls.length, calls + 2)
  // a new app start after the gap
  clearAnnouncementsCache()
  clock += MIN_GAP_MS + 1
  await get()
  assert.equal(f.calls.length, calls + 4)
})

test('developer mode may point to a local source; without the switch the stored source is ignored', async () => {
  const local = 'http://127.0.0.1:18095/announcements.json'
  const storage = fresh()
  storage.setItem('foundation-ui.announcements.source', local)
  const f = fakeFetch({ [COM]: async () => json(valid), [local]: async () => json(doc(item({ id: 'local' }))) })
  assert.deepEqual((await fetchAnnouncements({ fetch: f, storage })).map((i) => i.id), ['x'])
  assert.deepEqual(f.calls.map((c) => c.url), [COM])
  const dev = fresh()
  dev.setItem('foundation-ui.dev', '1'); dev.setItem('foundation-ui.announcements.source', local)
  const g = fakeFetch({ [local]: async () => json(doc(item({ id: 'local' }))) })
  assert.deepEqual((await fetchAnnouncements({ fetch: g, storage: dev })).map((i) => i.id), ['local'])
  assert.deepEqual(g.calls.map((c) => c.url), [local])
  const bad = fresh()
  bad.setItem('foundation-ui.dev', '1'); bad.setItem('foundation-ui.announcements.source', 'http://example.com/a.json')
  const h = fakeFetch({})
  assert.deepEqual(await fetchAnnouncements({ fetch: h, storage: bad }), [])
  assert.equal(h.calls.length, 0, 'plain http only to this computer')
})

test('no test reaches the real hosts: the guard of the test run saw nothing, and it refuses when asked', async () => {
  // the guard is loaded by `npm test` (node --import); running this file alone installs it here, so no run can reach the real hosts (the module is loaded once)
  await import('../scripts/no-network.mjs')
  const before = (globalThis.__alkRequests || []).length
  await assert.rejects(() => globalThis.fetch(COM), /inject a fetch/)
  assert.equal((globalThis.__alkRequests || []).length, before + 1, 'the guard records what it refuses')
  globalThis.__alkRequests.length = 0
  // the code under test, without an injected fetch, only ever reaches the guard (which fails the run at exit): clear what this very check recorded
  await fetchAnnouncements({ storage: fresh() })
  assert.ok(globalThis.__alkRequests.length >= 1, 'a call without an injected fetch is caught by the guard')
  globalThis.__alkRequests.length = 0
})

test('cache: a corrupted or hostile stored cache is ignored', async () => {
  for (const bad of ['{', 'null', '[]', '{"at":"x","document":{}}', '{"at":1,"document":null}', JSON.stringify({ at: 1e12, document: { schema: 1, items: [item({ id: 'j', url: 'javascript:1' })] } })]) {
    const storage = fresh()
    storage.setItem(CACHE_KEY, bad)
    const f = fakeFetch({ [COM]: async () => json(valid) })
    const items = await fetchAnnouncements({ fetch: f, storage, now: () => 1e12 })
    assert.ok(items.every((i) => i.url === null), bad)
  }
  // A stored cache is re-validated on read.
  const storage = fresh()
  storage.setItem(CACHE_KEY, JSON.stringify({ at: 100, document: { schema: 1, items: [item({ id: 'j', url: 'javascript:1' }), item({ id: 'ok' })] } }))
  const f = fakeFetch({})
  assert.deepEqual((await fetchAnnouncements({ fetch: f, storage, now: () => 200 })).map((i) => i.id), ['ok'])
  assert.equal(f.calls.length, 0)
})

test('concurrent calls share one request', async () => {
  const storage = fresh()
  const f = fakeFetch({ [COM]: async () => { await sleep(10); return json(valid) }, [CN]: async () => json({}, 404) })
  const results = await Promise.all([1, 2, 3].map(() => fetchAnnouncements({ fetch: f, storage })))
  assert.ok(results.every((r) => r.length === 1))
  assert.equal(f.calls.length, 1)
})
