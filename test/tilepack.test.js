import test from 'node:test'
import assert from 'node:assert/strict'
import { packTiles } from '../src/vue/tilePack.js'

test('every row fills the width and shares one height', () => {
  const { cells, units } = packTiles([
    { id: 'a', w: 2, h: 2 }, { id: 'b', w: 2, h: 2 }, { id: 'c', w: 1, h: 1 }, { id: 'd', w: 1, h: 1 },
    { id: 'e', w: 2, h: 1 }, { id: 'f', w: 1, h: 1 },
  ], 6)
  assert.equal(cells.get('a').rows, 2); assert.equal(cells.get('c').rows, 2)
  const row1 = ['a', 'b', 'c', 'd'].reduce((n, id) => n + cells.get(id).span, 0)
  assert.equal(row1, 6)
  assert.equal(cells.get('e').span + cells.get('f').span, 6)
  assert.equal(units, 3)
})
test('free columns go to the widest tiles first and a lone tile takes the row', () => {
  const { cells } = packTiles([{ id: 'a', w: 2, h: 1 }, { id: 'b', w: 1, h: 1 }], 4)
  assert.deepEqual([cells.get('a').span, cells.get('b').span], [3, 1])
  assert.equal(packTiles([{ id: 'x', w: 1, h: 1 }], 3).cells.get('x').span, 3)
})
test('a tile wider than the grid is clamped', () => {
  assert.equal(packTiles([{ id: 'w', w: 4, h: 1 }], 2).cells.get('w').span, 2)
})
