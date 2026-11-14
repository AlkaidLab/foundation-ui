// The model of the main settings area (主机设置 / 配置), shared by the Web UI and the control panel: which categories
// exist, how the list pane groups them, where a link or a hash lands and what second line a category shows. Pure: no
// DOM, no Vue. The categories are the remaining configuration tabs plus the pages that sit beside them.
import { DISPLAY_TREE, LEGACY_DISPLAY_PLACES } from './displayTree.js'

/**
 * Categories in list order, by group. Display and video settings, including codecs, are places on the 显示与视频 rail;
 * the list retains the remaining configuration pages, plus 个性化 (the appearance) and 更改密码.
 * DualSense is not a category and has no page: it is part of the gamepad page of 输入, with sub-pages (see dualsense.js).
 */
export const SETTINGS_GROUPS = Object.freeze([
  Object.freeze({ id: 'base', categories: Object.freeze(['general', 'files']) }),
  Object.freeze({ id: 'network', categories: Object.freeze(['network']) }),
  Object.freeze({ id: 'account', categories: Object.freeze(['password']) }),
])

/** Categories that are not rows of the list: 个性化 is a destination of its own, a button in the foot of the rail beside 关于 and the sponsor heart. */
export const STANDALONE_CATEGORIES = Object.freeze(['appearance'])

export const SETTINGS_CATEGORIES = Object.freeze({
  general: { id: 'general', icon: 'settings', labelKey: 'tabs.general', route: 'config' },
  files: { id: 'files', icon: 'folder', labelKey: 'tabs.files', route: 'config' },
  input: { id: 'input', icon: 'mouse', labelKey: 'tabs.input', route: 'config' },
  network: { id: 'network', icon: 'lan', labelKey: 'tabs.network', route: 'config' },
  appearance: { id: 'appearance', icon: 'palette', labelKey: 'shell.appearance', route: 'config' },
  // 显示与视频 and 音频 (a rail of their own, not rows of the settings list): their pages are the places below
  display: { id: 'display', icon: 'desktop_windows', labelKey: 'tabs.display', route: 'config' },
  audio: { id: 'audio', icon: 'volume_up', labelKey: 'tabs.audio', route: 'config' },
  password: { id: 'password', icon: 'verified_user', labelKey: 'navbar.security', route: 'password' },
})

/**
 * The pages of 显示与视频 and of 音频, the two rails that hold what the old tab 音频/视频 of the settings held (and the display settings that were in 高级). A page is a place (`sub`) of the tab
 * `display` or `audio`; `page` is its id in the lists of the products. 显示与视频 (the tree in displayTree.js): 显示器, 分辨率与刷新率, HDR, 画质增强, 编码与码率, 基地虚拟显示器 and, last, 高级 (capture, graphics card, compatibility, sync). 音频: the sound that is streamed and the virtual audio devices, and the microphone. `windows` pages exist on a Windows host only (a host of
 * another system lists the others, so no list ever has one row).
 */
export const DISPLAY_PLACES = Object.freeze(DISPLAY_TREE.map((p) => Object.freeze({ id: p.place, page: p.page, icon: p.icon, labelKey: p.labelKey, windows: p.windows })))
/**
 * The pages of 输入与外设: a place of the tab `input` each (the same pattern as 显示与视频 and 音频). 手柄 holds the gamepad, its type, per game, DualSense, the ds4 and DSU items and the ViGEm driver;
 * 键盘 its switch, scancodes and key repeat; 鼠标与触控 its switch, scrolling, pen and touch, the touchpad and the virtual mouse driver; USB 转发 the switch and the port (Windows hosts; the list of
 * the devices on this computer is the control panel's own page). What was 高级 sits at the bottom of the page of the thing it changes: there is no page of its own.
 */
export const INPUT_PLACES = Object.freeze([
  Object.freeze({ id: 'gamepad', page: 'gamepad', icon: 'sports_esports', labelKey: 'shell.gamepad', windows: false }),
  Object.freeze({ id: 'keyboard', page: 'keyboard', icon: 'keyboard', labelKey: 'config.input_keyboard_title', windows: false }),
  Object.freeze({ id: 'mouse', page: 'mouse', icon: 'mouse', labelKey: 'config.input_mouse_title', windows: false }),
  Object.freeze({ id: 'usb', page: 'usb', icon: 'usb', labelKey: 'shell.usb_forwarding', windows: true }),
])
export const AUDIO_PLACES = Object.freeze([
  Object.freeze({ id: 'sound', page: 'audio-output', icon: 'speaker', labelKey: 'shell.audio_output', windows: false }),
  Object.freeze({ id: 'microphone', page: 'microphone', icon: 'mic', labelKey: 'shell.microphone', windows: false }),
])
/** The tabs that are a rail of places, and the place that opens when none is named. */
export const PLACE_TABS = Object.freeze({ display: DISPLAY_PLACES, audio: AUDIO_PLACES, input: INPUT_PLACES })
export const DEFAULT_PLACE = Object.freeze({ display: 'output', audio: 'sound', input: 'gamepad' })
/** The places a host shows of a rail tab: all of them on Windows, the others elsewhere. */
export const placesOf = (tab, platform = 'windows') => (PLACE_TABS[tab] || []).filter((p) => platform === 'windows' || !p.windows)
export const displayPlaces = (platform = 'windows') => placesOf('display', platform)
export const audioPlaces = (platform = 'windows') => placesOf('audio', platform)
export const inputPlaces = (platform = 'windows') => placesOf('input', platform)
/**
 * The place a `sub` of a tab belongs to: a place is its own; the pages inside the gamepad page (per game, the DualSense groups) belong to 手柄. '' when the tab has no places.
 * A page of a place has Back; a place has none (the rail and the list are the way back).
 */
