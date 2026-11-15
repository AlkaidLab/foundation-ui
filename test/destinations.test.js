import assert from 'node:assert/strict'
import test from 'node:test'
import { DS5_CARDS, DS5_SUB, isClientKey, ds5PlaceOf } from '../src/settings/index.js'
import { readFileSync } from 'node:fs'


test('every key of the host snapshot has a place: a card, an advanced group, the page of keys this build does not apply, or the gamepad page', () => {
  const snapshot = JSON.parse(readFileSync(new URL('./fixtures/dualsense-snapshot-keys.json', import.meta.url), 'utf8'))
  assert.equal(snapshot.length, 106)
  assert.equal(snapshot.filter((k) => k.implemented).length, 95, 'the host applies 95 of the keys')
  const where = new Map()
  for (const key of snapshot) {
    const place = ds5PlaceOf(key)
    if (!place.sub) assert.equal(key.id, 1, `only the preset key lives on the gamepad page itself, not ${key.key}`)
    where.set(place.sub || 'root', (where.get(place.sub || 'root') || 0) + 1)
  }
  assert.equal([...where.values()].reduce((a, b) => a + b, 0), 106)
  for (const card of DS5_CARDS) assert.ok(where.has(DS5_SUB.card(card.id)), card.id)
  assert.equal(where.get(DS5_SUB.pending), 11, 'the page of keys not applied is small')
  // of those, the client ones are shown as the client's, the rest as not yet available
  const pending = snapshot.filter((k) => !k.implemented)
  assert.deepEqual(pending.filter(isClientKey).map((k) => k.id), [10, 98, 100, 101, 102, 105])
  assert.ok(DS5_SUB.isGroup(DS5_SUB.pending), 'it sits behind the advanced warning')
})

