// The 35 shapes of the Material 3 Expressive shape library, as outlines in the unit square.
// Ported from androidx Compose Material3 `MaterialShapes.kt` (androidx-main, compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt)
// and the corner rounding of androidx graphics-shapes `RoundedPolygon` / `RoundedCorner` / `Cubic.circularArc` (graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes).
// Every vertex, rounding (radius, smoothing), repetition, mirroring and transform below is the one of MaterialShapes.kt; only the output differs:
// an outline sampled into points instead of cubics, and normalized to its exact bounds (graphics-shapes `normalized()` uses the control-point bounds), so a shape touches its box.

const TAU = Math.PI * 2
const EPS = 1e-4

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y })
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
const mul = (a, k) => ({ x: a.x * k, y: a.y * k })
const dot = (a, b) => a.x * b.x + a.y * b.y
const len = (a) => Math.hypot(a.x, a.y)
const dir = (a) => { const l = len(a); return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 } }
const rot90 = (a) => ({ x: -a.y, y: a.x })
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

// CornerRounding(radius, smoothing)
const R = (radius = 0, smoothing = 0) => ({ radius, smoothing })
const UNROUNDED = R()
const round15 = R(0.15), round20 = R(0.2), round30 = R(0.3), round50 = R(0.5), round100 = R(1)

function lineIntersection(p0, d0, p1, d1) {
  const rotated = rot90(d1)
  const den = dot(d0, rotated)
  if (Math.abs(den) < EPS) return null
  const num = dot(sub(p1, p0), rotated)
  if (Math.abs(den) < EPS * Math.abs(num)) return null
  return add(p0, mul(d0, num / den))
}

// graphics-shapes RoundedCorner
function corner(p0, p1, p2, rounding = UNROUNDED) {
  const d1 = dir(sub(p0, p1)), d2 = dir(sub(p2, p1))
  const r = rounding.radius, s = rounding.smoothing
  const cos = dot(d1, d2), sin = Math.sqrt(Math.max(0, 1 - cos * cos))
  const expectedRoundCut = sin > 1e-3 ? (r * (cos + 1)) / sin : 0
  const expectedCut = (1 + s) * expectedRoundCut
  const smooth = (allowed) => (allowed > expectedCut ? s : allowed > expectedRoundCut ? (s * (allowed - expectedRoundCut)) / (expectedCut - expectedRoundCut) : 0)
  function flank(roundCut, sm, sideStart, inter, otherInter, center, actualR) {
    const sideDir = dir(sub(sideStart, p1))
    const curveStart = add(p1, mul(sideDir, roundCut * (1 + sm)))
    const p = lerp(inter, mul(add(inter, otherInter), 0.5), sm)
    const curveEnd = add(center, mul(dir(sub(p, center)), actualR))
    const tangent = rot90(sub(curveEnd, center))
    const anchorEnd = lineIntersection(sideStart, sideDir, curveEnd, tangent) || inter
    const anchorStart = mul(add(curveStart, mul(anchorEnd, 2)), 1 / 3)
    return [curveStart, anchorStart, anchorEnd, curveEnd]
  }
  return {
    p1, expectedRoundCut, expectedCut,
    sharp: r < 0.02, // a vertex the sampler must hit exactly (unrounded, or Burst's and Boom's 0.006/0.007 tips)
    // the outline of the corner: [{ kind: 'cubic', pts }, { kind: 'arc', center, r, a0, a1 }, ...]
    pieces(cut0, cut1) {
      const cut = Math.min(cut0, cut1)
      if (expectedRoundCut < EPS || cut < EPS || r < EPS) return [{ kind: 'point', p: p1 }]
      const roundCut = Math.min(cut, expectedRoundCut)
      const s0 = smooth(cut0), s1 = smooth(cut1)
      const actualR = (r * roundCut) / expectedRoundCut
      const centerDistance = Math.hypot(actualR, roundCut)
      const center = add(p1, mul(dir(mul(add(d1, d2), 0.5)), centerDistance))
      const i0 = add(p1, mul(d1, roundCut)), i2 = add(p1, mul(d2, roundCut))
      const f0 = flank(roundCut, s0, p0, i0, i2, center, actualR)
      const f2 = flank(roundCut, s1, p2, i2, i0, center, actualR).reverse()
      return [{ kind: 'cubic', pts: f0 }, { kind: 'arc', center, r: actualR, from: f0[3], to: f2[0] }, { kind: 'cubic', pts: f2 }]
    },
  }
}