export function parentPlace(tab, sub) {
  const places = PLACE_TABS[tab]
  if (!places) return ''
  if (places.some((p) => p.id === sub)) return sub
  return tab === 'input' && sub ? 'gamepad' : ''
}

/**
 * Where an address of the old places lands. The tab 音频/视频 (`av`) is gone: its video went to 显示与视频, its audio and the microphone to 音频, its display settings (HDR, the virtual display, the
 * resolution and refresh handling, the adapter that was in 高级) to 显示与视频. A setting is found by its key in the search index wherever the old address put it.
 */
const LEGACY_SUBS = Object.freeze({
  'av:display': { tab: 'display', sub: 'hdr' }, 'av:virtual': { tab: 'display', sub: 'virtual' }, 'av:microphone': { tab: 'audio', sub: 'microphone' }, 'av:expert': { tab: 'audio', sub: 'sound' },
})
const LEGACY_TABS = Object.freeze(['av', 'advanced', 'encoders'])

/** Ids of the configuration tabs (the categories that are pages of /config). */
export const CONFIG_TAB_IDS = Object.freeze(Object.values(SETTINGS_CATEGORIES).filter((c) => c.route === 'config').map((c) => c.id))
export const ENCODER_IDS = Object.freeze(['nv', 'qsv', 'amd', 'vt', 'sw'])
/** The category that is selected when the settings open: never an empty pane. */
export const DEFAULT_CATEGORY = 'general'


const isTab = (id) => CONFIG_TAB_IDS.includes(id)

/** List row id of a category: `config:<tab>` for a tab, the page id otherwise. */
export const rowIdOf = (category) => (SETTINGS_CATEGORIES[category]?.route === 'config' ? `config:${category}` : category)

/** The category a row id, or a route with its params, stands for ('' when it is not a settings page). */
export function categoryOfRow(id, params) {
  if (typeof id === 'string' && id.startsWith('config:')) return isTab(id.slice(7)) ? id.slice(7) : ''
  if (id === 'config') return isTab(params?.tab) ? params.tab : DEFAULT_CATEGORY
  return id === 'password' ? id : ''
}

/**
 * The groups of the list pane: [{ id, items: [{ id, category, route, params, icon, label, text? }] }].
 * label(key) resolves a locale key; lines[rowId] is the second line (the live state or the contents, see rowLines.js; a row without one has none).
 */
export function settingsGroups({ label, lines = {} }) {
  return SETTINGS_GROUPS.map((group) => ({
    id: group.id,
    items: group.categories.map((id) => {
      const c = SETTINGS_CATEGORIES[id]
      return { id: rowIdOf(id), category: id, route: c.route, params: c.route === 'config' ? { tab: id } : undefined, icon: c.icon, label: label(c.labelKey), text: lines[rowIdOf(id)] || '' }
    }),
  }))
}

