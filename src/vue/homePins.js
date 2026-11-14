// The tiles of the settings the person pinned to the overview (kept in the layout, see useDashLayout `pins`): a switch tile, a selector tile, a slider tile
// that write their configuration key through the home's one saving path (the `setting` action), and a link tile for a setting of tier 3 that opens its page.
const TEXTS = {
  en: { on: 'On', off: 'Off', open: 'Open', confirmTitle: 'Change “{title}”?', confirmBody: 'This setting is risky: the change applies at once and can affect a stream that is running.', change: 'Change', cancel: 'Cancel' },
  zh: { on: '开', off: '关', open: '打开', confirmTitle: '要更改“{title}”吗？', confirmBody: '此设置有风险：更改立即生效，可能影响正在进行的串流。', change: '更改', cancel: '取消' },
}
export const pinTileTexts = (locale = 'en') => (/^zh/i.test(String(locale)) ? TEXTS.zh : TEXTS.en)

const truthy = (v) => v === true || /^(true|enabled|on|yes|1)$/i.test(String(v))
const boolDefault = (def) => def === true || truthy(def)

/** Cards of the pins: `pins` is the layout's { id: spec }, `config` the host's configuration (null while it is not read: the tiles show the default). */
export function pinCards(pins, config, locale = 'en') {
  const T = pinTileTexts(locale)
  const value = (spec) => (config && spec.key in config && config[spec.key] !== '' && config[spec.key] !== null ? config[spec.key] : undefined)
  return Object.entries(pins || {}).map(([id, spec]) => {
    const base = { id, kind: 'widget', group: 'control', span: 2, def: 'always', title: spec.title, source: '', available: true }
    if (spec.type === 'link') return { ...base, cls: 'strip', sizes: { s: [2, 1], m: [4, 1] }, size: 's', data: { type: 'action', icon: spec.icon, title: spec.title, label: T.open, act: 'pin-open', value: { key: spec.key } } }
    if (spec.control === 'switch') {
      const v = value(spec)
      const on = v === undefined ? boolDefault(spec.def) : truthy(v)
      return { ...base, cls: 'strip', sizes: { s: [2, 1], m: [4, 1], l: [4, 1] }, size: 's', data: { type: 'pin-switch', icon: spec.icon, title: spec.title, key: spec.key, on, onValue: spec.on, offValue: spec.off, onText: T.on, offText: T.off, confirm: spec.risk ? { title: T.confirmTitle.replace('{title}', spec.title), body: T.confirmBody, change: T.change, cancel: T.cancel } : null } }
    }
    if (spec.control === 'seg') {
      const v = value(spec)
      return { ...base, cls: 'tile', sizes: { m: [4, 1], l: [8, 1] }, size: 'm', data: { type: 'control', kind: 'chips', icon: spec.icon, title: spec.title, key: spec.key, value: String(v === undefined ? spec.def : v), options: spec.options } }
    }
    const raw = Number(value(spec))
    const shown = Number.isFinite(raw) ? raw / (spec.scale || 1) : spec.def / (spec.scale || 1)
    return { ...base, cls: 'tile', sizes: { m: [4, 1], l: [8, 1] }, size: 'm', data: { type: 'pin-slider', icon: spec.icon, title: spec.title, key: spec.key, value: shown, min: spec.min, max: spec.max, step: spec.step, unit: spec.unit, scale: spec.scale || 1, zeroText: spec.zeroText, confirm: spec.risk ? { title: T.confirmTitle.replace('{title}', spec.title), body: T.confirmBody, change: T.change, cancel: T.cancel } : null } }
  })
}
