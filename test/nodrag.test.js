import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// fs52: the drag ghost of a link or an image shows its URL. The base style takes them out of the drag unless they ask (draggable="true"), so no component has to remember it.
const base = readFileSync(new URL('../src/css/base.css', import.meta.url), 'utf8')
const all = readFileSync(new URL('../src/css/all.css', import.meta.url), 'utf8')

test('links, images and graphics are not drag sources unless they ask', () => {
  assert.match(base, /:where\(a, img, svg, canvas, video, picture\):not\(\[draggable="true"\]\) \{ -webkit-user-drag: none; user-drag: none; \}/)
  assert.ok(/base\.css/.test(all), 'the base style is part of all.css')
})

test('no component turns a link or image into a drag source by accident', () => {
  const rule = base.match(/:where\(a, img[^{]*\{[^}]*\}/)[0]
  assert.ok(!/auto|element/.test(rule))
})
