import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { SIZE_TABLE, boxOf, hasNoData, gridModeOf, shownSizeKey, sizeClassOf, sizeKeyOf, sizeShift, sizesOf, viewKeyOf, largestOf } from '../src/vue/homeSizes.js'
import { packDash } from '../src/vue/homePack.js'
import { normalize } from '../src/appearance/appearance.js'

test('the size class: compact under 600, extra-wide from 1600 or beyond 2.1 : 1, else medium', () => {
  assert.equal(sizeClassOf(360, 740), 'compact')
  assert.equal(sizeClassOf(599, 800), 'compact')
  assert.equal(sizeClassOf(600, 800), 'medium')
  assert.equal(sizeClassOf(1440, 900), 'medium')
  assert.equal(sizeClassOf(1599, 900), 'medium')
  assert.equal(sizeClassOf(1600, 900), 'extra')
  assert.equal(sizeClassOf(2560, 1080), 'extra')
  assert.equal(sizeClassOf(1500, 700), 'extra') // 2.14 : 1
  assert.equal(sizeClassOf(1400, 700), 'medium') // 2 : 1
})

test('the shift for each size class and setting', () => {
  const at = (sizeClass, tiles, density) => sizeShift({ sizeClass, tiles, density })
  assert.deepEqual(['compact', 'medium', 'extra'].map((c) => at(c, 'auto', 'standard')), [-1, 0, 1])
  assert.deepEqual(['compact', 'medium', 'extra'].map((c) => at(c, 'fixed', 'standard')), [0, 0, 0])
  assert.deepEqual(['compact', 'medium', 'extra'].map((c) => at(c, 'fixed', 'smaller')), [-1, -1, -1])
  assert.deepEqual(['compact', 'medium', 'extra'].map((c) => at(c, 'fixed', 'larger')), [1, 1, 1])
  assert.deepEqual(['compact', 'medium', 'extra'].map((c) => at(c, 'auto', 'larger')), [0, 1, 2])
  assert.deepEqual(['compact', 'medium', 'extra'].map((c) => at(c, 'auto', 'smaller')), [-2, -1, 0])
  assert.equal(sizeShift(), 0)
})

test('compact draws every tile one size smaller (L to M, M to S, S stays S), extra-wide one larger, a card without that size keeps the nearest it offers', () => {
  // cpu offers s, m, l
  assert.deepEqual(['s', 'm', 'l'].map((k) => shownSizeKey('cpu', {}, k, -1)), ['s', 's', 'm'])
  assert.deepEqual(['s', 'm', 'l'].map((k) => shownSizeKey('cpu', {}, k, 1)), ['m', 'l', 'l'])
  // a card with a large layout offers all of them, so the shift lands on a neighbour
  assert.deepEqual(['m', 'l'].map((k) => shownSizeKey('hero', {}, k, -1)), ['s', 'm']) // 本主机 has a square since round 31: compact draws 中 as 方形
  assert.deepEqual(['s', 'm'].map((k) => shownSizeKey('vdd', {}, k, 1)), ['m', 'm']) // the virtual display has no large layout: it stops at M
  assert.equal(shownSizeKey('cpu', {}, 's', 2), 'l')
  assert.equal(shownSizeKey('hero', {}, 's', 0), 's', 'a 方形 saved for 本主机 draws its 方形')
})

test('the saved sizes are not touched: shift 0 (fixed, or medium) draws exactly what was saved', () => {
  for (const id of Object.keys(SIZE_TABLE)) for (const key of Object.keys(SIZE_TABLE[id].sizes)) {
    if (!sizesOf(id, {}).sizes[key]) continue // a size the card does not offer (it draws one view at every size)
    assert.equal(shownSizeKey(id, {}, key, 0), key)
    assert.deepEqual(boxOf(id, {}, key, 0), boxOf(id, {}, key))
  }
  // turning adaptive off gives the saved sizes back in every size class
  for (const sizeClass of ['compact', 'medium', 'extra']) assert.equal(sizeShift({ sizeClass, tiles: 'fixed', density: 'standard' }), 0)
})

