import test from 'node:test'
import assert from 'node:assert/strict'
import { packDash } from '../src/vue/homePack.js'
import { largestOf, sizesOf } from '../src/vue/homeSizes.js'

test('a strip is never made two rows tall to close a hole beside stacked strips (the 手柄类型 bar was a tall card with one row of chips)', () => {
  const cards = [
    { id: 'quick', span: 4, cls: 'strip', rows: 1 },
    { id: 'gamepad-type', span: 4, cls: 'strip', rows: 1 },
    { id: 'sw:mic', span: 2, cls: 'strip', rows: 1 },
  ]
  const { placed } = packDash(cards, 8)
  for (const id of ['quick', 'gamepad-type', 'sw:mic']) assert.equal(placed.get(id).rows, 1, `${id} stays one row`)
})

test('a tile with nothing to show is not the one that comes up to fill a hole: it would be stretched to the height of the row', () => {
  const hero = { id: 'hero', span: 4, cls: 'hero', rows: 1 }
  const empty = { id: 'recent-games', span: 2, cls: 'tile', rows: 1, data: { type: 'rows', rows: [] } }
  const full = { id: 'vdd', span: 2, cls: 'tile', rows: 1, data: { type: 'rows', big: '2160p', rows: [] } }
  const a = packDash([hero, empty, full], 8).placed
  assert.ok(a.get('vdd').row === a.get('hero').row, 'a tile with data fills the hero row')
  assert.notEqual(a.get('recent-games').row, a.get('hero').row, 'the empty one does not')
})

test('a row of controls is a strip (with the square of its current value where one value says it); each tile offers the range it declares, no wider', () => {
  const sizes = (id, meta) => Object.keys(sizesOf(id, meta).sizes).join(',')
  assert.equal(sizes('gamepad-type', { cls: 'strip', data: { type: 'strip-control' } }), 's,m,l,strip')
  assert.equal(sizes('sw:mic', { cls: 'strip', data: { type: 'strip-control' } }), 's,strip')
  assert.equal(sizes('quick', { cls: 'strip', data: { type: 'quick', items: [{}, {}, {}, {}] } }), 'strip')
  assert.equal(sizes('act-restart', { cls: 'strip', data: { type: 'action' } }), 's')
  assert.equal(sizes('pin:setting:x', { cls: 'card', data: { type: 'pin-slider' } }), 's,strip')
  assert.equal(sizes('vdd', {}), 's,m'); assert.equal(largestOf('vdd', {}), 'xl', 'the data of an empty meta does not cap it: the declaration does')
  // 特大 only for the tiles that have a 特大 view of their own
  assert.equal(sizes('cpu', {}), 's,m,l'); assert.equal(sizes('clients-paired', {}), 's,m,l,xl'); assert.equal(sizes('table', {}), 'm,l'); assert.equal(sizes('bitrate', {}), 's,m,l')
})