// graphics-shapes RoundedPolygon(vertices, perVertexRounding): the cut each side allows is split between its two corners, rounding first, then smoothing
function roundedPolygon(vertices, roundings) {
  const n = vertices.length
  const corners = vertices.map((p, i) => corner(vertices[(i + n - 1) % n], p, vertices[(i + 1) % n], roundings[i]))
  const adjust = vertices.map((p, i) => {
    const a = corners[i], b = corners[(i + 1) % n]
    const roundCut = a.expectedRoundCut + b.expectedRoundCut, cut = a.expectedCut + b.expectedCut
    const side = len(sub(vertices[(i + 1) % n], p))
    if (roundCut > side) return [side / roundCut, 0]
    if (cut > side) return [1, (side - roundCut) / (cut - roundCut)]
    return [1, 1]
  })
  const out = []
  for (let i = 0; i < n; i++) {
    const c = corners[i]
    const cuts = [0, 1].map((delta) => { const [rr, cr] = adjust[(i + n - 1 + delta) % n]; return c.expectedRoundCut * rr + (c.expectedCut - c.expectedRoundCut) * cr })
    out.push({ sharp: c.sharp || c.pieces(cuts[0], cuts[1])[0].kind === 'point', p: c.p1, pieces: c.pieces(cuts[0], cuts[1]) })
  }
  return out
}

// Densely sampled outline: [{ x, y, sharp }] (a closed loop; consecutive corners are joined by straight sides)
function outline(corners, steps = 64) {
  const pts = []
  const cubic = ([a, b, c, d], t) => { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y } }
  for (const c of corners) {
    for (const piece of c.pieces) {
      if (piece.kind === 'point') { pts.push({ ...piece.p, sharp: true }); continue }
      if (piece.kind === 'cubic') { for (let k = 0; k <= steps; k++) pts.push(cubic(piece.pts, k / steps)); continue }
      // Cubic.circularArc: the short arc from `from` to `to` about `center`
      const a0 = Math.atan2(piece.from.y - piece.center.y, piece.from.x - piece.center.x)
      let da = Math.atan2(piece.to.y - piece.center.y, piece.to.x - piece.center.x) - a0
      while (da > Math.PI) da -= TAU
      while (da < -Math.PI) da += TAU
      const k1 = Math.max(2, Math.ceil((Math.abs(da) / TAU) * steps * 8))
      for (let k = 0; k <= k1; k++) { const a = a0 + (da * k) / k1; pts.push({ x: piece.center.x + piece.r * Math.cos(a), y: piece.center.y + piece.r * Math.sin(a) }) }
    }
    if (c.sharp && c.pieces[0].kind !== 'point') pts.push({ ...c.p, sharp: true, ghost: true }) // a tiny rounding: keep the tip as the sampler's target, not as a point of the outline
  }
  return pts
}

const rotate = (deg) => (p) => { const a = (deg * Math.PI) / 180; return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) } }
const scale = (sx, sy) => (p) => ({ x: p.x * sx, y: p.y * sy })
const P = (x, y, r = UNROUNDED) => ({ o: { x, y }, r })

