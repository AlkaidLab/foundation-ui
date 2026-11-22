// The stack's edit sheet and its button on the tile
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('the reorder handle keeps touch-action none against the global touch-action of buttons (touch.css), so a finger drags the row and the sheet does not scroll', () => {
  const touch = read('src/css/touch.css'); const css = read('src/css/stack.css')
  assert.match(touch, /:is\(button, a\[href\][^)]*\) \{ touch-action: manipulation; \}/, 'the global rule this one must beat')
  assert.match(css, /\.m-stacksheet__list \.m-stacksheet__handle, \.m-stacksheet__list \.m-stacksheet__remove \{ all: unset;[^}]*touch-action: none; \}/, 'two classes: more specific than the :is list (a[href] counts as an element and an attribute)')
})

test('the carried row follows the pointer and the place under it is read without that move', () => {
  const v = read('src/vue/MStackSheet.vue')
  assert.match(v, /transform: `translateY\(\$\{dragDy\}px\) scale\(1\.02\)`, transition: 'none'/)
  assert.match(v, /y < r\.bottom - \(i === dragFrom\.value \? dragDy\.value : 0\)/)
})

test('the add list puts the tiles that can join first', () => {
  assert.match(read('src/vue/MStackSheet.vue'), /\.sort\(\(a, b\) => Number\(b\.ok\) - Number\(a\.ok\)\)/)
})

test('the edit button of a stack stays in the tile\'s corner on one line; on a small tile it is the icon alone with the name as its label', () => {
  const v = read('src/vue/MHomeDash.vue'); const css = read('src/css/stack.css')
  assert.match(v, /class="m-dash__stackbtn" data-stack-edit :aria-label="T\.stackEdit \|\| '编辑轮换组'"/)
  assert.match(css, /\.m-dash__stackbtn \{ position: absolute; z-index: 5; right: 8px; top: 8px;[^}]*white-space: nowrap;/)
  assert.match(css, /\.m-dash__cell\[data-size='s'\] \.m-dash__stackbtn-t \{ display: none; \}/)
})
