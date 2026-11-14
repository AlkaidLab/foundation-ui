import assert from 'node:assert/strict'
import test from 'node:test'
import { packDash, pullNeighbours } from '../src/vue/homePack.js'
import { SIZE_TABLE, boxOf, nextSize, sizeKeyOf, sizesOf } from '../src/vue/homeSizes.js'
import { useDashLayout } from '../src/vue/useDashLayout.js'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }
const card = (id, span, rows = 1, cls = 'card') => ({ id, span, rows, cls })

// every cell of every row is taken by exactly one card and the boxes do not overlap
function assertFilled(cards, units) {
  const { rows, placed } = packDash(cards, units)
  const seen = rows.map(() => new Array(units).fill(''))
  for (const [id, p] of placed) for (let r = p.row; r < p.row + p.rows; r++) for (let c = p.col; c < p.col + p.span; c++) { assert.equal(seen[r][c], '', `${id} overlaps ${seen[r][c]}`); seen[r][c] = id }
  seen.forEach((row, r) => assert.ok(row.every(Boolean), `row ${r} has a hole: ${row.map((x) => x || '.').join(' ')}`))
  return { rows, placed }
}

test('a large card leaves room beside it for small ones, and every row stays full', () => {
  const { placed } = assertFilled([card('big', 4, 2), card('a', 2), card('b', 2), card('c', 2), card('d', 2)], 8)
  assert.deepEqual([placed.get('big').row, placed.get('big').col, placed.get('big').rows], [0, 0, 2])
  assert.deepEqual([placed.get('a').row, placed.get('b').row, placed.get('c').row, placed.get('d').row], [0, 0, 1, 1])
})

test('a lone small card after a large one takes the free width, never a hole', () => {
  assertFilled([card('big', 4, 2), card('a', 2)], 8)
  assertFilled([card('a', 2), card('big', 4, 2), card('b', 2), card('c', 4)], 8)
  assertFilled([card('x', 3), card('big', 4, 2), card('y', 1)], 8)
})

test('rows keep their class: a large card and the cards beside it share the class, others go below', () => {
  const { rows, placed } = assertFilled([card('big', 4, 2, 'hero'), card('s1', 2, 1, 'hero'), card('s2', 2, 1, 'hero'), card('n', 4, 1, 'card'), card('m', 4, 1, 'card')], 8)
  assert.deepEqual(rows.map((r) => r.cls), ['hero', 'hero', 'card'])
  assert.equal(placed.get('n').row, 2)
  assert.equal(placed.get('m').row, 2)
})

test('reading order is kept: a later card never starts above an earlier one', () => {
  const { placed } = packDash([card('a', 4, 2), card('b', 4), card('c', 4), card('d', 4), card('e', 2)], 8)
  const order = ['a', 'b', 'c', 'd', 'e'].map((id) => placed.get(id))
  for (let i = 1; i < order.length; i++) assert.ok(order[i].row > order[i - 1].row || (order[i].row === order[i - 1].row && order[i].col >= order[i - 1].col + 0), `${i}`)
})

test('narrow windows: four and two columns clamp every card, a large card is still two rows', () => {
  for (const units of [4, 2]) {
    const { placed } = assertFilled([card('big', 4, 2), card('a', 2), card('b', 2), card('c', 8)], units)
    assert.ok([...placed.values()].every((p) => p.span <= units))
    assert.equal(placed.get('big').rows, 2)
  }
})

