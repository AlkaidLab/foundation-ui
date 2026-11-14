import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PLACE, INPUT_PLACES, PLACE_TABS, SEARCH_INDEX, SETTINGS_GROUPS, labelOf, parentPlace, parseSettingsHash, placesOf, searchEntries, buildSettingsEntries, settingsHash } from '../src/settings/index.js'

// 输入 is four pages of 输入与外设 (手柄, 键盘, 鼠标与触控, USB 转发); there is no 高级 page and no row 输入 in the stream settings
const OLD_INPUT_KEYS = ['controller', 'gamepad', 'ds4_back_as_touchpad_click', 'usb_forwarding_enabled', 'back_button_timeout', 'keyboard', 'always_send_scancodes', 'key_rightalt_to_key_win', 'mouse',
  'high_resolution_scrolling', 'capture_cursor', 'native_pen_touch', 'usb_forwarding_port', 'motion_as_ds4', 'touchpad_as_ds4', 'enable_dsu_server', 'dsu_server_port', 'key_repeat_delay',
  'key_repeat_frequency', 'native_touchpad_optimization', 'amf_draw_mouse_cursor', 'virtual_mouse']
const WHERE = {
  gamepad: ['controller', 'gamepad', 'ds4_back_as_touchpad_click', 'back_button_timeout', 'motion_as_ds4', 'touchpad_as_ds4', 'enable_dsu_server', 'dsu_server_port'],
  keyboard: ['keyboard', 'always_send_scancodes', 'key_rightalt_to_key_win', 'key_repeat_delay', 'key_repeat_frequency'],
  mouse: ['mouse', 'high_resolution_scrolling', 'capture_cursor', 'native_pen_touch', 'native_touchpad_optimization', 'amf_draw_mouse_cursor', 'virtual_mouse'],
  usb: ['usb_forwarding_enabled', 'usb_forwarding_port'],
}
const entry = (id) => SEARCH_INDEX.filter((e) => e.id === id)

test('every key of the old input page is on exactly one of the four pages, and each page has what was named for it', () => {
  for (const key of OLD_INPUT_KEYS) assert.equal(entry(key).length, 1, `${key} is in the index once`)
  const placed = OLD_INPUT_KEYS.map((key) => entry(key)[0].params)
  for (const [key, p] of OLD_INPUT_KEYS.map((k, i) => [k, placed[i]])) assert.equal(p.tab, 'input', `${key} stays in 输入与外设`)
  for (const [place, keys] of Object.entries(WHERE)) for (const key of keys) assert.equal(entry(key)[0].params.sub, place, `${key} is on ${place}`)
  assert.equal(Object.values(WHERE).flat().length, OLD_INPUT_KEYS.length, 'no key is on two pages')
  assert.deepEqual(SEARCH_INDEX.filter((e) => e.params.tab === 'input' && !['gamepad', 'keyboard', 'mouse', 'usb'].includes(e.params.sub)), [], 'no entry is on a page that is not one of the four (no 高级, no drivers page)')
})

test('the places of 输入与外设: 手柄, 键盘, 鼠标与触控, USB 转发 (Windows only); the first one is the default; the rows are not under the stream settings', () => {
  assert.deepEqual(INPUT_PLACES.map((p) => p.id), ['gamepad', 'keyboard', 'mouse', 'usb'])
  assert.equal(PLACE_TABS.input, INPUT_PLACES); assert.equal(DEFAULT_PLACE.input, 'gamepad')
  assert.deepEqual(placesOf('input', 'linux').map((p) => p.id), ['gamepad', 'keyboard', 'mouse']); assert.equal(placesOf('input', 'windows').length, 4)
  assert.equal(SETTINGS_GROUPS.flatMap((g) => g.categories).includes('input'), false)
  assert.equal(labelOf('zh', 'config.input_mouse_title'), '鼠标与触控'); assert.equal(labelOf('zh', 'shell.usb_forwarding'), 'USB 转发')
})

