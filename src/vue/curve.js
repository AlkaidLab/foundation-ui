/** Geometry of the dashboard curves: scaling, smoothing (Catmull-Rom as cubic Bezier) and a "nice" axis maximum. */

/** Smallest 1, 2, 2.5, 5 or 10 times a power of ten that is at least `v` (for scale labels). */
export function niceMax(v) {
  if (!(v > 0) || !Number.isFinite(v)) return 1
  const exp = Math.floor(Math.log10(v))
  const base = v / 10 ** exp
  const step = base <= 1 ? 1 : base <= 2 ? 2 : base <= 2.5 ? 2.5 : base <= 5 ? 5 : 10
  return step * 10 ** exp
}

/** Points {x, y} for values 0..max spread over `w` x `h` (y grows downwards, `pad` of the height is kept free on top). */
export function scalePoints(values, { w, h, max = null, min = 0, pad = 0.12 }) {
  const list = (values || []).filter((v) => Number.isFinite(v))
  if (list.length < 2) return []
  const top = max ?? Math.max(...list, min + 1e-9)
  const span = Math.max(top - min, 1e-9)
  const usable = h * (1 - pad)
  return list.map((v, i) => ({ x: (i / (list.length - 1)) * w, y: h - ((Math.min(Math.max(v, min), top) - min) / span) * usable }))
}

/** SVG path of a smooth line through the points. */
export function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/** SVG path of a smooth line through the points that never overshoots (monotone cubic, Fritsch-Carlson): between two samples the curve stays between their two values, a flat run stays flat. x must grow. */
export function monotonePath(pts) {
  const n = pts.length
  if (n < 2) return ''
  const dx = [], m = []
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1].x - pts[i].x || 1e-9); m.push((pts[i + 1].y - pts[i].y) / dx[i]) }
  const t = new Array(n)
  t[0] = m[0]; t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i])
  // the end slopes and the slopes next to a flat run are limited so no segment overshoots
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i] }
  }
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) d += ` C${(pts[i].x + dx[i] / 3).toFixed(1)} ${(pts[i].y + (t[i] * dx[i]) / 3).toFixed(1)} ${(pts[i + 1].x - dx[i] / 3).toFixed(1)} ${(pts[i + 1].y - (t[i + 1] * dx[i]) / 3).toFixed(1)} ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`
  return d
}

/** Line and filled area (closed along the bottom edge) for a series. */
// A series that does not change (a capped bitrate, a locked frame rate, all zeros) is a flat line: without a fixed maximum it is drawn at the middle of the
// height, and never with an area under it (a flat area is a solid slab that reads as a block, not as data). All zeros: the line lies on the baseline.
export function curvePaths(values, opts) {
  const list = (values || []).filter((v) => Number.isFinite(v))
  const hi = list.length ? Math.max(...list) : 0, lo = list.length ? Math.min(...list) : 0
  // flat: the series moves by less than two pixels on its scale (a bitrate that wobbles by 0.1 Mbps around 48 is a flat line, not a curve over a block)
  const top = opts.max ?? hi
  const flat = list.length > 1 && ((hi - lo) / Math.max(top - (opts.min ?? 0), 1e-9)) * opts.h * (1 - (opts.pad ?? 0.12)) < 2
  const pts = scalePoints(values, flat && opts.max == null ? { ...opts, max: hi > 0 ? hi * 2 : 1 } : opts)
  if (!pts.length) return { line: '', area: '', last: null, flat: false }
  const line = smoothPath(pts)
  const last = pts[pts.length - 1]
  return { line, area: flat ? '' : `${line} L${last.x.toFixed(1)} ${opts.h} L0 ${opts.h} Z`, last, flat }
}
