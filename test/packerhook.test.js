// The packer takes the size of every tile from effectiveSize (round27-xl, XL7): the saved size is a preference, the window class clamps it, and MHomeDash.vue has no size logic of its own
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { effectiveSize, sizesOf, windowClassOf } from '../src/vue/homeSizes.js'
import { readDash } from './dashSource.js'
const dash = readDash()

test('the overview reads the window class from the window width and draws every box from effectiveSize', () => {
  assert.match(dash, /const windowClass = computed\(\(\) => windowClassOf\(wide\.value\)\)/)
  assert.match(dash, /effectiveSize\(c, asked, windowClass\.value, mode, opts\)/)
  assert.match(dash, /\.\.\.boxIn\(c, key, u\)/, 'the box of the size drawn, in square units')
  assert.match(dash, /SIZE_UNITS\[key\]/)
  assert.match(dash, /pack: \{ dense: true, exact: true \}/, 'a hole is filled by the next tiles, no tile is stretched')
  for (const gone of ['boxOf', 'ROW_PX.value[', 'rowTemplate', 'shownSizeKey', 'sizeShift', 'viewKeyOf', 'sizeClassOf', 'nextSize', 'sizeKeyOf', 'shiftNow']) assert.ok(!dash.includes(gone), `${gone} is not used by the overview any more`)
})

test('the smart plan gets the window class, the gallery and the size chooser list the sizes of that class', () => {
  assert.match(dash, /sizeClass: windowClass\.value/)
  assert.match(dash, /sizesOf\(c\.id, c, windowClass\.value, tall\.value\)\.sizes\[k\]/)
  assert.match(dash, /const sheetBox = .*effectiveSize\(c, sheetKeyOf\(c\), windowClass\.value, 'manual'/)
})

test('the smart fill promotes only from the medium class up, only up to 大, and only through effectiveSize', () => {
  assert.match(dash, /const PROMOTE_TO = \['s', 'm', 'l'\]/)
  assert.match(dash, /!lift \|\| !smart\.value \|\| windowClass\.value === 'compact'/)
  assert.match(dash, /promote: smart\.value && !light && windowClass\.value !== 'compact'/)
  assert.match(dash, /unitRows: true/, 'the plan is made for the packer that draws square units')
})

test('a suggestion is never a tile that is on the overview (by id or by name), and there are at most two', () => {
  assert.match(dash, /const MAX_GHOSTS = 2/)
  assert.match(dash, /named\.has\(name\)/)
  assert.match(dash, /if \(out\.length >= MAX_GHOSTS\) break/)
})

test('the smart overview shows one tile of a name', () => {
  assert.match(dash, /const byName = \(list\) =>/)
  assert.match(dash, /byName\(plan\.value\.visible\.map/)
})

test('a suggested tile has no preview of the tile under it: its icon, its name and the two buttons', () => {
  assert.match(dash, /<div v-if="!c\.ghost" class="m-dash__body"/)
  assert.match(dash, /class="m-dash__gicon"/)
  const css = fs.readFileSync(new URL('../src/css/dash.css', import.meta.url), 'utf8')
  assert.doesNotMatch(css, /is-ghost \.m-dash__body \{ opacity/)
})

test('a phone class never draws what only a desktop offers, whatever was saved', () => {
  const tile = { id: 'hero', kind: 'hero', cls: 'hero', data: { type: 'rows', rows: [1, 2, 3, 4, 5, 6].map((n) => ({ title: String(n), value: 'v' })) } }
  const compact = effectiveSize(tile, 'xl', windowClassOf(412), 'manual', { height: 900 })
  assert.ok(['s', 'm'].includes(compact) || Object.keys(sizesOf(tile.id, tile, 'compact', 900).sizes).includes(compact))
  assert.equal(effectiveSize(tile, 'xl', windowClassOf(412), 'manual', { height: 900 }), effectiveSize(tile, 'xl', windowClassOf(412), 'smart', { height: 900 }), 'the same clamp in both modes')
})