// the home with every card at its saved size (a mix of sizes) in the window sizes of the team's list
const SAVED = { hero: 'l', cpu: 'm', gpu: 'l', bitrate: 's', fps: 'm', memory: 'l', devices: 's', vdd: 'm', encoder: 'm', display: 's', 'gamepad-type': 'l', guide: 'm', download: 'l', table: 'l', apps: 'l', sponsor: 'm' }
const WINDOWS = [[360, 740, 360], [480, 800, 480], [1440, 900, 1440 - 96 - 340], [2560, 1080, 2560 - 96 - 360]] // window w, h, the width of the home's container

test('no overflow with adaptive on at 360, 480, 1440 and 2560 x 1080: every card sits inside the columns and no two overlap', () => {
  for (const [w, h, container] of WINDOWS) {
    const { units } = gridModeOf(container)
    const shift = sizeShift({ sizeClass: sizeClassOf(w, h), tiles: 'auto', density: 'standard' })
    const cards = Object.keys(SAVED).map((id) => ({ id, ...boxOf(id, {}, SAVED[id], shift), cls: 'tile' }))
    for (const c of cards) assert.ok(c.span >= 1 && c.span <= 8 && c.rows >= 1, `${w}: ${c.id}`)
    const { placed } = packDash(cards, units)
    const taken = new Set()
    for (const [id, p] of placed) {
      assert.ok(p.col >= 0 && p.col + p.span <= units, `${w}: ${id} leaves the ${units} columns (${p.col} + ${p.span})`)
      for (let r = 0; r < p.rows; r++) for (let x = p.col; x < p.col + p.span; x++) { const key = `${p.row + r}:${x}`; assert.ok(!taken.has(key), `${w}: ${id} overlaps at ${key}`); taken.add(key) }
    }
    assert.equal(placed.size, cards.length)
  }
})

