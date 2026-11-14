// The language choice of the person, one rule for the control panel and the Web UI: a language code, or `system` (跟随系统, the default). `system` is what is stored, never the code it resolves to,
// so the interface follows the language of the operating system live (the `languagechange` event) until the person picks a language of their own.
// Pure here (tested): the product passes its list of supported codes, the system's list of languages and the storage.

export const LOCALE_SYSTEM = 'system'
export const LOCALE_KEY = 'foundation-ui.locale'
const CODE = /^[a-z]{2,3}(?:_[A-Za-z0-9]{2,4})?$/

/** A language tag of the system or the browser (zh-CN, zh-Hant-TW, en-GB, pt-BR, de) as the code of the products: zh, zh_TW, en_GB, pt_BR, de. */
export function normalizeTag(raw) {
  const tag = String(raw || '').trim().replace(/-/g, '_')
  if (!tag) return ''
  const lower = tag.toLowerCase()
  if (lower.startsWith('zh')) return /(_tw|_hk|_mo|hant)/.test(lower) ? 'zh_TW' : 'zh'
  const [lang, region] = tag.split('_')
  return region && region.length === 2 ? `${lang.toLowerCase()}_${region.toUpperCase()}` : lang.toLowerCase()
}

/** The code the system's languages (the first one the product has wins) resolve to; English when none matches. */
export function resolveSystemLocale(languages, supported) {
  const list = Array.isArray(supported) && supported.length ? supported : ['en']
  for (const tag of languages || []) {
    const code = normalizeTag(tag)
    if (!code) continue
    if (list.includes(code)) return code
    const primary = code.split('_')[0]
    if (list.includes(primary)) return primary
  }
  return list.includes('en') ? 'en' : list[0]
}

/** What the person chose: `system`, or a code. null when nothing was stored (an install from before the choice existed: the product's own stored language stands). */
export function readLocalePref(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(LOCALE_KEY)
    return value === LOCALE_SYSTEM || (value && CODE.test(value)) ? value : null
  } catch { return null }
}

export function writeLocalePref(value, storage = globalThis.localStorage) {
  try { storage?.setItem(LOCALE_KEY, value === LOCALE_SYSTEM || CODE.test(String(value)) ? value : LOCALE_SYSTEM); return true } catch { return false }
}

/** The code to show for a choice (`system`, a code, or null for none stored: then `fallback`, the product's own stored language, else the system's). */
export function resolveLocale(choice, { languages = globalThis.navigator?.languages || [globalThis.navigator?.language], supported, fallback = '' } = {}) {
  if (choice && choice !== LOCALE_SYSTEM) return supported?.includes(choice) ? choice : resolveSystemLocale(languages, supported)
  if (!choice && fallback && supported?.includes(fallback)) return fallback
  return resolveSystemLocale(languages, supported)
}

/**
 * The choice a picker shows as selected: the stored one; else the language the product had stored before the choice existed, when it is not just the language of the system (then following the system is
 * what the person has, and the default); else `system`.
 */
export const choiceOf = (stored, legacy = '', system = '') => stored || (legacy && legacy !== system ? legacy : LOCALE_SYSTEM)

/** Calls `onChange` when the language of the system changes; returns the function that stops it. */
export function watchSystemLanguage(onChange, win = globalThis.window) {
  if (!win?.addEventListener) return () => {}
  win.addEventListener('languagechange', onChange)
  return () => win.removeEventListener('languagechange', onChange)
}
