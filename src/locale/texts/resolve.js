// Per-key text fallback. A missing or empty translation never replaces a real string:
// zh_TW uses zh_TW, then zh, then en; zh uses zh, then en; every other language uses itself, then en.
// The English or Chinese table is returned by reference when it already covers the requested language.

export const LOCALE_CODES = ['en', 'zh', 'zh_TW', 'en_GB', 'en_US', 'de', 'fr', 'es', 'it', 'ja', 'ko', 'ru', 'pt_BR', 'pt', 'bg', 'cs', 'pl', 'sv', 'tr', 'uk']

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

/** A system or stored tag (zh-CN, zh-Hant-TW, en-GB, pt-BR) as one of the 20 codes. Unknown tags become en. zh_TW stays zh_TW. */
export function canonicalLocale(raw) {
  const tag = String(raw ?? '').trim().replace(/-/g, '_')
  if (!tag) return 'en'
  if (LOCALE_CODES.includes(tag)) return tag
  const lower = tag.toLowerCase()
  if (lower.startsWith('zh') && /(_tw|_hk|_mo|hant)/.test(lower)) return 'zh_TW'
  if (lower.startsWith('zh')) return 'zh'
  const exact = LOCALE_CODES.find((code) => code.toLowerCase() === lower)
  if (exact) return exact
  const [lang, region] = tag.split('_')
  if (region && region.length === 2) {
    const withRegion = lang.toLowerCase() + '_' + region.toUpperCase()
    if (LOCALE_CODES.includes(withRegion)) return withRegion
  }
  const primary = (lang || '').toLowerCase()
  return LOCALE_CODES.includes(primary) ? primary : 'en'
}

const present = (v) => v !== undefined && v !== null && v !== ''

/** True when every non-empty leaf of full is already a non-empty leaf of node. */
export function coversTexts(full, node) {
  if (Array.isArray(full)) {
    if (!Array.isArray(node) || node.length < full.length) return false
    return full.every((item, i) => coversTexts(item, node[i]))
  }
  if (isObject(full)) {
    if (!isObject(node)) return false
    return Object.keys(full).every((key) => coversTexts(full[key], node[key]))
  }
  if (!present(full)) return true
  return present(node)
}

/**
 * Deep merge. An empty string, null or undefined does not replace a value.
 * Arrays merge by index; a shorter overlay keeps the rest of the base.
 * Returns base itself when the overlay changes nothing.
 */
export function mergeTexts(base, overlay) {
  if (Array.isArray(base) && Array.isArray(overlay)) {
    if (overlay.length === 0) return base
    let changed = false
    const out = base.map((item, i) => {
      if (i >= overlay.length) return item
      const next = mergeTexts(item, overlay[i])
      if (next !== item) changed = true
      return next
    })
    if (overlay.length > base.length) {
      for (let i = base.length; i < overlay.length; i++) {
        if (present(overlay[i]) || isObject(overlay[i]) || Array.isArray(overlay[i])) {
          out.push(overlay[i])
          changed = true
        }
      }
    }
    return changed ? out : base
  }
  if (isObject(base) && isObject(overlay)) {
    let changed = false
    const out = { ...base }
    for (const key of Object.keys(overlay)) {
      const value = overlay[key]
      if (!present(value) && !isObject(value) && !Array.isArray(value)) continue
      if (!(key in base)) {
        out[key] = value
        changed = true
        continue
      }
      const next = mergeTexts(base[key], value)
      if (next !== base[key]) {
        out[key] = next
        changed = true
      }
    }
    return changed ? out : base
  }
  if (!present(overlay)) return base
  return overlay === base ? base : overlay
}

/** The table for locale: Chinese and Traditional Chinese keep the Chinese table when it already covers English. */
export function resolveTexts(en, zh, locale, partial) {
  const code = canonicalLocale(locale)
  const chinese = coversTexts(en, zh) ? zh : mergeTexts(en, zh)
  if (code === 'zh') return chinese
  if (code === 'zh_TW') return mergeTexts(chinese, partial)
  if (code === 'en') return en
  return mergeTexts(en, partial)
}
