import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_CATEGORY, getSearchIndex, SETTINGS_CATEGORIES, SETTINGS_GROUPS, STANDALONE_CATEGORIES, buildSettingsEntries, categoryOfRow, labelOf, pushRecent, recentRows, rowIdOf, scoreEntry, searchEntries } from '../src/settings/index.js'
import './helpers/settingsFixture.js'
import { createNav } from '../src/nav/backstack.js'
import { calculateScene, listDetailStrategy } from '../src/nav/scenes.js'

const labelZh = (key) => labelOf('zh', key)
const labelEn = (key) => labelOf('en', key)
const entries = (label, alt) => buildSettingsEntries({ index: getSearchIndex(), label, altLabel: alt })

test('the groups hold every category once (except the standalone ones) and open on the default one', () => {
  const ids = SETTINGS_GROUPS.flatMap((g) => g.categories)
  assert.deepEqual([...ids, ...STANDALONE_CATEGORIES, 'display', 'audio', 'input'].sort(), Object.keys(SETTINGS_CATEGORIES).sort(), '显示与视频, 音频 and 输入与外设 are rails of their own with places, not rows of this list')
  assert.ok(!ids.includes('av') && !('av' in SETTINGS_CATEGORIES), '音频/视频 is not a category of the settings any more')
  assert.deepEqual([...STANDALONE_CATEGORIES], ['appearance'], '个性化 is not a row of the settings list')
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids[0], DEFAULT_CATEGORY)
  // the original classification, DualSense not top-level
  for (const id of ['general', 'network', 'files']) assert.ok(ids.includes(id), id)
  assert.ok(!ids.includes('advanced') && !ids.includes('encoders'))
  assert.ok(!ids.includes('input'), '输入 is four pages of 输入与外设 now, not a row of the stream settings')
  assert.ok(!ids.includes('dualsense'))
})

test('rows: config tabs are config:<tab>, the other pages their own id', () => {
  assert.equal(rowIdOf('network'), 'config:network')
  assert.equal(categoryOfRow('config:network'), 'network')
  assert.equal(categoryOfRow('config', null), DEFAULT_CATEGORY)
  assert.equal(categoryOfRow('config', { tab: 'network' }), 'network')
  assert.equal(categoryOfRow('password'), 'password')
  assert.equal(categoryOfRow('dualsense'), '', 'no page of its own')
  assert.equal(rowIdOf('appearance'), 'config:appearance')
  assert.equal(categoryOfRow('apps'), '')
})

test('ranking: exact key, then prefix, then contains, then path', () => {
  const list = [
    { id: 1, title: 'Port forwarding', keyName: 'upnp', keywords: '' },
    { id: 2, title: 'Port', keyName: 'port', keywords: '' },
    { id: 3, title: 'Base', keyName: 'base_port', path: 'Network' },
    { id: 4, title: 'Other', keyName: 'x', path: 'Port settings' },
  ]
  assert.deepEqual(searchEntries(list, 'port').map((e) => e.id), [2, 1, 3, 4])
  assert.equal(scoreEntry(list[1], 'port'), 0)
  assert.equal(scoreEntry(list[0], 'zzz'), -1)
  assert.deepEqual(searchEntries(list, ''), [])
})

test('recently used: newest first, no duplicates, at most eight (the tile 最近操作 shows eight at 特大), unknown keys dropped', () => {
  let list = []
  for (const k of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'c']) list = pushRecent(list, k)
  assert.deepEqual(list, ['c', 'j', 'i', 'h', 'g', 'f', 'e', 'd'])
  const rows = recentRows(['hevc_mode', 'gone'], entries(labelZh, labelEn))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'hevc_mode')
})

// the navigation: the settings list opens on the default category, a resize keeps the place
const routes = { 'config:list': { role: 'list', rail: 'config' }, config: { role: 'detail', rail: 'config' }, password: { role: 'detail', rail: 'config' }, 'home': { role: 'detail', rail: 'overview', list: false } }
test('choosing the settings opens the list with the first page as detail; a category is a param of the page', () => {
  const nav = createNav({ routes, home: 'home' })
  nav.selectRail('config')
  assert.equal(nav.current.value, 'config')
  assert.equal(nav.detail.value, null)
  assert.equal(nav.defaultDetailOf(nav.list.value).id, 'config')
  nav.go('config', { tab: 'files' })
  assert.deepEqual(nav.detail.value.params, { tab: 'files' })
  nav.go('config', { tab: 'network', sub: 'connect', focus: 'port' })
  assert.deepEqual(nav.detail.value.params, { tab: 'network', sub: 'connect', focus: 'port' })
})

test('a resize keeps the selected category: wide shows both panes, narrow the page, the entries do not change', () => {
  const nav = createNav({ routes, home: 'home' })
  nav.go('config', { tab: 'network', sub: 'connect' })
  const before = nav.entries.value.map((e) => e.key)
  const wide = calculateScene([listDetailStrategy()], nav.entries.value, { width: 1200, height: 800, defaultDetailOf: nav.defaultDetailOf })
  const narrow = calculateScene([listDetailStrategy()], nav.entries.value, { width: 480, height: 800, defaultDetailOf: nav.defaultDetailOf })
  assert.equal(wide.panes.detail.params.tab, 'network')
  assert.equal(narrow.panes.detail.params.tab, 'network')
  assert.deepEqual(nav.entries.value.map((e) => e.key), before)
  // the list first on a phone: the list entry on top shows the list, the detail stays mounted behind it
  nav.selectRail('config')
  const phone = calculateScene([listDetailStrategy()], nav.entries.value, { width: 480, height: 800, defaultDetailOf: nav.defaultDetailOf })
  assert.equal(phone.kind, 'single')
  assert.equal(phone.visible, 'list')
})
