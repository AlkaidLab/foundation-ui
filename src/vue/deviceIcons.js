// The device a paired client is and its icon: ONE copy for the control panel and the Web UI (the Web UI had it alone, so the panel drew the neutral icon for every client).
// The kind of a paired client and its icon. The host reports the system a client runs on (`os`: android, ios, tvos, macos, windows, linux, from the client's user agent);
// it does not report a device type. The system decides what the device can be, the name the person gave refines the shape within it: an Android device is a phone unless its name says
// tablet, TV or handheld; an iOS device a phone unless it says iPad; a Mac is a Mac; Windows and Linux are PCs unless the name says handheld. Without a reported system the name alone decides
// (a keyword table, checked in this order: a TV box named "Android TV" must not become a phone); no match gives the neutral device icon.
export const DEVICE_KINDS = { tv: 'tv', handheld: 'sports_esports', vr: 'view_in_ar', tablet: 'tablet', phone: 'mobile', mac: 'laptop_mac', computer: 'desktop_windows' }
export const DEVICE_RULES = [
  { kind: 'tv', pattern: /\b(tv|apple ?tv|android ?tv|fire ?tv|chromecast|shield)\b|电视|客厅/i },
  { kind: 'handheld', pattern: /steam ?deck|rog ?ally|legion ?go|switch|handheld|掌机/i },
  { kind: 'vr', pattern: /quest|vision ?pro|\bvr\b|headset|pico/i },
  { kind: 'tablet', pattern: /ipad|tablet|\btab\b|\btab ?[a-z]?\d|matepad|mi ?pad|\bpad\b|\bpad ?\d|平板/i },
  { kind: 'phone', pattern: /iphone|pixel|galaxy ?[sazmf]|android|phone|redmi|xiaomi|oneplus|huawei|honor|vivo|oppo|iqoo|realme|meizu|nubia|motorola|手机/i },
  { kind: 'mac', pattern: /macbook|imac|mac ?mini|mac ?studio|\bmac\b|macos/i },
  { kind: 'computer', pattern: /laptop|notebook|thinkpad|surface|zenbook|desktop|\bpc\b|windows|linux|ubuntu|workstation|台式|电脑|笔记本/i },
]
const OS_KINDS = { android: ['phone', 'tablet', 'tv', 'handheld', 'vr'], ios: ['phone', 'tablet'], tvos: ['tv'], harmony: ['phone', 'tablet', 'tv'], macos: ['mac'], windows: ['computer', 'handheld', 'tablet'], linux: ['computer', 'handheld'] }
const OS_DEFAULT = { android: 'phone', ios: 'phone', tvos: 'tv', harmony: 'phone', macos: 'mac', windows: 'computer', linux: 'computer' }
export const NEUTRAL_DEVICE_ICON = 'devices'

/** The kind of a device ('phone' | 'tablet' | 'computer' | 'mac' | 'handheld' | 'tv' | 'vr') from its reported system and its name; '' when neither says. */
export function deviceKindFor(name, os = '') {
  const text = String(name ?? '')
  const byName = DEVICE_RULES.find((rule) => rule.pattern.test(text))?.kind || ''
  const system = String(os ?? '').toLowerCase()
  if (!OS_DEFAULT[system]) return byName
  return OS_KINDS[system].includes(byName) ? byName : OS_DEFAULT[system]
}

export function deviceIconFor(name, os = '') {
  const kind = deviceKindFor(name, os)
  if (kind === 'mac' && /imac|mac ?mini|mac ?studio/i.test(String(name ?? ''))) return 'desktop_mac'
  return DEVICE_KINDS[kind] || NEUTRAL_DEVICE_ICON
}
