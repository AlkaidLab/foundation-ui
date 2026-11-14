import test from 'node:test'
import assert from 'node:assert/strict'
import { smartPlan, ALWAYS } from '../src/vue/homeSmart.js'
import { buildCatalogue } from '../src/vue/homeCatalogue.js'
import { hasNoData } from '../src/vue/homeSizes.js'
import { homeTexts } from '../src/vue/homeModel.js'

// The announcement tile is on the smart page before, during and after a stream, with posts, with none unread and with none at all.
const NOW = 1_800_000_000_000
const LIVE_PRIMARY = ['hero', 'clients-online', 'current-app', 'session-time', 'bitrate', 'fps', 'loss', 'latency', 'cpu', 'gpu', 'act-stop']
const ids = [...new Set([...LIVE_PRIMARY, 'pair', 'public-address', 'last-session', 'session-heat', 'quick', 'announcements', 'memory', 'recent-actions', 'live-bitrate', 'live-ds5'])]
const SIZES = { announcements: ['s', 'm', 'l'], bitrate: ['s', 'm', 'l'], fps: ['s', 'm', 'l'], hero: ['s', 'm', 'l', 'xl'], 'last-session': ['s', 'm'], 'session-heat': ['s', 'm'] }
const cards = (skip) => ids.filter((id) => id !== skip).map((id) => ({ id, available: true, sizes: SIZES[id] || ['s', 'm'] }))
const plan = (signals, capacity = 200, skip, more = {}) => smartPlan({ cards: cards(skip), signals: { now: NOW, pairedCount: 3, ...signals }, capacity, sizeClass: 'large', unitRows: true, ...more })
const STATES = { idle: {}, live: { streaming: true }, after: { lastStreamAt: NOW - 5 * 60 * 1000 } }

test('the tile is in the plan in idle, live and after, as a 中 tile that keeps its hero', () => {
  assert.deepEqual([...ALWAYS], ['announcements'])
  for (const [scn, signals] of Object.entries(STATES)) {
    const p = plan(signals)
    assert.equal(p.scenario, scn)
    assert.ok(p.visible.includes('announcements'), `${scn}: announcements are on the page`)
    assert.equal(p.sizes.announcements, 'm', `${scn}: 中, the size that keeps the banner or the hero`)
  }
  for (const signals of [{ updateAvailable: true }, { pairedCount: 0, isNew: true }, { problems: 1 }]) assert.ok(plan(signals).visible.includes('announcements'), JSON.stringify(signals))
})

test('while streaming it comes after every primary live tile, so none of them moves', () => {
  const p = plan({ streaming: true })
  const at = p.visible.indexOf('announcements')
  for (const id of LIVE_PRIMARY) assert.ok(p.visible.indexOf(id) >= 0 && p.visible.indexOf(id) < at, `${id} before the announcements`)
  const without = plan({ streaming: true }, 200, 'announcements')
  assert.deepEqual(p.visible.filter((id) => id !== 'announcements'), without.visible, 'the other tiles keep their order')
  assert.deepEqual(Object.fromEntries(Object.entries(p.sizes).filter(([id]) => id !== 'announcements')), without.sizes, 'and their sizes')
})

test('with no room left it is still there, and only the tiles that score below it make way', () => {
  for (const [scn, signals] of Object.entries(STATES)) {
    const tight = plan(signals, 12)
    const bare = plan(signals, 12, 'announcements')
    assert.ok(tight.visible.includes('announcements'), `${scn}: present on a tight page`)
    const before = tight.visible.slice(0, tight.visible.indexOf('announcements'))
    assert.deepEqual(before, bare.visible.slice(0, before.length), `${scn}: every tile it scores below is where it was`)
    assert.equal(tight.visible[0], 'hero', `${scn}: the host first`)
  }
  assert.equal(plan({ streaming: true }, 12).visible.at(-1), 'announcements')
})

test('the tile data: posts, none unread and none at all; the last two are a quiet state with content, not a hole', () => {
  const T = homeTexts('en')
  const build = (announcements) => buildCatalogue({ announcements }, T).data.announcements
  const posts = [{ id: 'a', title: 'New release', category: 'update', date: '11-05', read: false }, { id: 'b', title: 'Maintenance', category: 'announce', date: '11-01', read: true }]
  const unread = build(posts)
  assert.equal(unread.type, 'news'); assert.equal(unread.quiet, false); assert.equal(unread.unread, 1); assert.match(unread.status, /^1 /)
  const read = build(posts.map((p) => ({ ...p, read: true })))
  assert.equal(read.quiet, true); assert.equal(read.status, T.newsAllRead); assert.equal(read.items.length, 2, 'the newest posts stay in the list')
  const none = build([])
  assert.ok(none && none.quiet === true && none.status === T.annNone, 'no announcement at all is still a tile')
  assert.equal(none.action, T.emptyNews, 'with no post the tile offers the one thing to do: open the announcements'); assert.equal(read.action, '')
  assert.equal(build(undefined), null, 'a host that gives no list has no tile: nothing is invented'); assert.equal(build(null), null)
  assert.equal(hasNoData(none), false, 'a quiet tile is not an empty one: it keeps 中 and its place')
  assert.equal(hasNoData({ type: 'news', items: [] }), true, 'a bare empty news list is still empty')
  for (const k of ['newsAllRead', 'newsUnread', 'rNewsPinned', 'rLiveNews']) assert.ok(T[k], `${k} in English`)
  const zh = homeTexts('zh')
  for (const k of ['newsAllRead', 'newsUnread', 'rNewsPinned', 'rLiveNews']) assert.ok(zh[k] && zh[k] !== T[k], `${k} in Chinese`)
})

test('a pin is not disturbed: the host stays first and the tile is not listed twice', () => {
  const pinned = plan({ streaming: true }, 200, undefined, { pins: ['announcements'] })
  assert.equal(pinned.visible.filter((id) => id === 'announcements').length, 1)
  assert.equal(pinned.reasons.announcements.key, 'rPinned'); assert.equal(pinned.visible[0], 'hero')
})