test('a page inside the gamepad page belongs to 手柄; a place belongs to itself', () => {
  assert.equal(parentPlace('input', 'keyboard'), 'keyboard'); assert.equal(parentPlace('input', 'gamepad-pergame'), 'gamepad'); assert.equal(parentPlace('input', 'ds5-lightbar'), 'gamepad')
  assert.equal(parentPlace('display', 'modes'), 'modes'); assert.equal(parentPlace('general', 'prep'), '')
})

test('the old addresses of 输入 lead to the page of the key, else to 手柄', () => {
  const at = (hash) => parseSettingsHash(hash, SEARCH_INDEX)
  assert.deepEqual(at('#tab=input'), { tab: 'input', sub: 'gamepad' })
  assert.deepEqual(at('#tab=input&focus=ds5-block'), { tab: 'input', sub: 'gamepad', focus: 'ds5-block' })
  assert.deepEqual(at('#tab=input&focus=always_send_scancodes'), { tab: 'input', sub: 'keyboard', focus: 'always_send_scancodes' })
  assert.deepEqual(at('#tab=input&sub=expert&focus=key_repeat_delay'), { tab: 'input', sub: 'keyboard', focus: 'key_repeat_delay' })
  assert.deepEqual(at('#tab=input&sub=drivers&focus=virtual_mouse'), { tab: 'input', sub: 'mouse', focus: 'virtual_mouse' })
  assert.deepEqual(at('#tab=input&sub=drivers'), { tab: 'input', sub: 'gamepad' })
  assert.deepEqual(at('#tab=input&sub=expert'), { tab: 'input', sub: 'gamepad' })
  assert.deepEqual(at('#input'), { tab: 'input', sub: 'gamepad' })
  assert.deepEqual(at('#usb_forwarding_port'), { tab: 'input', sub: 'usb', focus: 'usb_forwarding_port' })
  assert.deepEqual(at('#tab=input&sub=gamepad-pergame'), { tab: 'input', sub: 'gamepad-pergame' }, 'a page inside the gamepad page keeps its address')
  assert.equal(settingsHash({ tab: 'input', sub: 'keyboard', focus: 'keyboard' }), '#tab=input&sub=keyboard&focus=keyboard')
})

test('the search lands on the right page, with the rail in its path', () => {
  const rows = buildSettingsEntries({ index: SEARCH_INDEX, label: (k) => labelOf('zh', k) })
  const hit = (q) => searchEntries(rows, q)[0]
  assert.deepEqual([hit('key_repeat_delay').params.tab, hit('key_repeat_delay').params.sub], ['input', 'keyboard'])
  assert.equal(hit('按键重复') ? hit('按键重复').params.sub : 'keyboard', 'keyboard')
  assert.equal(hit('virtual_mouse').params.sub, 'mouse'); assert.equal(hit('dsu_server_port').params.sub, 'gamepad'); assert.equal(hit('usb_forwarding_enabled').params.sub, 'usb')
  assert.equal(hit('capture_cursor').path, '输入与外设 › 鼠标与触控')
})

test('the one page is called 诊断与日志, and a search for either old name still finds its row', async () => {
  const fs = await import('node:fs')
  const src = fs.readFileSync(new URL('../src/diagnostics/texts.js', import.meta.url), 'utf8')
  assert.match(src, /title: 'Diagnostics and logs',/); assert.match(src, /title: '诊断与日志',/)
  assert.ok(!/日志与诊断|Logs and diagnostics/.test(src))
  const { rowKeywords, rowLines, ROW_IDS } = await import('../src/settings/rowLines.js')
  assert.ok(!ROW_IDS.includes('troubleshooting'), 'the two rows are one')
  assert.match(rowLines({ locale: 'zh' }).diagnostics, /AI 诊断/)
  assert.match(rowLines({ locale: 'zh' }).diagnostics, /重启/)
  assert.ok(rowKeywords('diagnostics').includes('日志与排错') && rowKeywords('diagnostics').includes('Logs and troubleshooting'))
  const page = fs.readFileSync(new URL('../src/vue/MDiagnostics.vue', import.meta.url), 'utf8')
  assert.ok(page.indexOf("has('restart')") < page.indexOf('m-diag__tabs'), 'restart sits at the top')
  assert.ok(!/v-if="panel"/.test(page), 'panel-only behaviour is a fact passed in, not a second page')
})
