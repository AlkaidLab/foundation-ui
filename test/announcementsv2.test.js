import test from 'node:test'
import assert from 'node:assert/strict'
import { COUNTDOWN, MODES, acknowledge, activeItems, ackedAt, loadAcked, loadShown, markShown, mustReadReady, parseAnnouncements, popupItem, toDocument, topItem } from '../src/announcements/index.js'

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m } }
const item = (extra = {}) => ({ id: 'a', severity: 'info', title: { en: 'T' }, body: { en: 'B' }, ...extra })
const doc = (...items) => ({ schema: 1, items })

test('three modes: notice (the default), modal and must-read; an unknown mode is not an item', () => {
  assert.deepEqual([...MODES], ['notice', 'modal', 'must-read'])
  const items = parseAnnouncements(doc(item(), item({ id: 'm', mode: 'modal' }), item({ id: 'r', mode: 'must-read' }), item({ id: 'x', mode: 'banner' })))
  assert.deepEqual(items.map((i) => [i.id, i.mode, i.countdown]), [['a', 'notice', 0], ['m', 'modal', 0], ['r', 'must-read', COUNTDOWN.fallback]])
})

test('the countdown is whole seconds from 0 to 60 and belongs to the must-read only', () => {
  assert.equal(parseAnnouncements(doc(item({ mode: 'must-read', countdown: 12 })))[0].countdown, 12)
  assert.equal(parseAnnouncements(doc(item({ mode: 'must-read', countdown: 0 })))[0].countdown, 0)
  for (const bad of [-1, 61, 1.5, '5']) assert.deepEqual(parseAnnouncements(doc(item({ mode: 'must-read', countdown: bad }))), [], String(bad))
  assert.equal(parseAnnouncements(doc(item({ mode: 'modal', countdown: 30 })))[0].countdown, 0, 'a modal has none')
  const again = parseAnnouncements(toDocument(parseAnnouncements(doc(item({ mode: 'must-read', countdown: 9 })))))
  assert.deepEqual([again[0].mode, again[0].countdown], ['must-read', 9], 'the stored copy keeps them')
})

test('the strip shows notices only; a modal comes once, a must-read until it is acknowledged, a must-read before a modal', () => {
  const items = parseAnnouncements(doc(item({ id: 'n' }), item({ id: 'm', mode: 'modal' }), item({ id: 'r', mode: 'must-read', severity: 'warn' })))
  const now = Date.now()
  assert.equal(topItem(items, { now }).id, 'n')
  assert.equal(popupItem(items, { now }).id, 'r')
  assert.equal(popupItem(items, { now, acked: ['r'] }).id, 'm')
  assert.equal(popupItem(items, { now, acked: ['r'], shown: ['m'] }), null)
  const list = activeItems(items, { now, acked: ['r'], shown: [] })
  assert.deepEqual(list.map((i) => [i.id, i.read]).sort(), [['m', false], ['n', false], ['r', true]])
  assert.ok(list.filter((i) => i.mode !== 'notice').every((i) => i.dismissible === false), 'a popup is not dismissed from the list')
  assert.equal(topItem(parseAnnouncements(doc(item({ id: 'm', mode: 'modal' }))), { now }), null, 'a modal never sits in the strip')
})

test('a must-read can be acknowledged once the end of the text is reached (no countdown)', () => {
  assert.equal(mustReadReady({ atEnd: false }), false)
  assert.equal(mustReadReady({ atEnd: true }), true)
  assert.equal(mustReadReady({ atEnd: true, secondsLeft: 3 }), true, 'an old countdown is ignored')
})

test('shown and acknowledged are kept in the storage, with the time of the acknowledgement; a bad id is refused', () => {
  const storage = memory()
  assert.deepEqual([loadShown(storage), loadAcked(storage)], [[], []])
  assert.equal(markShown('m', storage), true); assert.equal(markShown('m', storage), true)
  assert.deepEqual(loadShown(storage), ['m'])
  assert.equal(acknowledge('r', storage, 1234), true)
  assert.deepEqual(loadAcked(storage), ['r']); assert.equal(ackedAt('r', storage), 1234); assert.equal(ackedAt('nope', storage), null)
  assert.equal(markShown('bad id', storage), false); assert.equal(acknowledge('', storage), false)
})
