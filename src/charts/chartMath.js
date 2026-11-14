// Geometry of the chart set: smooth monotone curves (no overshoot between samples), scales, stacking, histogram bins, nice ticks.

/** Smallest 1, 2, 2.5, 5 or 10 times a power of ten at least `v`. */
export function niceMax(v) {
  if (!(v > 0) || !Number.isFinite(v)) return 1
  const exp = Math.floor(Math.log10(v)); const base = v / 10 ** exp
  return (base <= 1 ? 1 : base <= 2 ? 2 : base <= 2.5 ? 2.5 : base <= 5 ? 5 : 10) * 10 ** exp
}
export const niceTicks = (max, count = 3) => Array.from({ length: count + 1 }, (_, i) => (max * i) / count)

/** Domain of a set of series: from zero (bars, areas) or fitted (lines), with headroom, and a floor so a quiet series is not stretched to a flat line. */
export function domainOf(seriesValues, { zero = true, floor = 0, headroom = 0.18 } = {}) {
  const all = seriesValues.flat().filter((v) => Number.isFinite(v))
  if (!all.length) return { lo: 0, hi: Math.max(floor, 1) }
  const mx = Math.max(...all), mn = Math.min(...all)
  const hi = niceMax(Math.max(mx * (1 + headroom), floor || 0, 1e-9))
  return { lo: zero ? Math.min(0, mn) : Math.max(0, mn - (mx - mn) * 0.2), hi }
}

/** Smallest step of the form 1, 2, 2.5, 5 times a power of ten that is at least `v`. */
export const niceStep = (v) => niceMax(v)

/**
 * Domain fitted to the data, for a line that does not start at zero (frame rate, temperature, latency): the data range with `pad` of its height
 * free on both sides, rounded out to a nice step. Never below zero when the data is not. Returns { lo, hi, step } (a flat series gets a small range).
 */
export function fitDomain(seriesValues, { pad = 0.22 } = {}) {
  const all = seriesValues.flat().filter((v) => Number.isFinite(v))
  if (!all.length) return { lo: 0, hi: 1, step: 0.5 }
  let mn = Math.min(...all), mx = Math.max(...all)
  if (mx - mn < 1e-9) { const d = Math.max(Math.abs(mx) * 0.1, 1); mn -= d; mx += d }
  const range = mx - mn
  const step = niceStep(range / 3)
  let lo = Math.floor((mn - range * pad) / step) * step
  const hi = Math.ceil((mx + range * pad) / step) * step
  if (all.every((v) => v >= 0)) lo = Math.max(0, lo)
  return { lo, hi, step }
}

/** Tick values from lo to hi, at most `max` of them (every n-th step when the steps are many). */
export function rangeTicks(lo, hi, step, max = 5) {
  const out = []
  for (let v = lo; v <= hi + step * 1e-6; v += step) out.push(Math.round(v / step) * step)
  const every = Math.ceil(out.length / max)
  return out.filter((_, i) => i % every === 0)
}

/** Decimals a tick label needs for a step: none for whole steps, one for tenths, else two. */
export const tickDecimals = (step) => (Math.abs(step - Math.round(step)) < 1e-9 ? 0 : Math.abs(step * 10 - Math.round(step * 10)) < 1e-9 ? 1 : 2)

/** Monotone cubic (Fritsch-Carlson) tangents for points {x,y}: the curve never overshoots a sample. */
export function monotonePath(pts) {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  const dx = [], dy = [], m = []
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1].x - pts[i].x); dy.push(pts[i + 1].y - pts[i].y); m.push(dy[i] / (dx[i] || 1)) }
  const t = [m[0]]
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2)
  t.push(m[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i] }
  }
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${(pts[i].x + h).toFixed(1)} ${(pts[i].y + t[i] * h).toFixed(1)} ${(pts[i + 1].x - h).toFixed(1)} ${(pts[i + 1].y - t[i + 1] * h).toFixed(1)} ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`
  }
  return d
}

/** Points of a series for a plot of `w` x `h`; `n` samples share one x axis (index i -> x), so every series of a chart lines up. */
export function seriesPoints(values, { w, h, lo, hi, n = values.length }) {
  const span = hi - lo || 1
  return values.map((v, i) => (Number.isFinite(v) ? { x: n > 1 ? (i / (n - 1)) * w : w / 2, y: h - ((Math.min(Math.max(v, lo), hi) - lo) / span) * h, v, i } : null)).filter(Boolean)
}

/** Stack series bottom to top: returns [{ base[], top[] }] with the same length as the longest series. */
export function stack(seriesValues) {
  const n = Math.max(0, ...seriesValues.map((s) => s.length))
  const acc = new Array(n).fill(0)
  return seriesValues.map((s) => { const base = [...acc]; const top = acc.map((a, i) => { const v = Number.isFinite(s[i]) ? Math.max(0, s[i]) : 0; acc[i] = a + v; return acc[i] }); return { base, top } })
}

export function areaBetween(topPts, basePts) {
  if (!topPts.length) return ''
  const top = monotonePath(topPts)
  const back = [...basePts].reverse().map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return `${top} ${back} Z`
}

/** Histogram: `bins` equal-width bins over [lo, hi] of the finite values; returns counts and edges. */
export function histogram(values, bins = 12, lo = null, hi = null) {
  const v = values.filter((x) => Number.isFinite(x))
  if (!v.length) return { counts: new Array(bins).fill(0), edges: [], lo: 0, hi: 0 }
  const a = lo ?? Math.min(...v), b = hi ?? Math.max(...v)
  const w = (b - a) / bins || 1
  const counts = new Array(bins).fill(0)
  for (const x of v) counts[Math.min(bins - 1, Math.max(0, Math.floor((x - a) / w)))] += 1
  return { counts, edges: Array.from({ length: bins + 1 }, (_, i) => a + i * w), lo: a, hi: b }
}

/** Index of the sample nearest to an x position (pointer) in a plot of width `w` with `n` samples. */
export const nearestIndex = (x, w, n) => (n <= 1 ? 0 : Math.min(n - 1, Math.max(0, Math.round((x / w) * (n - 1)))))

/** Heat strip levels 0..4 from daily values (0 = none). */
export function heatLevels(values) {
  const mx = Math.max(0, ...values.filter(Number.isFinite))
  return values.map((v) => (!Number.isFinite(v) || v <= 0 || mx <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((v / mx) * 4)))))
}
