// The offline page lets the wallpaper be: its words sit on a card of their own, nothing is painted over the picture around them
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))

test('the offline page paints no radial scrim over the wallpaper; its copy is a frosted tonal card', () => {
  const css = read('src/css/offline.css')
  assert.doesNotMatch(css, /radial-gradient/)
  assert.doesNotMatch(css, /\.m-offline::before/)
  assert.match(css, /\.m-offline__copy \{[^}]*background: color-mix\(in srgb, var\(--md-sys-color-surface-container\) 76%, transparent\)/)
  assert.match(css, /@supports \(backdrop-filter: blur\(1px\)\) \{ \.m-offline__copy \{ backdrop-filter: blur\(16px\)/)
  assert.match(css, /@supports not \(backdrop-filter: blur\(1px\)\)/, 'a plainer card where the frost is unknown')
  assert.match(css, /--m-offline-accent: color-mix\(in srgb, var\(--md-sys-color-primary-text\) 45%, var\(--md-sys-color-on-surface\)\)/)
})

test('no stylesheet of the package uses a radial gradient as a scrim: the one that remains draws the corner of the seam', () => {
  const found = walk('src/css').filter((f) => f.endsWith('.css')).filter((f) => /radial-gradient/.test(read(f)))
  assert.deepEqual(found.map((f) => path.basename(f)), ['layout.css'])
  const lines = read('src/css/layout.css').split('\n').filter((l) => /radial-gradient/.test(l))
  assert.equal(lines.length, 1); assert.match(lines[0], /^\.m-scene__corner /, 'the corner of the rounded seam, not a layer over the picture')
})
