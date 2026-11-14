import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { useFlip } from '../src/vue/flipGroup.js'
import { readDash } from './dashSource.js'

// Perf: a TransitionGroup reads the position of every child and clones its first child into the grid and removes it again after EVERY update of the page (hasCSSTransform); on an overview whose live values tick
// that was a remove and an add of the hero cell twice a second, each with a layout pass. Neither the overview grid nor the gallery grid is a TransitionGroup: the tiles slide by FLIP, which touches nothing
// unless the arrangement changes.
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('the overview and the gallery are plain grids that slide their children by FLIP only when the arrangement changes', () => {
  const dash = readDash(), gal = read('src/vue/MTileGallery.vue')
  assert.doesNotMatch(dash, /<TransitionGroup|import \{[^}]*TransitionGroup/); assert.doesNotMatch(gal, /<TransitionGroup|import \{[^}]*TransitionGroup/)
  assert.match(dash, /<div class="m-dash__grid"/)
  assert.match(dash, /useFlip\(\{ root, select: '\.m-dash__cell', keyOf: \(el\) => el\.dataset\.card, signature: \(\) => flipSig\.value, enabled: \(\) => \(edit\.value \|\| planMoving\.value\) && !resizing\.value && !resizedWithin\(300\), skip: \(el\) => el\.classList\.contains\('is-dragging'\), clean: \(\) => !edit\.value \}\)/)
  assert.match(dash, /const flipSig = computed\(\(\) => blocks\.value\.map/) // the places, not the live values
  assert.match(gal, /<div ref="grid" class="m-gal__grid"/)
})

test('flipGroup reads and animates only when the signature changes, in the pre and post flush of that change', () => {
  const src = read('src/vue/flipGroup.js')
  assert.match(src, /watch\(signature, \(\) => \{[\s\S]*getBoundingClientRect\(\)[\s\S]*\}, \{ flush: 'pre' \}\)/)
  assert.match(src, /\}, \{ flush: 'post' \}\)/)
  assert.doesNotMatch(src, /cloneNode/)
  assert.equal(typeof useFlip, 'function')
})

test('the overview sets the FLIP up after ROW_PX and the blocks it reads (a watcher reads its signature at once)', () => {
  const dash = readDash()
  assert.ok(dash.indexOf('useFlip({ root,') > dash.indexOf('const ROW_PX = computed('), 'useFlip before ROW_PX: Cannot access ROW_PX before initialization')
  assert.ok(dash.indexOf('useFlip({ root,') > dash.indexOf('const blocks = computed('))
})

test('a slide that nobody asked for is played only where it is clean: tiles never meet, come too close or leave the grid on the way; otherwise the cells that moved fade in at their new places', () => {
  const f = fs.readFileSync(new URL('../src/vue/flipGroup.js', import.meta.url), 'utf8')
  assert.match(f, /function crosses\(items\)/); assert.match(f, /const GAP = 6/)
  assert.match(f, /if \(clean\(\) && moves\.length\)/); assert.match(f, /if \(crosses\(items\)\)/)
  assert.doesNotMatch(f, /translateY\(28px\)/, 'an arriving cell does not travel over its neighbour')
})