/** Landing place of an address hash: `#tab=av&sub=display&focus=hevc_mode`, `#<key>`, `#<tab>` or `#<encoder>`. null when it names nothing. */
export function parseSettingsHash(hash, index = []) {
  const raw = String(hash || '').replace(/^#/, '')
  if (!raw) return null
  if (raw.includes('=')) {
    const p = new URLSearchParams(raw)
    const tab = p.get('tab') || ''
    const focus = p.get('focus') || ''
    const hit = focus && index.find((entry) => entry.id === focus)
    const where = tab ? { tab } : hit ? { tab: hit.params.tab, ...(hit.params.sub ? { sub: hit.params.sub } : {}) } : null
    if (!where) return null
    const sub = p.get('sub') || where.sub || ''
    const place = movedPlace(where.tab, sub, focus, index)
    return isTab(place.tab) ? { ...place, ...(focus ? { focus } : {}) } : null
  }
  if (raw === 'av' || raw === 'advanced' || raw === 'encoders') return movedPlace(raw, '', '', index)
  if (isTab(raw)) return PLACE_TABS[raw] ? { tab: raw, sub: DEFAULT_PLACE[raw] } : { tab: raw }
  if (ENCODER_IDS.includes(raw)) return { tab: 'display', sub: 'encoders' }
  const hit = index.find((entry) => entry.id === raw)
  if (!hit) return null
  const { tab, sub } = hit.params
  return { tab, ...(sub ? { sub } : {}), focus: hit.id }
}

/** A tab and section of an old address, moved to where the setting is now: { tab, sub? }. */
function movedPlace(tab, sub, focus, index) {
  // the two sections of the old 输入 page that are gone (高级, the drivers): the key decides, else the first place
  if (tab === 'input' && (sub === 'expert' || sub === 'drivers')) sub = ''
  // a link with a key and no place: the place of the key (the old addresses of 输入 and the tabs that were pages with one place)
  if (focus && PLACE_TABS[tab] && !sub) {
    const own = index.find((entry) => entry.id === focus)
    if (own && own.params.tab === tab && own.params.sub) return { tab, sub: own.params.sub }
  }
  if (focus && LEGACY_TABS.includes(tab)) {
    const hit = index.find((entry) => entry.id === focus)
    if (hit && hit.params.tab !== tab) return { tab: hit.params.tab, ...(hit.params.sub ? { sub: hit.params.sub } : {}) }
  }
  const legacy = LEGACY_SUBS[`${tab}:${sub}`]
  if (legacy) return { ...legacy }
  if (tab === 'av') return { tab: 'display', sub: 'advanced' }
  if (tab === 'encoders') return { tab: 'display', sub: 'encoders' }
  if (tab === 'advanced') return { tab: 'display', sub: 'advanced' }
  // the places of 显示与视频 before the restructure: the key (below) decides where a setting went, else the renamed place
  if (tab === 'display' && sub) {
    const moved = focus && index.find((entry) => entry.id === focus)
    if (moved && moved.params.tab === 'display' && moved.params.sub) return { tab, sub: moved.params.sub }
    if (LEGACY_DISPLAY_PLACES[sub]) return { tab, sub: LEGACY_DISPLAY_PLACES[sub] }
  }
  if (PLACE_TABS[tab] && !sub) return { tab, sub: DEFAULT_PLACE[tab] }
  return { tab, ...(sub ? { sub } : {}) }
}

/** The hash that opens a place: `#tab=av&sub=display&focus=hevc_mode`. */
export function settingsHash({ tab, sub, focus } = {}) {
  const p = new URLSearchParams()
  if (tab) p.set('tab', tab)
  if (sub) p.set('sub', sub)
  if (focus) p.set('focus', focus)
  const text = p.toString()
  return text ? `#${text}` : ''
}

// The host reports its active encoder with the internal name; this table only fixes the spelling.
const ENCODER_NAMES = { nvenc: 'NVENC', amd: 'AMF', amf: 'AMF', quicksync: 'Quick Sync', qsv: 'Quick Sync', vaapi: 'VA-API', videotoolbox: 'VideoToolbox', software: 'Software', vulkan: 'Vulkan' }
export const encoderName = (value) => {
  const raw = String(value ?? '').trim()
  return raw ? (ENCODER_NAMES[raw.toLowerCase()] || raw) : ''
}
// The same for what a session and the config report: the codec as the chips spell it, the platform as its maker does.
const CODEC_NAMES = { h264: 'H.264', 'h.264': 'H.264', avc: 'H.264', hevc: 'HEVC', h265: 'HEVC', 'h.265': 'HEVC', av1: 'AV1' }
export const codecName = (value) => {
  const raw = String(value ?? '').trim()
  return raw ? (CODEC_NAMES[raw.toLowerCase()] || raw.toUpperCase()) : ''
}
const PLATFORM_NAMES = { windows: 'Windows', linux: 'Linux', macos: 'macOS', darwin: 'macOS', freebsd: 'FreeBSD' }
export const platformName = (value) => {
  const raw = String(value ?? '').trim()
  return raw ? (PLATFORM_NAMES[raw.toLowerCase()] || raw) : ''
}

/** Keys of the locale files that the model and the list pane need besides the settings' own labels. */
export const MODEL_LABEL_KEYS = Object.freeze([
  ...Object.values(SETTINGS_CATEGORIES).map((c) => c.labelKey),
  ...DISPLAY_PLACES.map((p) => p.labelKey), ...AUDIO_PLACES.map((p) => p.labelKey), ...INPUT_PLACES.map((p) => p.labelKey), 'config.input_gamepad_title', 'navbar.configuration', 'navbar.dualsense', 'shell.recent', 'shell.appearance',
])
