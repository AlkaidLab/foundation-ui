import test from 'node:test'
import assert from 'node:assert/strict'
import { curvePaths, niceMax, scalePoints, smoothPath } from '../src/vue/curve.js'

test('the axis maximum is a round number', () => {
  assert.equal(niceMax(0), 1)
  assert.equal(niceMax(48), 50)
  assert.equal(niceMax(73.5), 100)
  assert.equal(niceMax(1.3), 2)
  assert.equal(niceMax(2.2), 2.5)
  assert.equal(niceMax(Number.NaN), 1)
})
test('points span the width and stay inside the height', () => {
  const pts = scalePoints([0, 5, 10], { w: 200, h: 100, max: 10, pad: 0.2 })
  assert.deepEqual(pts.map((p) => p.x), [0, 100, 200])
  assert.equal(pts[0].y, 100)
  assert.ok(Math.abs(pts[2].y - 20) < 1e-9)
  assert.deepEqual(scalePoints([1], { w: 10, h: 10 }), [])
  assert.deepEqual(scalePoints([NaN, undefined], { w: 10, h: 10 }), [])
})
test('values outside the scale are clamped and the path is closed along the bottom', () => {
  const p = curvePaths([5, 50, 5], { w: 100, h: 50, max: 10 })
  assert.ok(p.line.startsWith('M0.0 '))
  assert.ok(p.area.endsWith('L100.0 50 L0 50 Z') || p.area.endsWith('L100 50 L0 50 Z'))
  assert.ok(p.last.y >= 50 * 0.12 - 1e-9)
  assert.equal(smoothPath([{ x: 0, y: 0 }]), '')
})

test('a flat series is a line, never an area (a solid slab), at the middle of the height without a fixed maximum; all zeros lie on the baseline', async () => {
  const { curvePaths } = await import('../src/vue/curve.js')
  const flat = curvePaths([12, 12, 12, 12], { w: 100, h: 40, pad: 0.16 })
  assert.equal(flat.area, ''); assert.ok(flat.line); assert.equal(flat.flat, true)
  const ys = [...flat.line.matchAll(/(-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => +m[2])
  assert.ok(ys.every((y) => y > 10 && y < 30), `the flat line sits mid-height: ${ys}`)
  const zero = curvePaths([0, 0, 0], { w: 100, h: 40, pad: 0.16 }); assert.equal(zero.area, ''); assert.ok(/ 40(\.0)?$/.test(zero.line), zero.line)
  const moving = curvePaths([1, 5, 3], { w: 100, h: 40, pad: 0.16 }); assert.ok(moving.area.endsWith('Z')); assert.equal(moving.flat, false)
})

test('a series that moves by less than two pixels on its scale is flat too (a bitrate wobbling by 0.1 around 48)', async () => {
  const { curvePaths } = await import('../src/vue/curve.js')
  const p = curvePaths([47.9, 48.1, 48.0, 47.95], { w: 300, h: 50, pad: 0.16 }); assert.equal(p.flat, true); assert.equal(p.area, '')
  // on a fixed scale (a load of 100 %) 15 to 17 % is under a pixel of movement: a line at its level, no area
  const cpu = curvePaths([15, 17, 16], { w: 300, h: 50, pad: 0.16, max: 100 }); assert.equal(cpu.flat, true); assert.equal(cpu.area, '')
  const ys = [...cpu.line.matchAll(/(-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => +m[2]); assert.ok(ys.every((y) => y > 40), `at its level near the bottom: ${ys}`)
  assert.equal(curvePaths([10, 60, 30], { w: 300, h: 50, pad: 0.16, max: 100 }).flat, false)
})