test('sizes: a card with a large layout offers S, M, L and XL at the same boxes; one without (the virtual display) or a bar offers S and M', () => {
  assert.deepEqual(sizesOf('cpu').sizes, { s: [2, 1], m: [4, 1], l: [4, 2] })
  assert.deepEqual(sizesOf('clients-paired').sizes, { s: [2, 1], m: [4, 1], l: [4, 2], xl: [8, 2] })
  assert.deepEqual(Object.keys(sizesOf('vdd').sizes), ['s', 'm'])
  assert.deepEqual(Object.keys(sizesOf('table').sizes), ['m', 'l'])
  assert.deepEqual(boxOf('cpu', {}, 'l'), { span: 4, rows: 2, max: 4 })
  assert.deepEqual(boxOf('cpu', {}, undefined), { span: 2, rows: 1, max: 3, cls: 'tile' })
  // a size a card offers is kept
  assert.equal(sizeKeyOf('table', {}, 'l'), 'l'); assert.equal(sizeKeyOf('vdd', {}, 'l'), 'm') // a saved size the card does not offer falls back to the largest one it has
  assert.equal(nextSize('cpu', {}, 's'), 'm')
  assert.equal(nextSize('cpu', {}, 'l'), 's')
  assert.equal(nextSize('clients-paired', {}, 'l'), 'xl')
  assert.equal(nextSize('hero', {}, 'm'), 'l')
  // unknown cards (the catalogue grows) derive their sizes from the width and the height class
  assert.deepEqual(Object.keys(sizesOf('new-card', { span: 2, cls: 'card' }).sizes), ['s', 'm']) // no declaration: 方形 and 中
  assert.deepEqual(Object.keys(sizesOf('new-strip', { span: 2, cls: 'strip' }).sizes), ['s', 'm'])
  for (const [id, row] of Object.entries(SIZE_TABLE)) assert.ok(row.sizes[row.size], id)
})

test('the chosen size is kept locally, reset clears it, a damaged value is ignored', () => {
  const storage = memory()
  const a = useDashLayout('sz', storage)
  assert.equal(a.state.sizes.cpu, undefined)
  a.setSize('cpu', 'l'); a.setSize('cpu', 'huge'); a.setSize('nope', 'm')
  assert.equal(a.state.sizes.cpu, 'l')
  assert.equal(a.isDefault.value, false)
  const b = useDashLayout('sz', storage)
  assert.equal(b.state.sizes.cpu, 'l')
  const snap = b.snapshot()
  b.setSize('cpu', 'm'); b.restore(snap)
  assert.equal(b.state.sizes.cpu, 'l')
  b.reset()
  assert.deepEqual({ ...b.state.sizes }, {})
  assert.equal(b.isDefault.value, true)
  assert.deepEqual({ ...useDashLayout('sz', { getItem: () => JSON.stringify({ order: [], overrides: {}, sizes: { cpu: 'x', gpu: 'm' } }) }).state.sizes }, { gpu: 'm' })
})

test('a card grows to twice its width where it has company, and a lone card takes the whole row: no hole wider than a column', () => {
  assert.equal(packDash([card('a', 2)], 8).placed.get('a').span, 8)
  assert.equal(packDash([card('h', 4)], 8).placed.get('h').span, 8)
  assert.deepEqual(packDash([card('a', 2), card('b', 2), card('c', 2)], 8).rows[0].cells.map((c) => c.span), [3, 3, 2])
})

test('back-fill: a hole beside a tall tile is filled by the next body tile, not left blank; a slim strip and the hero are not pulled into it', () => {
  const apps = { id: 'apps', span: 4, cls: 'list', rows: 1 }
  const strip = { id: 'strip', span: 8, cls: 'strip', rows: 1 }
  const enc = { id: 'enc', span: 2, cls: 'card', rows: 1 }
  const mem = { id: 'mem', span: 2, cls: 'card', rows: 1 }
  const quick = { id: 'quick', span: 4, cls: 'strip', rows: 1 }
  const out = pullNeighbours([apps, strip, enc, mem, quick], 8)
  assert.deepEqual(out.map((c) => c.id), ['apps', 'enc', 'mem', 'strip', 'quick'], 'two cards come up beside the apps tile')
  assert.ok(out[1].filled && out[2].filled && out[1].cls === 'list', 'they take the height of the row they fill')
  const packed = packDash([apps, strip, enc, mem, quick], 8)
  assert.deepEqual([packed.placed.get('enc').row, packed.placed.get('mem').row, packed.placed.get('apps').row], [0, 0, 0])
  // nothing but strips and a hero behind it: the row stays as it is
  assert.deepEqual(pullNeighbours([apps, strip, quick], 8).map((c) => c.id), ['apps', 'strip', 'quick'])
})
