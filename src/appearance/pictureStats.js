// The numbers of a picture that decide the scrim: pure functions of downsampled RGBA pixels, shared by the page and the worker that reads pictures.

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
export const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

/** Statistics of a picture from downsampled RGBA pixels: robust darkest and brightest greys, mean luminance and how busy it is. */
export function imageStats(rgba, width, height) {
  const n = width * height
  const lum = new Float32Array(n)
  for (let i = 0; i < n; i++) lum[i] = luminance({ r: rgba[i * 4], g: rgba[i * 4 + 1], b: rgba[i * 4 + 2] })
  const sorted = [...lum].sort((a, b) => a - b)
  const at = (q) => sorted[Math.min(n - 1, Math.floor(q * n))]
  let grad = 0, cnt = 0
  for (let y = 0; y < height; y++) for (let x = 1; x < width; x++) { grad += Math.abs(lum[y * width + x] - lum[y * width + x - 1]); cnt++ }
  return { mean: lum.reduce((a, b) => a + b, 0) / n, lo: at(0.02), hi: at(0.98), busy: cnt ? grad / cnt : 0 }
}
