import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_CATEGORY, ENCODER_IDS, LABELS, SEARCH_INDEX, SETTINGS_CATEGORIES, SETTINGS_GROUPS, STANDALONE_CATEGORIES, buildSettingsEntries, categoryOfRow,
  dualsenseEntries, labelOf, parseSettingsHash, pushRecent, recentRows, rowIdOf, scoreEntry, searchEntries, rowLines, settingsGroups, settingsHash,
} from '../src/settings/index.js'
import { createNav } from '../src/nav/backstack.js'
import { calculateScene, listDetailStrategy } from '../src/nav/scenes.js'

const labelZh = (key) => labelOf('zh', key)
const labelEn = (key) => labelOf('en', key)
const entries = (label, alt) => buildSettingsEntries({ index: SEARCH_INDEX, label, altLabel: alt })

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

test('the list groups carry labels in both languages and a second line for every row', () => {
  const lines = rowLines({ locale: 'zh', config: { sunshine_name: 'Host', active_encoder: 'nvenc', port: 47989, upnp: 'disabled', hevc_mode: 0, av1_mode: 1 } })
  const items = settingsGroups({ label: labelZh, lines }).flatMap((g) => g.items)
  assert.equal(rowLines({ locale: 'zh', config: { active_encoder: 'nvenc', hevc_mode: 0, av1_mode: 1 } })['display-encoders'], 'NVENC · H.264/HEVC')
  assert.equal(items.find((i) => i.category === 'network').text, '端口 47989 · UPnP 关')
  assert.equal(items.find((i) => i.category === 'general').text, '语言、主机名称、睡眠模式', 'no live state that matters: what is inside')
  assert.ok(items.every((i) => i.text), 'no row is blank')
  assert.equal(items.find((i) => i.category === 'general').label, '常规')
  assert.equal(items.find((i) => i.category === 'appearance'), undefined, '个性化 has no row in the list')
})

test('a hash lands on tab, section and row; the key form and the old forms both work', () => {
  // the old address of a setting that moved from 音频/视频 into 显示 lands on it
  assert.deepEqual(parseSettingsHash('#tab=av&sub=display&focus=hdr_prep', SEARCH_INDEX), { tab: 'display', sub: 'hdr', focus: 'hdr_prep' })
  assert.deepEqual(parseSettingsHash('#focus=hevc_mode', SEARCH_INDEX), { tab: 'display', sub: 'encoders', focus: 'hevc_mode' })
  assert.deepEqual(parseSettingsHash('#network', SEARCH_INDEX), { tab: 'network' })
  assert.deepEqual(parseSettingsHash('#nv', SEARCH_INDEX), { tab: 'display', sub: 'encoders' })
  assert.deepEqual(parseSettingsHash('#bind_address', SEARCH_INDEX), { tab: 'network', focus: 'bind_address' }, 'the advanced settings of a tab are on the tab page')
  assert.equal(parseSettingsHash('#tab=nothing', SEARCH_INDEX), null)
  assert.equal(parseSettingsHash('', SEARCH_INDEX), null)
  assert.equal(settingsHash({ tab: 'display', sub: 'hdr', focus: 'x' }), '#tab=display&sub=hdr&focus=x')
  assert.ok(ENCODER_IDS.includes('nv'))
})

test('every setting of the index is found by its label in both languages and by its key name', () => {
  const zh = entries(labelZh, labelEn)
  const en = entries(labelEn, labelZh)
  assert.equal(zh.length, SEARCH_INDEX.length)
  for (const e of SEARCH_INDEX) {
    const inZh = zh.find((x) => x.keyName === e.id)
    const inEn = en.find((x) => x.keyName === e.id)
    // by key name (exact and with spaces), by Chinese label, by English label (also from the Chinese interface)
    assert.ok(searchEntries(zh, e.id, 8).includes(inZh), `key ${e.id}`)
    assert.ok(searchEntries(zh, e.id.replace(/_/g, ' '), 8).includes(inZh), `key words ${e.id}`)
    assert.ok(searchEntries(zh, inZh.title, 12).some((x) => x.keyName === e.id), `zh label ${e.id}`)
    assert.ok(searchEntries(en, inEn.title, 12).some((x) => x.keyName === e.id), `en label ${e.id}`)
    assert.ok(searchEntries(zh, inEn.title, 12).some((x) => x.keyName === e.id), `en label in zh ${e.id}`)
    assert.ok(inZh.path.length > 0)
  }
})

test('hevc_mode finds the codec row first and the result shows the category path', () => {
  const zh = entries(labelZh, labelEn)
  const [first] = searchEntries(zh, 'hevc_mode')
  assert.equal(first.keyName, 'hevc_mode')
  assert.equal(first.params.focus, 'hevc_mode')
  assert.ok(first.path.startsWith('显示与视频'))
  assert.equal(searchEntries(zh, 'hevc mode')[0].keyName, 'hevc_mode')
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

test('DualSense keys are searchable by label, key name and place', () => {
  const keys = [
    { id: 2, key: 'ds5.haptics.hd.gain', label: 'Haptics gain', group: 1, tier: 'common' },
    { id: 31, key: 'ds5.trigger.adaptive.slopeScale', label: 'Trigger adaptive slope Scale', group: 3, tier: 'advanced' },
  ]
  const ds = dualsenseEntries({ keys, label: labelZh, locale: 'zh', altLocale: 'en' })
  assert.equal(ds[0].params.sub, 'ds5-haptics')
  assert.equal(ds[1].params.sub, 'ds5-g3')
  assert.equal(ds[1].path, '输入 › 手柄 › 自适应扳机')
  assert.equal(searchEntries(ds, 'ds5.haptics.hd.gain')[0].keyName, 'ds5.haptics.hd.gain')
  assert.equal(searchEntries(ds, '触觉增益')[0].keyName, 'ds5.haptics.hd.gain')
  assert.equal(searchEntries(ds, 'slope')[0].keyName, 'ds5.trigger.adaptive.slopeScale')
  assert.equal(ds[0].route, 'config')
  assert.equal(ds[0].params.tab, 'input')
})

test('every language has the list texts or falls back to English', () => {
  for (const locale of Object.keys(LABELS)) assert.ok(labelOf(locale, 'tabs.general'), locale)
  assert.equal(labelOf('xx', 'tabs.general'), labelOf('en', 'tabs.general'))
  assert.equal(labelOf('zh', 'shell.recent'), '最近使用')
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
