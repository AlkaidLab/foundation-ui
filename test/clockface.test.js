// 时钟模式 draws the overview's own 方形: the same component and view as the overview (no view of its own), at one design square scaled to its column
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { designUnitPx, columnsOf, UNIT_PX } from '../src/vue/homeSizes.js'
import { readDash } from './dashSource.js'

const source = readDash()
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('a tile of the dock is not marked generic: the tiles/ designs and the small views are drawn exactly as in the overview', () => {
  assert.ok(!/forceGeneric/.test(source), 'no tile of the dock is forced to the generic small view')
  for (const f of ['src/vue/MDashCardView.vue', 'src/vue/tiles/registry.js']) assert.ok(!/forceGeneric/.test(read(f)), `${f} has no branch for a generic dock tile`)
  assert.match(source, /const dockBox = \(c, u\) => \(\{ \.\.\.c, \.\.\.boxIn\(c, 's', u\), size: 's', sizeKey: 's', sizeKeys: \['s'\] \}\)/)
})

test('every dock tile is the one design square, scaled as a whole to the column; the saved sizes are not read', () => {
  assert.match(source, /const dockScale = computed\(\(\) => \{ const design = designUnitPx\(\); const k = dockGrid\.value\.unit \/ design;/)
  assert.match(source, /class="m-dock__face" :style="\{ width: `\$\{dockScale\.design\}px`, height: `\$\{dockScale\.design\}px`, \.\.\.\(dockScale\.k !== 1 \? \{ transform: `scale\(\$\{dockScale\.k\}\)` \} : \{\}\) \}"/)
  assert.match(read('src/css/dash.css'), /\.m-dock__face \{ display: flex; flex: none; transform-origin: 0 0; \}/)
  // the box of a dock tile never asks for the person's size: dockBox is chosen before drawnSize/sizeOf
  assert.match(source, /if \(dockLayout\.value\) return dockBox\(c, u\)\n\s+const key = drawnSize/)
})

test('the design square is always the standard unit (a denser or looser window scales it), and a phone column is at most 1.35 times it', () => {
  assert.equal(designUnitPx(), UNIT_PX)
  assert.equal(designUnitPx('smaller'), UNIT_PX, 'the density never changes what is drawn')
  assert.ok(columnsOf(1000, 'smaller').unit / designUnitPx() < 1, 'a smaller density scales the tile down')
  for (const w of [320, 360, 390, 430, 600, 799]) { const { unit } = columnsOf(w); assert.ok(unit / designUnitPx() <= 1.36 && unit / designUnitPx() >= 0.9, `${w}: k = ${unit / designUnitPx()}`) }
  for (const w of [800, 1280, 1920]) assert.equal(columnsOf(w).unit, designUnitPx(), `${w}: no scale at a desktop width`)
})