test('the density is kept normalised; the old adaptive / fixed setting is gone and a stored one is ignored', () => {
  assert.equal(normalize(null).tileDensity, 'standard')
  assert.equal(normalize({ tileDensity: 'larger' }).tileDensity, 'larger')
  assert.equal(normalize({ tileDensity: 'y' }).tileDensity, 'standard')
  assert.ok(!('tiles' in normalize({ tiles: 'fixed' })), 'a saved `tiles` is not carried: the packer draws every size from effectiveSize, nothing adapts by a shift any more')
  assert.ok(!('tiles' in normalize(null)))
  const picker = fs.readFileSync(new URL('../src/vue/MAppearance.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(picker, /tilesAuto|tilesFixed|tilesNote|s\.tiles\b/)
})

test('the generic small tile takes the tile row height (its anatomy has three lines) and so does a short content tile; the cards with a layout of their own keep their class', () => {
  // generic small (no layout of its own at small): the tile class, whatever the card's own class is
  assert.equal(boxOf('unlisted', { cls: 'card', sizes: { s: [2, 1], m: [4, 1] }, size: 'm' }, 's').cls, 'tile')
  assert.equal(boxOf('unlisted', { cls: 'card', sizes: { m: [4, 1] }, size: 'm' }, 's').cls, 'card', 'a size the tile does not have is not drawn: its smallest one is')
  // a catalogue widget with a short content (rows, chips, a control): the tile class at every size, so no 190 px row is left mostly empty
  const own = { cls: 'card', sizes: { s: [2, 1], m: [4, 1], l: [4, 2] }, size: 's', data: { type: 'rows', rows: [{ title: 'a', value: 'b' }] } }
  for (const k of ['s', 'm', 'l']) assert.equal(boxOf('x', own, k).cls, 'tile')
  // a chart keeps the card row height; the pairing card is a strip at small and shares the host card row at medium and large
  assert.equal(boxOf('x', { ...own, data: { type: 'chart' } }, 'm').cls, 'card')
  const pair = { cls: 'hero', sizes: { s: [2, 1], m: [4, 1], l: [4, 2] }, size: 'm', data: { type: 'pair' } }
  assert.deepEqual([boxOf('pair', pair, 's').cls, boxOf('pair', pair, 'm').cls, boxOf('pair', pair, 'l').cls], ['tile', 'hero', 'hero'])
})

test('the default size of the pairing card is medium', async () => {
  const { DEFAULT_SIZES } = await import('../src/vue/homeCatalogueMore.js')
  assert.equal(DEFAULT_SIZES.pair, 'm')
})

test('a card with nothing in it yet is a slim strip at its smallest size; a control strip is not shrunk by a compact window', () => {
  assert.ok(hasNoData({ type: 'lines', rows: [] }) && hasNoData({ type: 'rows', rows: [] }) && hasNoData({ type: 'apps', items: [] }))
  assert.ok(!hasNoData({ type: 'rows', big: '12', rows: [] }) && !hasNoData({ type: 'chart' }) && !hasNoData(null))
  const empty = { cls: 'card', sizes: { s: [2, 1], m: [4, 1], l: [8, 1] }, size: 's', data: { type: 'lines', rows: [] } }
  assert.deepEqual([boxOf('x', empty, 's').cls, boxOf('x', empty, 'm').cls, boxOf('x', empty, 'l').cls], ['strip', 'strip', 'strip'], 'nothing to show yet: a slim strip with its empty text, at its smallest size')
  const strip = { cls: 'strip', sizes: { m: [4, 1], l: [8, 1] }, size: 'm' }
  assert.equal(shownSizeKey('gamepad-type', strip, undefined, -1), 'strip')
  assert.equal(shownSizeKey('gamepad-type', strip, 'xl', 0), 'strip', 'a size above its ladder was its control row in the builds before the ladder')
  assert.equal(shownSizeKey('x', { cls: 'card', sizes: { s: [2, 1], m: [4, 1] }, size: 'm' }, undefined, -1), 's')
})

test('one size standard: every tile has the same boxes, whatever its table says, and XL is only ever the person\'s choice', () => {
  const standard = { s: [2, 1], m: [4, 1], l: [4, 2], xl: [8, 2], strip: [4, 1] }
  const cards = [
    { cls: 'card', sizes: { s: [2, 1], m: [4, 1] }, size: 's', data: { type: 'rows', big: '12', rows: [{ title: 'a', value: 'b' }] } },
    { cls: 'card', sizes: { s: [3, 1], m: [6, 1], l: [8, 1] }, size: 'm' }, // a table asking for its own spans is not obeyed
    { cls: 'hero', sizes: { m: [4, 2], l: [8, 2] }, size: 'm' },
    { cls: 'strip', sizes: { m: [4, 1], l: [8, 1] }, size: 'm' },
  ]
  for (const card of cards) {
    // the box of a size is the standard one for every card, whatever spans its old table names
    const offered = Object.keys(sizesOf('x', card).sizes)
    for (const key of offered) assert.deepEqual(sizesOf('x', card).sizes[key], standard[key])
    for (const key of offered) { const [span, rows] = standard[key]; assert.deepEqual([boxOf('x', { ...card, hasDetail: true }, key).span, boxOf('x', card, key).rows], [span, rows], key) }
  }
  // an unlisted card offers the sizes its old table names (no 特大: that needs a view of its own)
  assert.deepEqual(Object.keys(sizesOf('x', cards[1]).sizes), ['s', 'm', 'l'])
  // the adaptive shift and a promotion never reach XL; the saved XL stays
  // (a card that offers them: cards[1] has a large layout; cards[0] stops at M)
  assert.equal(shownSizeKey('clients-paired', {}, 'l', 1), 'l')
  assert.equal(shownSizeKey('clients-paired', {}, 'm', 2), 'l')
  assert.equal(shownSizeKey('clients-paired', {}, 'xl', 0), 'xl')
  assert.equal(shownSizeKey('clients-paired', {}, 'xl', -1), 'l')
  assert.equal(shownSizeKey('x', cards[0], 'm', 2), 'm')
  assert.equal(viewKeyOf('xl'), 'xl', '特大 draws its own view, never the 大 one stretched')
})
