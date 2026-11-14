// The hero's colours from the current game's cover (yes, as a toggle, default on). Material dynamic colour from the art, kept clean:
// the cover's source colour (seedFromImage) gives the hue and a chroma; the four roles are taken from that hue at fixed tones, the chroma clamped, so that
//   - a near-grey cover (chroma under 10) gives nothing: the theme's colours stay;
//   - yellow and olive hues (60°-115°), which turn muddy as dark containers, get a low-chroma dark container and a light button in their own hue;
//   - every pair passes WCAG: the text on the card 4.5:1, the glyph on the button 3:1 (checked, else nothing: the theme's colours);
//   - the status pill is the card's text at PILL over the card; its state dot is the success hue at the first tone, away from the pill, that reads 3.3:1 on it (3:1 on pixels).
// Returns { bg, fg, btn, glyph, dot } (hex) or null.
import { Hct, argbFromHex, hexFromArgb } from '@material/material-color-utilities'

const tone = (hue, chroma, t) => hexFromArgb(Hct.from(hue, chroma, t).toInt())
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255) }
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const MUDDY = [60, 115]
export const PILL = 0.12
const SUCCESS_HUE = Hct.fromInt(argbFromHex('#2e9e6b')).hue
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
/** color-mix(in srgb, a t, b) over an opaque b, as the pill is drawn */
export const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(v * t + rgb(b)[i] * (1 - t)).toString(16).padStart(2, '0')).join('')
/** the state dot for a pill of this colour: the success hue, the first tone from 50 away from the pill that reaches 3.3:1 (3:1 with a margin: the rendered pill rounds) */
export function dotOn(pill) {
  const light = Hct.fromInt(argbFromHex(pill)).tone >= 50
  for (let t = light ? 45 : 55; light ? t >= 5 : t <= 98; t += light ? -1 : 1) { const c = tone(SUCCESS_HUE, 40, t); if (contrast(c, pill) >= 3.3) return c }
  return null
}

export function heroTint(seedHex, dark = false, solid = false) {
  if (!/^#[0-9a-f]{6}$/i.test(String(seedHex || ''))) return null
  const h = Hct.fromInt(argbFromHex(seedHex))
  if (h.chroma < 10) return null
  const hue = h.hue, muddy = hue >= MUDDY[0] && hue <= MUDDY[1]
  // solid (实色) in light: the card in the hue itself, white text, a near-white shape (a gold card with dark text for the yellow hues); in dark solid reads as soft
  const roles = dark
    ? { bg: tone(hue, muddy ? 8 : clamp(h.chroma, 12, 24), 22), fg: tone(hue, 10, 92), btn: tone(hue, clamp(h.chroma, 36, 60), muddy ? 84 : 80), glyph: tone(hue, 24, 16) }
    : solid ? (muddy ? { bg: tone(hue, clamp(h.chroma, 36, 56), 74), fg: tone(hue, 16, 10), btn: tone(hue, 12, 97), glyph: tone(hue, 40, 30) } : { bg: tone(hue, clamp(h.chroma, 36, 56), 40), fg: tone(hue, 0, 100), btn: tone(hue, 8, 97), glyph: tone(hue, 50, 38) })
    : { bg: tone(hue, clamp(h.chroma, 16, 36), 92), fg: tone(hue, 16, 12), btn: tone(hue, clamp(h.chroma, 36, 60), muddy ? 72 : 42), glyph: muddy ? tone(hue, 24, 12) : tone(hue, 0, 100) }
  if (!(contrast(roles.fg, roles.bg) >= 4.5 && contrast(roles.glyph, roles.btn) >= 3)) return null
  roles.dot = dotOn(mix(roles.fg, roles.bg, PILL))
  return roles.dot ? roles : null
}
