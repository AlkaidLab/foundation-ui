import { test } from 'node:test'
import assert from 'node:assert/strict'
import { niceMax, domainOf, fitDomain, rangeTicks, tickDecimals, monotonePath, seriesPoints, stack, histogram, nearestIndex, heatLevels, areaBetween } from '../src/charts/chartMath.js'

test('monotone path never overshoots a sample (plateau and spike)', () => {
  const pts = [0, 10, 10, 10, 50, 10].map((y, i) => ({ x: i * 10, y: 100 - y }))
  const d = monotonePath(pts)
  const ys = [...d.matchAll(/C[\d.]+ ([\d.-]+) [\d.]+ ([\d.-]+) /g)].flatMap((m) => [Number(m[1]), Number(m[2])])
  assert.ok(ys.every((y) => y <= 100.01 && y >= 49.99), 'control points stay between the data extremes')
  assert.equal(monotonePath([]), ''); assert.ok(monotonePath([{ x: 1, y: 2 }]).startsWith('M1.0 2.0'))
})
test('domain: headroom, floor for quiet series, fitted lines, empty', () => {
  assert.deepEqual(domainOf([[1, 2, 3]], { floor: 25 }), { lo: 0, hi: 25 })
  assert.equal(domainOf([[40, 80]]).hi, 100)
  const fit = domainOf([[50, 60]], { zero: false }); assert.ok(fit.lo > 0 && fit.lo < 50)
  assert.deepEqual(domainOf([[]]), { lo: 0, hi: 1 }); assert.equal(niceMax(0), 1); assert.equal(niceMax(73), 100)
})
test('series points share the x axis; bad samples are skipped', () => {
  const p = seriesPoints([0, 5, NaN, 10], { w: 90, h: 100, lo: 0, hi: 10 })
  assert.deepEqual(p.map((q) => q.x), [0, 30, 90]); assert.equal(p[2].y, 0); assert.equal(p[0].y, 100)
})
test('stack adds series bottom to top and tolerates short series', () => {
  const s = stack([[1, 2, 3], [1, 1], [0, 5, 5]])
  assert.deepEqual(s[2].top, [2, 8, 8]); assert.deepEqual(s[1].base, [1, 2, 3])
  assert.ok(areaBetween([{ x: 0, y: 1 }, { x: 1, y: 2 }], [{ x: 0, y: 5 }, { x: 1, y: 5 }]).endsWith('Z'))
})
test('histogram bins, edges, outliers and empty input', () => {
  const h = histogram([1, 2, 2, 3, 9, 10], 3, 0, 12)
  assert.deepEqual(h.counts, [4, 0, 2]); assert.equal(h.edges.length, 4)
  assert.deepEqual(histogram([], 4).counts, [0, 0, 0, 0]); assert.equal(histogram([5, 5], 2).counts.reduce((a, b) => a + b), 2)
})
test('nearest index and heat levels', () => {
  assert.equal(nearestIndex(0, 100, 11), 0); assert.equal(nearestIndex(55, 100, 11), 6); assert.equal(nearestIndex(999, 100, 11), 10); assert.equal(nearestIndex(5, 100, 1), 0)
  assert.deepEqual(heatLevels([0, 1, 5, 10, NaN]), [0, 1, 2, 4, 0])
})

test('fitted domain: a line that hovers around 117 gets a range around it, not 0 to 200', () => {
  const d = fitDomain([[112, 118, 121, 115, 119]])
  assert.ok(d.lo >= 100 && d.lo <= 112 && d.hi >= 121 && d.hi <= 135, JSON.stringify(d))
  assert.ok(d.hi - d.lo < 40)
  // never below zero for data that is not, a flat series still has a range, no data has one too
  assert.ok(fitDomain([[0.2, 0.4]]).lo >= 0)
  const flat = fitDomain([[5, 5, 5]]); assert.ok(flat.hi > flat.lo)
  assert.deepEqual([fitDomain([]).lo, fitDomain([]).hi], [0, 1])
  assert.equal(fitDomain([[-5, -1]]).lo < -5, true)
})

test('ticks: at most the asked number, on the step, with the decimals the step needs', () => {
  const t = rangeTicks(100, 140, 10, 5)
  assert.deepEqual(t, [100, 110, 120, 130, 140])
  assert.ok(rangeTicks(0, 100, 5, 4).length <= 5)
  assert.equal(tickDecimals(10), 0); assert.equal(tickDecimals(0.5), 1); assert.equal(tickDecimals(0.05), 2); assert.equal(tickDecimals(2.5), 1)
})
