import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DS5_CARDS, DS5_SUB, LABELS, isClientKey, SEARCH_INDEX, SETTINGS_CATEGORIES, SETTINGS_GROUPS, categoryOfRow, dualsenseEntries, ds5PlaceOf, labelOf, settingsGroups,
} from '../src/settings/index.js'
import { readFileSync } from 'node:fs'

const zh = (key) => labelOf('zh', key)
const en = (key) => labelOf('en', key)
const crumb = (entry) => [...String(entry.path || '').split(' › ').filter(Boolean), entry.title].join(' › ')

test('DualSense is in no list, no rail destination and no page of the settings', () => {
  assert.ok(!SETTINGS_GROUPS.flatMap((g) => g.categories).includes('dualsense'))
  assert.ok(!Object.keys(SETTINGS_CATEGORIES).includes('dualsense'))
  for (const locale of Object.keys(LABELS)) {
    const items = settingsGroups({ label: (key) => labelOf(locale, key) }).flatMap((g) => g.items)
    for (const item of items) {
      assert.ok(!/dualsense/i.test(`${item.id} ${item.route} ${item.category}`), `${locale}: ${item.id}`)
      assert.ok(!/dualsense/i.test(item.label), `${locale}: label of ${item.id}`)
    }
  }
  assert.equal(categoryOfRow('dualsense'), '')
  assert.ok(!SEARCH_INDEX.some((e) => /dualsense/.test(e.id)), 'no row opens a DualSense page')
})

test('the way to a DualSense setting is 输入 › 手柄 › card, in both languages, and it opens the sub-page of the gamepad page', () => {
  const keys = [
    { id: 3, key: 'ds5.haptics.hd.gain', label: 'Haptics gain', group: 1, tier: 'common' },
    { id: 24, key: 'ds5.trigger.adaptive.enabled', label: 'Trigger', group: 3, tier: 'common' },
    { id: 36, key: 'ds5.gamepad.stick.left.deadzoneInner', label: 'Left dead zone', group: 4, tier: 'advanced' },
    { id: 1, key: 'ds5.profile.preset', label: 'Preset', group: 0, tier: 'common' },
  ]
  const zhRows = dualsenseEntries({ keys, label: zh, locale: 'zh' })
  assert.equal(zhRows[0].path, '输入 › 手柄 › 触觉与震动')
  assert.equal(zhRows[1].path, '输入 › 手柄 › 自适应扳机')
  assert.equal(zhRows[2].path, '输入 › 手柄 › 摇杆')
  assert.equal(zhRows[3].path, '输入 › 手柄')
  assert.equal(dualsenseEntries({ keys, label: en, locale: 'en' })[0].path, 'Input › Gamepad › Haptics and rumble')
  for (const entry of zhRows) assert.equal(entry.route, 'config')
  assert.deepEqual(zhRows[0].params, { tab: 'input', sub: 'ds5-haptics', focus: 'ds5:ds5.haptics.hd.gain' })
  assert.deepEqual(zhRows[2].params.sub, 'ds5-g4')
  assert.ok(!('sub' in zhRows[3].params), 'the preset row is on the gamepad page itself')
  assert.ok(!zhRows.some((e) => /DualSense 调校|DualSense/.test(e.path)), 'no page called DualSense in the way')
})

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

