import test from 'node:test'
import assert from 'node:assert/strict'
import { skeletonOf, snapshotOf } from '../src/vue/dash/dashSkeleton.js'
import { columnsOf } from '../src/vue/homeSizes.js'

const cols = (w) => columnsOf(w)
const block = { key: 'grid', units: columnsOf(1200).columns, width: 0, template: '100px 100px 56px', boxed: [{ id: 'a', span: 2, rows: 2, cls: 'unit' }, { id: 'b', span: 4, rows: 1, cls: 'strip' }] }
const cellStyle = (b, id) => ({ gridRow: '1 / span 1', gridColumn: id === 'a' ? '1 / span 2' : '3 / span 4' })

test('the arrangement on the page is snapshotted, none while there are no tiles', () => {
  assert.equal(snapshotOf({ blocks: [{ ...block, boxed: [] }], cellStyle, sectioned: false, width: 1200 }), null)
  const s = snapshotOf({ blocks: [block], cellStyle, sectioned: false, width: 1200 })
  assert.equal(s.blocks[0].cells.length, 2)
  assert.equal(s.blocks[0].cells[0].big, true)
  assert.equal(s.blocks[0].cells[1].cls, 'strip')
})

test('a kept arrangement of the same column count is drawn again at the unit of this width', () => {
  const s = snapshotOf({ blocks: [block], cellStyle, sectioned: false, width: 1200 })
  const [b] = skeletonOf(s, { sectioned: false, width: 1200, columnsOf: cols })
  assert.equal(b.cells[0].style.gridColumn, '1 / span 2')
  const unit = cols(1200).unit
  assert.equal(b.template, `${unit}px ${unit}px 56px`)
})

test('without a kept arrangement, or for another column count, a first-start arrangement fills the columns', () => {
  const [b] = skeletonOf(null, { sectioned: false, width: 1200, columnsOf: cols })
  assert.ok(b.cells.length >= 3)
  assert.equal(b.cells.length, 9, 'the nine tiles a new user gets: eight and the guide strip')
  const unitCells = b.cells.filter((c) => c.cls === 'unit')
  assert.equal(unitCells.reduce((a, c) => a + (+c.style.gridColumn.slice(5)) * (+c.style.gridRow.slice(5)), 0), 13)
  assert.equal(b.cells.at(-1).cls, 'strip')
  assert.equal(b.cells.at(-1).style.gridColumn, '1 / -1')
  assert.equal(b.template, `${cols(1200).unit}px `.repeat(b.template.split(' ').length - 1) + '56px')
  assert.equal(b.cells.filter((c) => c.big).length, 1)
  assert.equal(b.units, cols(1200).columns)
  const s = snapshotOf({ blocks: [block], cellStyle, sectioned: false, width: 1200 })
  const [c] = skeletonOf(s, { sectioned: false, width: 700, columnsOf: cols })
  assert.notEqual(c.cells.length, 2)
  for (const cell of c.cells.filter((x) => x.cls === 'unit')) assert.match(cell.style.gridColumn, /^span [1-9]/)
})

import { readFileSync as readSrc } from 'node:fs'
test('the log viewer draws a skeleton of lines, not 「no lines」, while the product has asked for the log and has no text', () => {
  const viewer = readSrc(new URL('../src/vue/MLogViewer.vue', import.meta.url), 'utf8')
  assert.match(viewer, /loading: \{ type: Boolean, default: false \}/)
  assert.match(viewer, /v-if="!shown\.length && !rows\.length && loading" class="m-logv__skel"/)
  assert.match(viewer, /<p v-else-if="!shown\.length" class="m-logv__empty">/)
  assert.match(readSrc(new URL('../src/vue/MDiagnostics.vue', import.meta.url), 'utf8'), /:loading="logLoading"/)
})

test('the skeleton of a segmented layout keeps the natural height of the kept arrangement, and tile surfaces read on a white page', () => {
  const s = snapshotOf({ blocks: [{ ...block, natural: 640 }], cellStyle, sectioned: true, width: 1200 })
  assert.equal(s.blocks[0].natural, 640)
  const [b] = skeletonOf(s, { sectioned: true, width: 1200, columnsOf: cols, sectionCount: 1 })
  assert.equal(b.natural, 640)
  assert.match(readSrc(new URL('../src/vue/dash/dashSkeletonUse.js', import.meta.url), 'utf8'), /skeletonSlack/)
  assert.match(readSrc(new URL('../src/vue/MHomeDash.vue', import.meta.url), 'utf8'), /<MDashSkeleton v-if="skeleton" :blocks="skeleton" :style="skeletonSlack > 40/)
  const css = readSrc(new URL('../src/css/pageloading.css', import.meta.url), 'utf8')
  assert.match(css, /\.m-dskel__tile \{[^}]*color-mix\(in srgb, var\(--md-sys-color-on-surface\) 6%, var\(--m-card/)
  assert.doesNotMatch(css.slice(css.indexOf('m-dskel__tile')), /#[0-9a-f]{3,8}\b/i, 'tokens only')
})
