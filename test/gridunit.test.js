import test from 'node:test'
import assert from 'node:assert/strict'
import { UNIT_MIN_PX, UNIT_PX, aimOf, columnsOf } from '../src/vue/homeSizes.js'

// The unit of the overview grid follows the pane: a small window holds more, smaller squares; a big one keeps the 176 px square. Every unit stays above the 140 px the small views are drawn for.
test('the aimed unit is small in a narrow pane, full in a wide one, and rises on one line in between', () => {
  assert.equal(aimOf(400), UNIT_MIN_PX)
  assert.equal(aimOf(1000), UNIT_MIN_PX)
  assert.equal(aimOf(1600), UNIT_PX)
  assert.equal(aimOf(2400), UNIT_PX)
  let last = 0
  for (let w = 1000; w <= 1600; w += 20) { const a = aimOf(w); assert.ok(a >= last, 'never falls as the pane grows'); last = a }
})

test('a pane of 1760 px (a 1920 window) has the columns it had; small panes have more columns than the 176 px unit gave', () => {
  assert.deepEqual(columnsOf(1760), { columns: Math.floor(1772 / 188), unit: columnsOf(1760).unit })
  for (const w of [780, 840, 1000, 1120, 1280]) assert.ok(columnsOf(w).columns > Math.floor((w + 12) / 188), `${w}: more columns than before`)
})

test('no unit falls under 140 px, in any pane, at any density but the smaller one', () => {
  for (let w = 560; w <= 2600; w += 7) assert.ok(columnsOf(w).unit >= 140, `${w}: ${columnsOf(w).unit}`)
})
