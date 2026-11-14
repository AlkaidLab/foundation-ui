import test from 'node:test'
import assert from 'node:assert/strict'
import { isResizing, noteResize, resetResizing, resizedWithin, watchResizing } from '../src/nav/resizing.js'

const fakeDoc = () => { const cls = new Set(); return { documentElement: { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), has: (c) => cls.has(c) } }, cls } }

test('resizing: raised in the frame of the first change, dropped in the first frame after one without a change, no timer', async () => {
  const frames = []
  globalThis.requestAnimationFrame = (fn) => frames.push(fn)
  const doc = fakeDoc()
  globalThis.document = doc
  resetResizing(doc.documentElement)
  const seen = []
  watchResizing((v) => seen.push(v))
  assert.equal(isResizing(), false)
  noteResize()
  assert.equal(isResizing(), true, 'on in the same call: before the layout of the frame')
  assert.ok(doc.cls.has('m-resizing'))
  frames.shift()()           // the frame after the change: a change was seen in it, so it stays
  assert.equal(isResizing(), true)
  noteResize()               // the drag goes on
  frames.shift()()
  assert.equal(isResizing(), true)
  frames.shift()()           // no change since the last frame
  assert.equal(isResizing(), false, 'off in the first frame without a change, not after a delay')
  assert.ok(!doc.cls.has('m-resizing'))
  assert.deepEqual(seen, [true, false])
  delete globalThis.requestAnimationFrame; delete globalThis.document
})

test('the stylesheet switches transitions off while the window is resizing', async () => {
  const fs = await import('node:fs')
  const css = fs.readFileSync(new URL('../src/css/layout.css', import.meta.url), 'utf8')
  assert.match(css, /html\.m-resizing \*, html\.m-resizing \*::before, html\.m-resizing \*::after \{ transition: none !important; \}/)
  const scene = fs.readFileSync(new URL('../src/vue/MScene.vue', import.meta.url), 'utf8')
  assert.ok(!/setTimeout\(\(\) => \{ resizing\.value = false \}/.test(scene), 'no settle timer')
  assert.match(scene, /watchPixelRatio\(\(\) => \{ noteResize\(\); read\(\) \}\)/, 'a change of pixel ratio is read in the same frame')
  const fab = fs.readFileSync(new URL('../src/vue/useFabLift.js', import.meta.url), 'utf8')
  assert.match(fab, /addEventListener\('resize', now\)/)
  assert.ok(!/setTimeout/.test(fab), 'no timer in the lift of the buttons')
  const apply = fs.readFileSync(new URL('../src/appearance/apply.js', import.meta.url), 'utf8')
  assert.ok(!/function onResize\(\) \{\n  if \(ticking\)/.test(apply), 'the wallpaper is laid out in the frame of the change')
})

test('resizedWithin: a resize still counts for a moment after it ended (what a sheet or a bar measures late is the resize\'s too); the slide of the overview waits for it', async () => {
  const frames = []
  globalThis.requestAnimationFrame = (fn) => frames.push(fn)
  const doc = fakeDoc(); globalThis.document = doc
  resetResizing(doc.documentElement)
  assert.equal(resizedWithin(300), false, 'nothing resized yet')
  noteResize(); assert.equal(resizedWithin(300), true, 'on')
  frames.shift()(); frames.shift()(); assert.equal(isResizing(), false)
  assert.equal(resizedWithin(300), true, 'it ended just now')
  assert.equal(resizedWithin(0), false, 'with no grace it is over')
  await new Promise((r) => setTimeout(r, 40)); assert.equal(resizedWithin(20), false, 'and over after the grace')
  const src = (await import('node:fs')).readFileSync(new URL('../src/vue/dash/dashEditSheet.js', import.meta.url), 'utf8')
  assert.match(src, /enabled: \(\) => \(edit\.value \|\| planMoving\.value\) && !resizing\.value && !resizedWithin\(300\)/)
  delete globalThis.requestAnimationFrame; delete globalThis.document
})

test('the overview raises the resize signal for any change of the window size it reads, before it arranges itself for it', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../src/vue/dash/dashPlan.js', import.meta.url), 'utf8')
  assert.match(src, /const onSizes = \(\) => \{ const t = window\.innerHeight, w = window\.innerWidth; if \(t !== tall\.value \|\| w !== wide\.value\) noteResize\(\); tall\.value = t; wide\.value = w \}/)
})
