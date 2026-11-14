import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PAGE_ENTER, playPageEnter } from '../src/nav/pageEnter.js'

const element = () => { const calls = []; const running = []; return { calls, running, getAnimations: () => running, animate(k, o) { const a = { id: '', cancel() { this.cancelled = true } }; calls.push({ k, o, a }); running.push(a); return a } } }

test('one enter for every page: a fade-through from a slightly smaller size, the time and curve the column always had', () => {
  assert.deepEqual(PAGE_ENTER.keyframes, [{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }])
  assert.deepEqual(PAGE_ENTER.options, { duration: 210, easing: 'cubic-bezier(.05, .7, .1, 1)' })
  const css = fs.readFileSync(new URL('../src/css/pageloading.css', import.meta.url), 'utf8')
  assert.match(css, /@keyframes m-page-in \{ from \{ opacity: 0; transform: scale\(\.985\); \} \}/)
  assert.match(css, /\.m-page__column \{ animation: m-page-in 210ms cubic-bezier\(\.05, \.7, \.1, 1\) backwards; \}/)
})

test('playPageEnter plays it, restarts one that runs, and does nothing without an element, without animations, or with reduced motion', () => {
  assert.equal(playPageEnter(null), null); assert.equal(playPageEnter({}), null)
  const el = element()
  const first = playPageEnter(el); assert.equal(first.id, 'm-page-enter'); assert.equal(el.calls.length, 1)
  playPageEnter(el); assert.equal(first.cancelled, true, 'the running one is restarted'); assert.equal(el.calls.length, 2)
  globalThis.document = { documentElement: { dataset: { motion: 'reduced' } } }
  try { assert.equal(playPageEnter(element()), null) } finally { delete globalThis.document }
  globalThis.document = { documentElement: { dataset: { motion: 'full' } } }; globalThis.matchMedia = () => ({ matches: true })
  try { assert.ok(playPageEnter(element()), 'full motion plays it even where the system asks for less') } finally { delete globalThis.document; delete globalThis.matchMedia }
})

test('MScene plays it for the detail pane when the destination changes, and a column inside a scene does not play a second one', () => {
  const scene = fs.readFileSync(new URL('../src/vue/MScene.vue', import.meta.url), 'utf8')
  assert.match(scene, /watch\(\(\) => detailEntry\.value\?\.key, \(key, before\) => \{ if \(key && before !== undefined && key !== before\) nextTick\(\(\) => playPageEnter\(detailInner\.value\)\) \}\)/)
  assert.match(scene, /<div ref="detailInner" class="m-scene__inner">/)
  assert.match(fs.readFileSync(new URL('../src/css/pageloading.css', import.meta.url), 'utf8'), /\.m-scene__pane \.m-page__column \{ animation: none; \}/)
  assert.match(fs.readFileSync(new URL('../src/vue/index.js', import.meta.url), 'utf8'), /export \{ playPageEnter, PAGE_ENTER \}/)
})
