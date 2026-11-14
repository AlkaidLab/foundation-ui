// The shape library: the 35 shapes of MaterialShapes.kt, morphable (one point count), the kit's older names kept, and nothing else redefining them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { MATERIAL_SHAPES, shapeOutline, samplingError } from '../scripts/material-shapes.mjs'
import { SHAPE_POINTS, shapePolygons, shapesCss } from '../scripts/build-shapes.mjs'

const css = readFileSync(new URL('../src/css/shapes.css', import.meta.url), 'utf8')
const tokens = Object.fromEntries([...css.matchAll(/--m-shape-([a-z0-9-]+): (polygon\([^;]*\));/g)].map((m) => [m[1], m[2]]))

// MaterialShapes.kt, in its order (the public vals, kebab-cased)
const SPEC = ['Circle', 'Square', 'Slanted', 'Arch', 'Fan', 'Arrow', 'SemiCircle', 'Oval', 'Pill', 'Triangle', 'Diamond', 'ClamShell', 'Pentagon', 'Gem', 'Sunny', 'VerySunny', 'Cookie4Sided', 'Cookie6Sided', 'Cookie7Sided', 'Cookie9Sided', 'Cookie12Sided', 'Ghostish', 'Clover4Leaf', 'Clover8Leaf', 'Burst', 'SoftBurst', 'Boom', 'SoftBoom', 'Flower', 'Puffy', 'PuffyDiamond', 'PixelCircle', 'PixelTriangle', 'Bun', 'Heart']
const kebab = (s) => s.replace(/([a-z])([A-Z0-9])/g, '$1-$2').replace(/([0-9])([A-Z])/g, '$1-$2').toLowerCase()

test('the shape library has the 35 shapes of MaterialShapes.kt, and the kit names cookie, clover and squircle', () => {
  assert.equal(SPEC.length, 35)
  assert.deepEqual(Object.keys(MATERIAL_SHAPES), SPEC.map(kebab))
  for (const name of [...SPEC.map(kebab), 'cookie', 'clover', 'squircle', 'circle', 'sunny', 'burst', 'gem']) {
    assert.ok(tokens[name], `--m-shape-${name}`)
    assert.match(css, new RegExp(`\\.m-shape--${name} \\{ clip-path: var\\(--m-shape-${name}\\); \\}`))
  }
  assert.equal(tokens.cookie, tokens['cookie-9-sided'])
  assert.equal(tokens.clover, tokens['clover-4-leaf'])
})

test('every shape has the same number of points, so any two morph', () => {
  for (const [name, value] of Object.entries(tokens)) assert.equal(value.split(',').length, SHAPE_POINTS, name)
})

test('the squircle is not the circle (it was: a clamp cut it to the circle)', () => {
  assert.notEqual(tokens.squircle, tokens.circle)
  // the superellipse reaches the corner diagonal at 1 / 2^(1/4) of the half-diagonal: about 92 % of the box, the circle 85 %
  const at45 = (v) => Math.max(...v.slice(8, -1).split(', ').map((p) => p.split(' ').map(parseFloat)).filter(([x, y]) => Math.abs(x - y) < 2).map(([x]) => x))
  assert.ok(at45(tokens.squircle) > 90, `squircle ${at45(tokens.squircle)}`)
  assert.ok(at45(tokens.circle) < 86.5, `circle ${at45(tokens.circle)}`)
})

test('no other stylesheet redefines a shape token (loading.css replaced cookie, burst and circle after shapes.css)', () => {
  const dir = new URL('../src/css/', import.meta.url)
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.css') && f !== 'shapes.css')) {
    const text = readFileSync(new URL(file, dir), 'utf8')
    assert.doesNotMatch(text, /--m-shape-[a-z0-9-]+\s*:/, file)
  }
})

test('the polygons follow the outlines: at most 2 % of the box lost to sampling, 1 % for all but the 64-vertex SoftBoom', () => {
  const polys = shapePolygons()
  for (const name of Object.keys(MATERIAL_SHAPES)) {
    const err = samplingError(shapeOutline(name), polys[name])
    assert.ok(err < (name === 'soft-boom' ? 0.02 : 0.01), `${name} ${(err * 100).toFixed(2)} %`)
  }
})

test('each shape fills its box: touches all four sides or, if not square, spans the longer side and is centred', () => {
  for (const [name, poly] of Object.entries(shapePolygons())) {
    const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y)
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys)
    assert.ok(Math.max(w, h) > 0.985, `${name} ${w} x ${h}`)
    assert.ok(Math.abs((Math.max(...xs) + Math.min(...xs)) / 2 - 0.5) < 0.01 && Math.abs((Math.max(...ys) + Math.min(...ys)) / 2 - 0.5) < 0.01, `${name} centred`)
  }
})

test('shapes.css is what scripts/build-shapes.mjs generates', () => {
  assert.equal(css, shapesCss())
})
