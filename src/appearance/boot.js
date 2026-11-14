// The first frame of a page that cannot ask the host for the person's settings (the sign-in page: nobody is signed in yet).
// Every authenticated load of the appearance leaves a small record in localStorage: the colours that were applied (the theme CSS itself), the light or dark choice and the dark variant,
// the strength of the frost, and a tiny copy of the wallpaper (or its gradient). The sign-in page reads it synchronously before the first paint (the inline script of login.html,
// built from this record's shape) and paints the same colours and the same picture, blurred, behind its card: no plain white page, no swap from the default blue to the
// wallpaper's colour when the real appearance arrives. Without a record, the bundled default wallpaper and its seed are painted (a record made from a real default start).
// Pure parts are tested; `persistBoot` and `endBoot` touch the document.

export const BOOT_KEY = 'foundation-ui.boot'
export const BOOT_VERSION = 2 // 2: the colour styles (an old record is the library's scheme)
const MAX_CSS = 60_000
const MAX_THUMB = 40_000

const text = (v, max) => (typeof v === 'string' && v.length <= max ? v : '')
const alpha = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5 }

/** A valid record from whatever was stored (or null): the colours as CSS text, the choice, the frost and the picture ('' when the window is solid). */
export function parseBoot(raw) {
  let v = raw
  try { if (typeof raw === 'string') v = JSON.parse(raw) } catch { return null }
  if (!v || typeof v !== 'object' || v.v !== BOOT_VERSION) return null
  const css = text(v.css, MAX_CSS)
  if (!css || !/--md-sys-color-surface:/.test(css)) return null
  const thumb = /^data:image\/(jpeg|webp|png);base64,[a-z0-9+/=]+$/i.test(v.thumb || '') ? text(v.thumb, MAX_THUMB) : ''
  // a gradient is images only (linear or radial, colours as var() and color-mix()): no url(), no braces, no semicolons
  const gradient = typeof v.gradient === 'string' && v.gradient.length < 2000 && /^(?:linear|radial)-gradient\(/.test(v.gradient) && /^[a-z0-9 .,%()#*\/-]+$/i.test(v.gradient) && !/url|expression|import/i.test(v.gradient) ? v.gradient : ''
  return {
    v: BOOT_VERSION,
    mode: ['system', 'light', 'dark'].includes(v.mode) ? v.mode : 'system',
    dark: v.dark === 'black' ? 'black' : 'tinted',
    css,
    scrim: { light: alpha(v.scrim?.light), dark: alpha(v.scrim?.dark) },
    blur: Math.min(48, Math.max(0, Math.round(Number(v.blur) || 0))),
    thumb,
    gradient,
  }
}

/**
 * The theme CSS of the record made to win over the stylesheet that loads after the script (the static tokens): every selector gets `html` in front, which is more specific, so it
 * does not matter which comes first. The real theme (applyTheme) is appended later, unprefixed, when the app has started; the boot copy is removed then.
 */
export const prefixThemeCss = (css) => String(css).replace(/(^|\n)(:root|\[data-bs-theme=)/g, '$1html$2')

/**
 * The CSS of the layer behind the page while it boots: one pseudo-element of the root with the frost (the surface colour at the strength of the other pages' frost) over the
 * picture (already blurred in its copy). It is the root's ::after because the app's own stylesheet takes the root's ::before away when its wallpaper starts.
 */
export function bootLayersCss(record, dark) {
  const a = Math.round((dark ? record.scrim.dark : record.scrim.light) * 100)
  const picture = record.thumb ? `url("${record.thumb}") center / cover` : record.gradient || ''
  const top = picture ? Math.max(35, a) : 0
  // the frost of the app (appearance.css): the page tone at the strength of the scrim at the top, paler towards the bottom (the fade tone, at 94 % at the least)
  const frost = `linear-gradient(to bottom, color-mix(in srgb, var(--m-page-solid) ${top}%, transparent), color-mix(in srgb, var(--m-fade-tone) max(${top}%, 94%), transparent))`
  return [
    'html.m-boot { background: var(--md-sys-color-surface); }',
    `html.m-boot::after { content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none; background: ${picture ? `${frost}, ${picture}` : frost}; }`,
    'html.m-boot body, html.m-boot .m-app, html.m-boot .m-login { background: transparent !important; }',
    'html.m-boot-out::after { opacity: 0; transition: opacity 450ms ease; }',
  ].join('\n')
}

const thumbOf = (img, focus) => {
  const W = 192, H = 120
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')
  // the blur is in the copy itself (a canvas filter, over a margin so the edges stay full): the page needs no CSS filter, which has to be rasterised again when the app mounts
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.12
  const w = img.naturalWidth * s, h = img.naturalHeight * s
  const fx = focus?.x ?? 0.5, fy = focus?.y ?? 0.5
  if ('filter' in x) x.filter = 'blur(3px)'
  x.drawImage(img, -(w - W) * fx, -(h - H) * fy, w, h)
  return c.toDataURL('image/jpeg', 0.6)
}

/**
 * Keeps the record of the applied appearance. `state` is the appearance (mode, dark, background), `wallpaper` the shown picture when there is one:
 * { img (a decoded image the canvas may read, or null), picture ({ focus }), gradient (the gradient CSS or '') }. Never throws.
 */
export function persistBoot(root, state, wallpaper = null, storage = globalThis.localStorage) {
  try {
    const css = document.getElementById('foundation-ui-theme')?.textContent || ''
    const style = root.style
    const other = { blur: Number(state.other?.blur ?? 32), dim: Number(state.other?.dim ?? 0.5) }
    let thumb = ''
    if (wallpaper?.img) { try { thumb = thumbOf(wallpaper.img, wallpaper.picture?.focus) } catch { thumb = '' } }
    const record = parseBoot({
      v: BOOT_VERSION, mode: state.mode, dark: state.dark, css,
      // the sign-in page is a page like the settings pages, not the overview: the frost of the other pages (the person's own strength) is what it shows, whichever page saved the record
      scrim: { light: Math.max(Number(style.getPropertyValue('--m-scrim-light')) || 0, other.dim), dark: Math.max(Number(style.getPropertyValue('--m-scrim-dark')) || 0, other.dim) },
      blur: other.blur,
      thumb, gradient: wallpaper?.gradient || '',
    })
    if (record) storage?.setItem(BOOT_KEY, JSON.stringify(record))
    return record
  } catch { return null }
}

/** The app has its own appearance now: the boot layers fade out, the boot copy of the colours goes. */
export function endBoot(doc = document) {
  const el = doc.documentElement
  if (!el.classList.contains('m-boot')) return
  el.classList.add('m-boot-out')
  setTimeout(() => { el.classList.remove('m-boot', 'm-boot-out'); doc.getElementById('foundation-ui-boot-theme')?.remove(); doc.getElementById('foundation-ui-boot-layers')?.remove() }, 500)
}