// RoundedPolygon(numVertices, radius, center, rounding | perVertexRounding)
function regular(n, { radius = 1, rounding = UNROUNDED, perVertex = null } = {}) {
  const v = Array.from({ length: n }, (_, i) => ({ x: radius * Math.cos((TAU * i) / n), y: radius * Math.sin((TAU * i) / n) }))
  return { v, r: perVertex || v.map(() => rounding) }
}
// RoundedPolygon.circle(numVertices = 8): a polygon of radius 1 / cos(pi / n) rounded with radius 1
const circle = (n = 8) => regular(n, { radius: 1 / Math.cos(Math.PI / n), rounding: R(1) })
// RoundedPolygon.rectangle(width, height, rounding | perVertexRounding), centred on 0: right-bottom, left-bottom, left-top, right-top
function rectangle(w, h, { rounding = UNROUNDED, perVertex = null } = {}) {
  const v = [{ x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }, { x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }]
  return { v, r: perVertex || v.map(() => rounding) }
}
// RoundedPolygon.star(numVerticesPerRadius, radius = 1, innerRadius, rounding): outer and inner vertices alternate, the inner one shares the rounding
function star(n, inner, rounding) {
  const v = [], r = []
  for (let i = 0; i < n; i++) {
    v.push({ x: Math.cos((Math.PI / n) * 2 * i), y: Math.sin((Math.PI / n) * 2 * i) }); r.push(rounding)
    v.push({ x: inner * Math.cos((Math.PI / n) * (2 * i + 1)), y: inner * Math.sin((Math.PI / n) * (2 * i + 1)) }); r.push(rounding)
  }
  return { v, r }
}
// MaterialShapes.customPolygon + doRepeat (centre 0.5, 0.5)
function custom(pnr, reps, mirroring = false) {
  const c = { x: 0.5, y: 0.5 }
  const deg = (a) => (a * 180) / Math.PI
  const out = []
  if (mirroring) {
    const angles = pnr.map((p) => deg(Math.atan2(p.o.y - c.y, p.o.x - c.x)))
    const dists = pnr.map((p) => len(sub(p.o, c)))
    const actualReps = reps * 2, section = 360 / actualReps
    for (let it = 0; it < actualReps; it++) {
      for (let index = 0; index < pnr.length; index++) {
        const i = it % 2 === 0 ? index : pnr.length - 1 - index
        if (i > 0 || it % 2 === 0) {
          const a = ((section * it + (it % 2 === 0 ? angles[i] : section - angles[i] + 2 * angles[0])) * Math.PI) / 180
          out.push({ o: { x: Math.cos(a) * dists[i] + c.x, y: Math.sin(a) * dists[i] + c.y }, r: pnr[i].r })
        }
      }
    }
  } else {
    for (let k = 0; k < pnr.length * reps; k++) {
      const p = pnr[k % pnr.length], a = ((Math.floor(k / pnr.length) * 360) / reps) * (Math.PI / 180)
      const d = sub(p.o, c)
      out.push({ o: { x: d.x * Math.cos(a) - d.y * Math.sin(a) + c.x, y: d.x * Math.sin(a) + d.y * Math.cos(a) + c.y }, r: p.r })
    }
  }
  return { v: out.map((p) => p.o), r: out.map((p) => p.r) }
}

