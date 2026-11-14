import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fitDash } from '../src/vue/homeFit.js'
import { smartPlan } from '../src/vue/homeSmart.js'
import { hasNoData, largestOf, sizesOf, genericAtS, boxOf } from '../src/vue/homeSizes.js'
import { readDash } from './dashSource.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const SPANS = { s: 2, m: 4, l: 8 }
// the default overview's bars and tiles, boxed the way the overview boxes them
const CARDS = [['hero', 'm', 'hero'], ['pair', 'm', 'hero'], ['apps', 's', 'hero'], ['vdd', 's', 'tile'], ['download', 's', 'tile'], ['encoder', 's', 'tile'], ['quick', 'm', 'strip'], ['gamepad-type', 'm', 'strip'], ['sw:mic', 'm', 'strip'], ['public-address', 's', 'tile'], ['cpu', 's', 'tile'], ['gpu', 's', 'tile'], ['memory', 's', 'tile']].map(([id, key, cls]) => ({ id, key, cls }))
const box = (c, units) => { const base = SPANS[c.key]; const span = Math.min(base, units); return { span, rows: 1, cls: c.cls, max: Math.min(units, span * 2), size: c.key } }
const hole = (f) => { let worst = 0; for (let r = 0; r < f.packed.rows.length; r++) { const used = Array(f.units).fill(false); for (const p of f.packed.placed.values()) if (p.row <= r && r < p.row + p.rows) for (let k = p.col; k < p.col + p.span; k++) used[k] = true; let run = 0; for (let k = 0; k <= f.units; k++) { if (k < f.units && !used[k]) run++; else { worst = Math.max(worst, run); run = 0 } } } return worst }

test('a row of bars has no hole wider than a column, at every width of a resize, and the same width gives the same layout', () => {
  const layoutAt = (w) => fitDash(CARDS, w, box, w < 860 ? { units: 4 } : {})
  for (let w = 720; w <= 3200; w += 20) { const f = layoutAt(w); assert.ok(hole(f) <= 1, `${w}: a hole of ${hole(f)} columns`) }
  const ref = JSON.stringify([...layoutAt(1440).packed.placed.entries()])
  for (const w of [900, 2500, 760, 3100, 1440]) layoutAt(w)
  assert.equal(JSON.stringify([...layoutAt(1440).packed.placed.entries()]), ref)
})

test('a tile with nothing to show: small, after the tiles that have data in the smart plan, never hidden', () => {
  const cards = [
    { id: 'hero', available: true, sizes: ['m', 'l'] }, { id: 'announcements', available: true, empty: true, sizes: ['s', 'm', 'l'] },
    { id: 'cpu', available: true, empty: false, sizes: ['s', 'm', 'l'] }, { id: 'gpu', available: true, empty: false, sizes: ['s', 'm'] },
    { id: 'last-session', available: true, empty: true, sizes: ['s', 'm'] },
  ]
  const plan = smartPlan({ signals: { pairedCount: 2 }, cards, capacity: 40 })
  assert.equal(plan.visible[0], 'hero')
  const at = (id) => plan.visible.indexOf(id)
  assert.ok(at('announcements') > at('cpu') && at('announcements') > at('gpu') && at('last-session') > at('cpu'), 'after the tiles with data')
  assert.ok(at('announcements') >= 0 && at('last-session') >= 0, 'still on the page')
  assert.equal(plan.sizes.announcements, 's'); assert.equal(plan.sizes['last-session'], 's')
})

test('the overview sinks the empty tiles of a layout nobody arranged and defaults them to S; a layout the person arranged keeps its order', () => {
  const d = readDash()
  assert.match(d, /const sinkEmpty = \(list\) => \[\.\.\.list\.filter\(\(c\) => !hasNoData\(c\.data\)\), \.\.\.list\.filter\(\(c\) => hasNoData\(c\.data\)\)\]/)
  assert.match(d, /layout\.isDefault\.value \? sinkEmpty\(layout\.visible\(allCards\.value, props\.ctx\)\) : layout\.visible\(allCards\.value, props\.ctx\)/)
  // an empty tile is drawn at its smallest by effectiveSize (its data fills nothing), not by a rule of the packer
  assert.match(d, /const sizeOf = \(id\) => \(smart\.value \? plan\.value\.sizes\[id\] : layout\.state\.sizes\[id\]\)/)
  assert.doesNotMatch(d, /shownSizeKey|sizeShift|viewKeyOf|sizeClassOf/)
  assert.match(d, /empty: hasNoData\(c\.data\)/)
})

