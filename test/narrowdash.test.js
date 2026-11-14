import test from 'node:test'
import assert from 'node:assert/strict'
import { gridModeOf, sizeClassOf, sizeShift, boxOf } from '../src/vue/homeSizes.js'
import { packDash } from '../src/vue/homePack.js'
import { HEIGHTS } from '../src/vue/homeCards.js'

// a narrow window: a small tile is half the width, so the metric tiles (bitrate and frame rate, CPU and GPU) sit in pairs
test('narrow home: four columns, small tiles in pairs, rows sized to their content', () => {
  for (const container of [328, 456, 536]) assert.equal(gridModeOf(container).units, 4, `${container}`)
  const shift = sizeShift({ sizeClass: sizeClassOf(360, 740), tiles: 'auto', density: 'standard' })
  const cards = ['cpu', 'gpu', 'bitrate', 'fps'].map((id) => ({ id, ...boxOf(id, {}, 's', shift), cls: 'tile' }))
  const { placed } = packDash(cards, gridModeOf(328).units)
  assert.equal(placed.get('cpu').row, placed.get('gpu').row)
  assert.equal(placed.get('bitrate').row, placed.get('fps').row)
  assert.deepEqual([placed.get('cpu').span, placed.get('gpu').span], [2, 2])
  for (const h of Object.values(HEIGHTS.narrow)) assert.ok(!/^\d+px$/.test(h) || h === '52px', `fixed row height ${h}`)
})