// name -> [polygon, transforms applied to the rounded outline]: MaterialShapes.kt, in its order
export const MATERIAL_SHAPES = {
  circle: () => [circle(10)],
  square: () => [rectangle(1, 1, { rounding: round30 })],
  slanted: () => [custom([P(0.926, 0.970, R(0.189, 0.811)), P(-0.021, 0.967, R(0.187, 0.057))], 2)],
  arch: () => [regular(4, { perVertex: [round100, round100, round20, round20] }), [rotate(-135)]],
  fan: () => [custom([P(1.004, 1.0, R(0.148, 0.417)), P(0.0, 1.0, R(0.151)), P(0.0, -0.003, R(0.148)), P(0.978, 0.020, R(0.803))], 1)],
  arrow: () => [custom([P(0.5, 0.892, R(0.313)), P(-0.216, 1.050, R(0.207)), P(0.499, -0.160, R(0.215, 1)), P(1.225, 1.060, R(0.211))], 1)],
  'semi-circle': () => [rectangle(1.6, 1, { perVertex: [round20, round20, round100, round100] })],
  oval: () => [circle(), [scale(1, 0.64), rotate(-45)]],
  pill: () => [custom([P(0.961, 0.039, R(0.426)), P(1.001, 0.428), P(1.0, 0.609, R(1))], 2, true)],
  triangle: () => [regular(3, { rounding: round20 }), [rotate(-90)]],
  diamond: () => [custom([P(0.5, 1.096, R(0.151, 0.524)), P(0.040, 0.5, R(0.159))], 2)],
  'clam-shell': () => [custom([P(0.171, 0.841, R(0.159)), P(-0.020, 0.5, R(0.140)), P(0.170, 0.159, R(0.159))], 2)],
  pentagon: () => [custom([P(0.5, -0.009, R(0.172)), P(1.030, 0.365, R(0.164)), P(0.828, 0.970, R(0.169))], 1, true)],
  gem: () => [custom([P(0.499, 1.023, R(0.241, 0.778)), P(-0.005, 0.792, R(0.208)), P(0.073, 0.258, R(0.228)), P(0.433, -0.0, R(0.491))], 1, true)],
  sunny: () => [star(8, 0.8, round15)],
  'very-sunny': () => [custom([P(0.5, 1.080, R(0.085)), P(0.358, 0.843, R(0.085))], 8)],
  'cookie-4-sided': () => [custom([P(1.237, 1.236, R(0.258)), P(0.5, 0.918, R(0.233))], 4)],
  'cookie-6-sided': () => [custom([P(0.723, 0.884, R(0.394)), P(0.5, 1.099, R(0.398))], 6)],
  'cookie-7-sided': () => [star(7, 0.75, round50), [rotate(-90)]],
  'cookie-9-sided': () => [star(9, 0.8, round50), [rotate(-90)]],
  'cookie-12-sided': () => [star(12, 0.8, round50), [rotate(-90)]],
  ghostish: () => [custom([P(0.5, 0, R(1)), P(1, 0, R(1)), P(1, 1.140, R(0.254, 0.106)), P(0.575, 0.906, R(0.253))], 1, true)],
  'clover-4-leaf': () => [custom([P(0.5, 0.074), P(0.725, -0.099, R(0.476))], 4, true)],
  'clover-8-leaf': () => [custom([P(0.5, 0.036), P(0.758, -0.101, R(0.209))], 8)],
  burst: () => [custom([P(0.5, -0.006, R(0.006)), P(0.592, 0.158, R(0.006))], 12)],
  'soft-burst': () => [custom([P(0.193, 0.277, R(0.053)), P(0.176, 0.055, R(0.053))], 10)],
  boom: () => [custom([P(0.457, 0.296, R(0.007)), P(0.5, -0.051, R(0.007))], 15)],
  'soft-boom': () => [custom([P(0.733, 0.454), P(0.839, 0.437, R(0.532)), P(0.949, 0.449, R(0.439, 1)), P(0.998, 0.478, R(0.174))], 16, true)],
  flower: () => [custom([P(0.370, 0.187), P(0.416, 0.049, R(0.381)), P(0.479, 0.001, R(0.095))], 8, true)],
  puffy: () => [custom([P(0.5, 0.053), P(0.545, -0.040, R(0.405)), P(0.670, -0.035, R(0.426)), P(0.717, 0.066, R(0.574)), P(0.722, 0.128), P(0.777, 0.002, R(0.360)), P(0.914, 0.149, R(0.660)), P(0.926, 0.289, R(0.660)), P(0.881, 0.346), P(0.940, 0.344, R(0.126)), P(1.003, 0.437, R(0.255))], 2, true), [scale(1, 0.742)]],
  'puffy-diamond': () => [custom([P(0.870, 0.130, R(0.146)), P(0.818, 0.357), P(1.0, 0.332, R(0.853))], 4, true)],
  'pixel-circle': () => [custom([P(0.5, 0), P(0.704, 0), P(0.704, 0.065), P(0.843, 0.065), P(0.843, 0.148), P(0.926, 0.148), P(0.926, 0.296), P(1.0, 0.296)], 2, true)],
  'pixel-triangle': () => [custom([P(0.110, 0.5), P(0.113, 0), P(0.287, 0), P(0.287, 0.087), P(0.421, 0.087), P(0.421, 0.170), P(0.560, 0.170), P(0.560, 0.265), P(0.674, 0.265), P(0.675, 0.344), P(0.789, 0.344), P(0.789, 0.439), P(0.888, 0.439)], 1, true)],
  bun: () => [custom([P(0.796, 0.5), P(0.853, 0.518, R(1)), P(0.992, 0.631, R(1)), P(0.968, 1.0, R(1))], 2, true)],
  heart: () => [custom([P(0.5, 0.268, R(0.016)), P(0.792, -0.066, R(0.958)), P(1.064, 0.276, R(1)), P(0.501, 0.946, R(0.129))], 1, true)],
}

// The dense outline of a Material shape in the unit square (normalized: the longer side spans 0..1, the other is centred)
export function shapeOutline(name) {
  const [poly, transforms = []] = MATERIAL_SHAPES[name]()
  let pts = outline(roundedPolygon(poly.v, poly.r))
  for (const t of transforms) pts = pts.map((p) => ({ ...p, ...t(p) }))
  return normalize(pts)
}

