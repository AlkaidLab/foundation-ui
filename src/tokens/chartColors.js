// Colours of chart series: a ramp of six made from the seed with Google's HCT (the colour library of the theme). Same chroma for all, hues
// in equal steps around the seed that stay out of the reds and ambers (those two are reserved for errors, warnings and limits), tones that
// alternate between lighter and darker so neighbours differ in lightness as well as hue, which is what colour-blind viewers rely on.
// The ramp is checked against protan, deutan and tritan simulation in test/chartcolors.test.js.
import { Hct, argbFromHex, hexFromArgb } from '@material/material-color-utilities'

export const SERIES = 6
const CHROMA = 52
// hues that belong to errors (red, orange) and warnings (amber, yellow): never used for a series
const RESERVED = [[335, 50], [50, 125]] // [from, to] in degrees, wrapping for the first
const inReserved = (h) => (h >= 335 || h < 50) || (h >= 50 && h < 125)
// the order was searched over all permutations of the tone sets for the best worst-case distance under the three simulations, for seven seeds
const TONES = Object.freeze({ light: [66, 44, 54, 30, 60, 38], dark: [70, 52, 62, 76, 88, 46] })

/** Allowed hue span: from 125 to 335 degrees, 210 degrees; the series use equal steps over it, starting at the seed's place in it. */
export function seriesHues(seedHue, n = SERIES) {
  const lo = 125, hi = 335, span = hi - lo
  const start = inReserved(seedHue) ? (seedHue >= 335 || seedHue < 50 ? (Math.min(Math.abs(seedHue - 335 + (seedHue < 50 ? 360 : 0)), 999) < Math.abs(seedHue - 100 + (seedHue >= 335 ? 0 : 0)) ? hi : lo) : lo) : seedHue
  const base = Math.min(hi, Math.max(lo, start))
  return Array.from({ length: n }, (_, i) => lo + (((base - lo) + (span / n) * i) % (span + 1e-6)))
}

/** Six series colours as hex for a seed: { light: [...], dark: [...] }. */
export function chartColors(seedHex, { dark = false } = {}) {
  const hue = Hct.fromInt(argbFromHex(seedHex)).hue
  const tones = TONES[dark ? 'dark' : 'light']
  return seriesHues(hue).map((h, i) => hexFromArgb(Hct.from(h, CHROMA, tones[i]).toInt()))
}
export { RESERVED }