test('what a tile offers follows its data: nothing to show is S; a list of a few items stops at M; one row of facts is S; a heat strip stops at M', () => {
  const keys = (id, meta) => Object.keys(sizesOf(id, meta).sizes).join('')
  assert.equal(keys('recent-games', { data: { type: 'apps', items: [], empty: 'none' }, sizes: { s: [2, 1], m: [4, 1], l: [4, 2] } }), 's')
  assert.equal(keys('announcements', { data: { type: 'news', items: [] }, sizes: { s: [2, 1], m: [4, 1], l: [4, 2] } }), 's', 'empty: its smallest size')
  assert.equal(keys('table', { kind: 'table', data: { tabs: [{ rows: [{}, {}] }] } }), 'm')
  assert.equal(keys('table', { kind: 'table', data: { tabs: [{ rows: [1, 2, 3, 4, 5, 6].map(() => ({})) }] } }), 'ml')
  assert.equal(keys('apps', { kind: 'apps', data: { items: [{}, {}, {}, {}], count: 4 } }), 'sm')
  assert.equal(keys('gamepad-status', { data: { type: 'rows', rows: [{ title: 'a', value: 'b' }] }, sizes: { s: [2, 1], m: [4, 1], l: [4, 2] } }), 's')
  assert.equal(keys('session-heat', { data: { type: 'heat', total: '3h', days: [] }, sizes: { s: [2, 1], m: [4, 1], l: [4, 2] } }), 'sm')
  assert.ok(hasNoData({ type: 'news', items: [] })); assert.ok(!hasNoData({ type: 'news', items: [{}] }))
  assert.ok(genericAtS({ kind: 'widget', data: { type: 'news', items: [] } })); assert.ok(genericAtS({ kind: 'widget', data: { type: 'news', items: [{}] } }), 'the square is one view for every tile')
  assert.equal(largestOf('x', {}), 'xl'); assert.ok(boxOf)
})

test('a list of one or two items is a square (the count and the first); 特大 is offered only while the data it adds is there', () => {
  const keys = (id, meta) => Object.keys(sizesOf(id, meta).sizes).join(',')
  assert.equal(keys('logs', { data: { type: 'lines', rows: [{ title: 'a' }] } }), 's')
  assert.equal(keys('logs', { data: { type: 'lines', rows: [1, 2, 3].map(() => ({ title: 'a' })) } }), 's,m')
  const cl = (time) => ({ data: { type: 'clients', items: [1, 2, 3, 4, 5].map((i) => ({ name: `c${i}`, time })) } })
  assert.equal(keys('clients-paired', cl('–')), 's,m,l', 'no history kept yet: the 特大 table would only repeat the names')
  assert.equal(keys('clients-paired', cl('2 小时')), 's,m,l,xl')
  const err = (n) => ({ data: { type: 'bars', series: [], lines: Array.from({ length: n }, () => ({ title: 'x' })) } })
  assert.deepEqual([0, 2, 6].map((n) => keys('errors', err(n))), ['m', 'm,l', 'm,l,xl'])
  const cov = (n) => ({ data: { type: 'covers', items: Array.from({ length: n }, () => ({ name: 'x' })) } })
  assert.deepEqual([4, 8, 12].map((n) => keys('covers', cov(n))), ['m', 'm,l', 'm,l,xl'])
})

test('a curve offers 大 only with the data 大 adds (two samples or more for its lowest, mean and highest, or the facts of the hardware)', () => {
  const keys = (id, meta) => Object.keys(sizesOf(id, meta).sizes).join(',')
  assert.equal(keys('cpu', { kind: 'curve', data: { points: [12] } }), 's,m')
  assert.equal(keys('cpu', { kind: 'curve', data: { points: [12, 14] } }), 's,m,l')
  assert.equal(keys('cpu', { kind: 'curve', data: { points: [], facts: ['16 核 32 线程'] } }), 's,m,l')
})

test('an empty or unset tile takes the smallest size of its range, whatever was chosen or planned (the public address not set: 方形)', async () => {
  const { effectiveSize, WINDOW_CLASSES } = await import('../src/vue/homeSizes.js')
  const unset = { id: 'public-address', data: { type: 'address', saved: '', path: { word: '未检测' } } }
  assert.ok(hasNoData(unset.data))
  for (const c of WINDOW_CLASSES) for (const chosen of ['s', 'm', 'l', 'xl', undefined]) assert.equal(effectiveSize(unset, chosen, c, 'smart'), 's', `${c} ${chosen}`)
  assert.equal(effectiveSize({ id: 'public-address', data: { type: 'address', saved: 'example.org' } }, 'm', 'large'), 'm')
  // a tile whose range starts above 方形 keeps its minimum when empty: the client table at 中
  assert.equal(effectiveSize({ id: 'table', kind: 'table', data: { tabs: [{ rows: [] }] } }, 'l', 'large'), 'm')
})
