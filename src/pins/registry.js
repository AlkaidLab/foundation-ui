// What can be pinned to the overview, and as what. Two kinds of things are pinned:
//  - an action: it becomes the action tile of the catalogue that does it (`ACTION_TILES`), shown on the overview;
//  - a setting of tier 1 or 2 with a switch, a few values or a slider: it becomes a small tile with the live control that writes the same configuration key
//    through the same saving path as the control cards of the home (`saveSettingKey`). A risky setting (`risk` in the settings model) is confirmed first.
// A setting of tier 3 is never pinned as a control: its tile opens its page instead (kind `link`).
import { SETTING_META } from '../settings/meta.js'

export const MAX_PINS = 24

/** Action of the unified search (and of an action row) -> the catalogue tile that does it. */
export const ACTION_TILES = Object.freeze({
  restart: 'act-restart', pair: 'act-pair', exportDiag: 'act-export-diag', checkUpdate: 'act-update', logs: 'act-logs', addApp: 'act-add-app',
  pairQr: 'act-pair-qr', streamCheck: 'act-stream-check', scanGames: 'act-scan-games', downloads: 'act-downloads', stop: 'act-stop', diagnostics: 'act-diagnostics', openDesktop: 'act-open-desktop',
})

// switches: the values the host keeps ('enabled' / 'disabled', or true / false) and what an unset key means
const sw = (on, off, def, icon, extra = {}) => ({ control: 'switch', on, off, def, icon, ...extra })
const E = (def, icon, extra) => sw('enabled', 'disabled', def, icon, extra)
const B = (def, icon, extra) => sw(true, false, def, icon, extra)
const opt = (value, en, zh) => ({ value, en, zh })

export const PIN_SETTINGS = Object.freeze({
  controller: E(true, 'sports_esports'), keyboard: E(true, 'keyboard'), mouse: E(true, 'mouse'), high_resolution_scrolling: E(true, 'swap_vert'),
  ds4_back_as_touchpad_click: E(true, 'touchpad_mouse'), motion_as_ds4: E(true, 'rotate_90_degrees_ccw'), touchpad_as_ds4: E(true, 'touchpad_mouse'),
  usb_forwarding_enabled: E(false, 'usb', { risk: 'medium' }), vdd_reuse: E(false, 'desktop_windows'), variable_refresh_rate: E(false, 'speed'),
  mdns_broadcast: E(true, 'wifi_tethering'), upnp: E(false, 'router', { risk: 'medium' }), fec_auto: E(false, 'network_check'),
  stream_audio: B(true, 'volume_up'), stream_mic: B(true, 'mic'), capture_cursor: B(true, 'visibility'), system_tray: B(true, 'notifications'),
  notify_pre_releases: B(false, 'campaign'), stop_on_last_video_session: B(false, 'stop_circle'),
  // a few values (a connected selector on the tile)
  gamepad: { control: 'seg', def: 'auto', icon: 'sports_esports', options: [opt('auto', 'Auto', '自动'), opt('x360', 'Xbox 360', 'Xbox 360'), opt('ds4', 'DualShock 4', 'DualShock 4'), opt('ds5', 'DualSense', 'DualSense')] },
  sleep_mode: { control: 'seg', def: '0', icon: 'bedtime', options: [opt('0', 'Suspend', '挂起'), opt('1', 'Hibernate', '休眠'), opt('2', 'Away', '离开')] },
  // a slider: the host keeps `value * scale` (the bitrate ceiling is kept in Kbps and shown in Mbps; 0 means the client decides)
  max_bitrate: { control: 'slider', def: 0, icon: 'speed', min: 0, max: 300, step: 5, unit: ' Mbps', scale: 1000, zeroText: { en: 'Auto', zh: '自动' } },
})

const T = { en: { pinned: 'Pinned to Overview', pin: 'Pin to Overview', unpin: 'Unpin from Overview', openPage: 'Opens its page', tier3: 'Opens its page' }, zh: { pinned: '已固定到概览', pin: '固定到概览', unpin: '取消固定', openPage: '打开所在页面', tier3: '高级项：固定后打开所在页面' } }
export const pinTexts = (locale = 'en') => (/^zh/i.test(String(locale)) ? T.zh : T.en)

/**
 * The spec of a setting to pin, from its configuration key and the row's own title and icon; null when the setting cannot be pinned (no key, not in the model).
 * Tier 1 and 2 settings that the registry knows are pinned with their control; a tier 3 setting (or one with a control the tile cannot draw) is a link.
 */
export function pinSpecForSetting(key, { title = '', icon = '', locale = 'en' } = {}) {
  const meta = SETTING_META[key]
  if (!key || !meta) return null
  const known = PIN_SETTINGS[key]
  const zh = /^zh/i.test(String(locale))
  if (known && meta.tier !== 3) {
    const base = { type: 'setting', key, title, icon: icon || known.icon, control: known.control, tier: meta.tier, ...(known.risk || meta.risk ? { risk: known.risk || meta.risk } : {}) }
    if (known.control === 'switch') return { ...base, on: known.on, off: known.off, def: known.def }
    if (known.control === 'seg') return { ...base, def: known.def, options: known.options.map((o) => ({ value: o.value, label: zh ? o.zh : o.en })) }
    return { ...base, def: known.def, min: known.min, max: known.max, step: known.step, unit: known.unit, scale: known.scale || 1, zeroText: known.zeroText ? (zh ? known.zeroText.zh : known.zeroText.en) : '' }
  }
  return { type: 'link', key, title, icon: icon || 'tune', tier: meta.tier }
}

/** The spec of an action to pin (a name of ACTION_TILES), null for an action with no tile. */
export function pinSpecForAction(action, { title = '', icon = '' } = {}) {
  const tile = ACTION_TILES[action]
  return tile ? { type: 'action', action, tile, title, icon } : null
}

/** The pages of a product that have a tile of the overview that opens them (the rows of the list pane); the pin menu of such a row pins that tile. */
export const PAGE_TILES = Object.freeze({ clients: 'act-clients', apps: 'act-apps', downloads: 'act-downloads', diagnostics: 'act-diagnostics', settings: 'act-settings' })

/** The spec of a page row to pin (a name of PAGE_TILES), null for a page with no tile. */
export function pinSpecForPage(page, { title = '', icon = '' } = {}) {
  const tile = PAGE_TILES[page]
  return tile ? { type: 'tile', tile, title, icon } : null
}