// A superellipse |x|^4 + |y|^4 = 1: not a Material shape, kept as the kit's `squircle`
export function squircleOutline() {
  const pts = []
  for (let i = 0; i < 2048; i++) { const t = (i / 2048) * TAU, r = 1 / (Math.abs(Math.cos(t)) ** 4 + Math.abs(Math.sin(t)) ** 4) ** 0.25; pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) }) }
  return normalize(pts)
}

function normalize(pts) {
  const real = pts.filter((p) => !p.ghost)
  const xs = real.map((p) => p.x), ys = real.map((p) => p.y)
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, h = Math.max(...ys) - minY, side = Math.max(w, h)
  const ox = (side - w) / 2 - minX, oy = (side - h) / 2 - minY
  return pts.map((p) => ({ ...p, x: (p.x + ox) / side, y: (p.y + oy) / side }))
}

// N points along the outline at equal arc length, starting where the outline crosses the ray from the centre to the right (Compose's startAngle 0), clockwise on screen;
// each sharp vertex takes the sample nearest to it, so tips and pixel steps are not cut. Same N for every shape: clip-path interpolates any two.
export function samplePolygon(dense, N) {
  let loop = dense.filter((p) => !p.ghost)
  const area = loop.reduce((s, p, i) => { const q = loop[(i + 1) % loop.length]; return s + p.x * q.y - q.x * p.y }, 0)
  if (area < 0) loop = loop.reverse()
  // start: the crossing of y = 0.5 with x > 0.5 that lies farthest right
  let best = null
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length]
    if ((a.y - 0.5) * (b.y - 0.5) <= 0 && a.y !== b.y) {
      const t = (0.5 - a.y) / (b.y - a.y), x = a.x + (b.x - a.x) * t
      if (x > 0.5 && (!best || x > best.x)) best = { i, x, t }
    }
  }
  if (best) { const a = loop[best.i]; loop = [{ x: best.x, y: 0.5, sharp: false }, ...loop.slice(best.i + 1), ...loop.slice(0, best.i + 1)]; if (a.y === 0.5 && a.x === best.x) loop.pop() }
  const cum = [0]
  for (let i = 1; i <= loop.length; i++) cum.push(cum[i - 1] + len(sub(loop[i % loop.length], loop[i - 1])))
  const total = cum[loop.length]
  const at = (s) => { let lo = 0, hi = loop.length; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m } const t = (s - cum[lo]) / (cum[lo + 1] - cum[lo] || 1); return lerp(loop[lo], loop[(lo + 1) % loop.length], t) }
  const out = Array.from({ length: N }, (_, k) => at((total * k) / N))
  // snap: each sharp vertex (unrounded, or a tip rounded by less than 2 % of the shape) takes its nearest free sample, moved onto the outline point at the tip
  const taken = new Set([0])
  const tipIndex = new Set()
  for (const tip of dense.filter((p) => p.sharp)) {
    let j = 0, d = Infinity
    for (let i = 0; i < loop.length; i++) { const e = len(sub(loop[i], tip)); if (e < d) { d = e; j = i } }
    tipIndex.add(j)
  }
  for (const j of [...tipIndex].sort((x, y) => x - y)) {
    const k0 = Math.round((cum[j] / total) * N) % N
    const k = [k0, (k0 + 1) % N, (k0 + N - 1) % N].find((q) => !taken.has(q))
    if (k === undefined) continue
    taken.add(k)
    out[k] = loop[j]
  }
  return out
}

// Largest distance from the dense outline to the polygon (fraction of the box): how much the sampling loses
export function samplingError(dense, poly) {
  const segDist = (p, a, b) => { const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1))); return len(sub(p, add(a, mul(ab, t)))) }
  let worst = 0
  for (const p of dense) { if (p.ghost) continue; let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(p, poly[i], poly[(i + 1) % poly.length])); worst = Math.max(worst, d) }
  return worst
}

export const toClipPath = (poly) => `polygon(${poly.map((p) => `${fmt(p.x)}% ${fmt(p.y)}%`).join(', ')})`
const fmt = (v) => { const s = (Math.round(Math.min(1, Math.max(0, v)) * 1000) / 10).toFixed(1); return s.endsWith('.0') ? s.slice(0, -2) : s }
