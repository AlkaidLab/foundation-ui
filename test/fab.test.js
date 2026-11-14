import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fabLift } from '../src/nav/fablift.js'

const dock = { left: 800, right: 1000, top: 800, bottom: 856 }

test('nothing under the buttons: no lift', () => {
  assert.equal(fabLift(dock, []), 0)
  assert.equal(fabLift(dock, [{ left: 100, right: 400, top: 800, bottom: 860 }]), 0, 'a bar that is not above them in the row')
  assert.equal(fabLift(dock, [{ left: 700, right: 900, top: 880, bottom: 940 }]), 0, 'a bar below them')
})

test('a bar of unsaved changes or a snackbar over the buttons pushes them above it', () => {
  const bar = { left: 600, right: 1100, top: 810, bottom: 866 }
  const lift = fabLift(dock, [bar])
  assert.equal(lift, 856 - 810 + 12)
  assert.ok(dock.bottom - lift <= bar.top - 12, 'the gap is kept')
})

test('two bars one above the other: above both', () => {
  const lift = fabLift(dock, [{ left: 700, right: 1100, top: 810, bottom: 860 }, { left: 700, right: 1100, top: 760, bottom: 800 }])
  assert.ok(dock.bottom - lift <= 760 - 12, `lift ${lift}`)
})

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')

test('the dock is a child of the scene at the content pane edge, not of the list pane', () => {
  const scene = read('../src/vue/MScene.vue')
  const css = read('../src/css/layout.css')
  assert.ok(/class="m-scene__fabs"/.test(scene) && !/list-fab/.test(scene))
  assert.ok(/\.m-scene__fabs \{[^}]*right: calc\(var\(--c-sup, 0px\) \+ 20px\)[^}]*bottom: calc\(var\(--m-content-b, 0px\) \+ 20px\)/.test(css))
  assert.ok(/\.m-scene__fabs\.is-tight \.m-fab--extended > span \{ display: none/.test(css), 'the round button in a very narrow window')
})
