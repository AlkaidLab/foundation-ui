import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_PINS, pinSpecForAction, pinSpecForSetting } from '../src/pins/registry.js'
import { isPinnedOnHome, pinToHome, unpinFromHome } from '../src/pins/home.js'
import { LAYOUT_VERSION, pinIdOf, useDashLayout } from '../src/vue/useDashLayout.js'
import { pinCards } from '../src/vue/homePins.js'

const memory = () => { const s = {}; return { s, getItem: (k) => s[k] ?? null, setItem: (k, v) => { s[k] = v } } }

test('a setting is pinned as the control it is: a switch, a few values, a slider; the rest as a link to its page', () => {
  const sw = pinSpecForSetting('controller', { title: 'Gamepad', icon: 'sports_esports' })
  assert.deepEqual([sw.type, sw.control, sw.on, sw.off], ['setting', 'switch', 'enabled', 'disabled'])
  const sl = pinSpecForSetting('max_bitrate', { title: 'Bitrate', locale: 'zh' })
  assert.deepEqual([sl.control, sl.scale, sl.max, sl.zeroText], ['slider', 1000, 300, '自动'])
  const seg = pinSpecForSetting('gamepad', { title: 'Pad', locale: 'zh' })
  assert.deepEqual(seg.options.map((o) => o.label), ['自动', 'Xbox 360', 'DualShock 4', 'DualSense'])
  assert.equal(pinSpecForSetting('no_such_key', { title: 'x' }), null)
  assert.equal(pinSpecForAction('restart').tile, 'act-restart'); assert.equal(pinSpecForAction('nope'), null)
})

test('pin and unpin: into the saved layout of the home, shown, taken off again; an action is its catalogue tile', () => {
  const st = memory()
  const spec = pinSpecForSetting('stream_mic', { title: 'Mic' })
  assert.equal(isPinnedOnHome('h', spec, st), false)
  const r = pinToHome('h', spec, st)
  assert.equal(r.ok, true); assert.equal(r.id, pinIdOf(spec))
  assert.equal(isPinnedOnHome('h', spec, st), true)
  const layout = useDashLayout('h', st)
  assert.ok(layout.state.order.includes(r.id) && layout.state.overrides[r.id] === true)
  assert.equal(pinCards(layout.state.pins, {}, 'en').length, 1, 'the tile exists on the overview')
  assert.equal(unpinFromHome('h', spec, st), true); assert.equal(isPinnedOnHome('h', spec, st), false)
  const act = pinSpecForAction('logs', { title: 'Logs' })
  assert.equal(pinToHome('h', act, st).ok, true); assert.equal(isPinnedOnHome('h', act, st), true); unpinFromHome('h', act, st); assert.equal(isPinnedOnHome('h', act, st), false)
})

test('the pins are kept: a layout saved before the pins loads with its order, and the limit holds', () => {
  const st = memory()
  st.setItem('foundation-ui.dash2.old', JSON.stringify({ v: 3, order: ['gpu', 'hero', 'cpu'], overrides: { cpu: false }, sizes: { gpu: 'm' } }))
  const old = useDashLayout('old', st)
  assert.deepEqual(old.state.pins, {}); assert.equal(old.state.sizes.gpu, 'm'); assert.equal(old.state.overrides.cpu, false)
  assert.ok(old.state.order.indexOf('gpu') < old.state.order.indexOf('hero') && old.state.order.indexOf('hero') < old.state.order.indexOf('cpu'))
  old.addPin(pinSpecForSetting('controller', { title: 'Gamepad' }))
  const again = useDashLayout('old', { getItem: (k) => st.s[k] })
  assert.equal(Object.keys(again.state.pins).length, 1, 'a reload keeps the pin')
  assert.equal(JSON.parse(st.s['foundation-ui.dash2.old']).v, LAYOUT_VERSION)
  const full = useDashLayout('full', memory())
  let added = 0
  for (const key of ['controller', 'keyboard', 'mouse', 'stream_audio', 'stream_mic', 'capture_cursor', 'system_tray', 'mdns_broadcast', 'upnp', 'fec_auto', 'vdd_reuse', 'variable_refresh_rate', 'usb_forwarding_enabled', 'high_resolution_scrolling', 'ds4_back_as_touchpad_click', 'motion_as_ds4', 'touchpad_as_ds4', 'notify_pre_releases', 'stop_on_last_video_session', 'gamepad', 'sleep_mode', 'max_bitrate']) { if (full.addPin(pinSpecForSetting(key, { title: key }))) added++ }
  assert.ok(added <= MAX_PINS)
})
