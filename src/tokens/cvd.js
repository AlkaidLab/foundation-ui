// Colour-blind simulation (Machado, Oliveira and Fernandes 2009, severity 1) and colour distance, for checking palettes.
const M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
export const CVD_KINDS = Object.freeze(['normal', 'protan', 'deutan', 'tritan'])
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const fromLin = (v) => { v = Math.min(1, Math.max(0, v)); return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) }
export const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
export function simulate(rgb, kind) {
  if (kind === 'normal') return rgb
  const lin = rgb.map(toLin)
  return M[kind].map((row) => fromLin(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]))
}
/** CIE L*a*b* (D65) of an sRGB triple. */
export function lab(rgb) {
  const [r, g, b] = rgb.map(toLin)
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
export const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
/** Smallest distance between any two colours of a ramp as a person with the given vision would see them. */
export function minDistance(hexes, kind = 'normal') {
  const labs = hexes.map((h) => lab(simulate(rgbOf(h), kind)))
  let min = Infinity
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) min = Math.min(min, deltaE(labs[i], labs[j]))
  return min
}
