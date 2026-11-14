import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICONS } from '../src/icons/icons.js'
import { NAMES } from '../src/icons/names.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))

test('every icon of the list was extracted and has a path', () => {
  for (const name of NAMES) assert.ok(ICONS[name]?.d?.length > 20, `${name} is missing from icons.js`)
})

test('icons named literally in the package and the gallery exist', () => {
  const used = new Set()
  for (const file of [...walk('src/vue'), ...walk('gallery')].filter((f) => /\.(vue|js)$/.test(f))) {
    const text = read(file)
    for (const m of text.matchAll(/(?<![:@\w-])icon=["']([a-z0-9_]+)["']/g)) used.add(m[1])
    for (const m of text.matchAll(/<MIcon[^>]*?\sname=["']([a-z0-9_]+)["']/g)) used.add(m[1])
  }
  for (const name of used) assert.ok(ICONS[name], `${name} is used but not in the icon set`)
})

test('tokens.css carries both schemes, the full shape scale and every spring', () => {
  const css = read('src/tokens/tokens.css')
  assert.match(css, /\[data-bs-theme='dark'\]/)
  for (const step of ['none', 'extra-small', 'small', 'medium', 'large', 'large-increased', 'extra-large', 'extra-large-increased', 'extra-extra-large', 'full']) {
    assert.ok(css.includes(`--md-sys-shape-corner-${step}:`), step)
  }
  for (const spring of ['fast-spatial', 'default-spatial', 'slow-spatial', 'fast-effects', 'default-effects', 'slow-effects']) {
    assert.match(css, new RegExp(`--m-spring-${spring}: linear\\(`))
    assert.match(css, new RegExp(`--m-spring-${spring}-duration: \\d+ms`))
  }
  assert.match(css, /--md-sys-color-success-container:/)
})

test('the stylesheets only read tokens that tokens.css defines', () => {
  const defined = new Set([...read('src/tokens/tokens.css').matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]))
  const own = new Set()
  for (const file of walk('src/css').filter((f) => f.endsWith('.css'))) {
    for (const m of read(file).matchAll(/(--m-[a-z0-9-]+):/g)) own.add(m[1])
  }
  const missing = new Set()
  for (const file of [...walk('src/css'), ...walk('src/vue')].filter((f) => /\.(css|vue)$/.test(f))) {
    for (const m of read(file).matchAll(/var\((--(?:m|md-sys)-[a-z0-9-]+)/g)) {
      if (!defined.has(m[1]) && !own.has(m[1])) missing.add(`${m[1]} (${file})`)
    }
  }
  const allowed = (v) => /--m-(loading-color|size|item-radius|btn-bg|btn-fg|btn-radius|hero-|wallpaper|scrim-light|scrim-dark|wp-blur|ap-wall|on-surface-variant|rail-w|caption-h|fab-lift|panel-clip|content-x|content-r|modal-clip|content-y|content-b|seam-r|bar-h)/.test(v) || /--md-sys-color-(on-)?(shadow)/.test(v)
  const real = [...missing].filter((v) => !allowed(v))
  assert.deepEqual(real, [], 'undefined tokens: ' + real.join(', '))
})
