import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULTS, normalize, legacyDesktopLook } from '../src/appearance/appearance.js'
import { applyInterfaceLook } from '../src/appearance/apply.js'

// 界面 of 个性化: two looks of the old desktop's theme editor (card corner, text size)
test('the looks are clamped to the old editor ranges and default to the design as it is', () => {
  assert.deepEqual([DEFAULTS.cardCorner, DEFAULTS.textSize], [28, 14])
  const n = normalize({ cardCorner: 40, textSize: 9 })
  assert.deepEqual([n.cardCorner, n.textSize], [32, 12])
  assert.equal(normalize(null).cardCorner, 28)
})

test('the old desktop corner and text size are read from its theme record', () => {
  assert.deepEqual(legacyDesktopLook({ preset: 'cyber', vars: { '--fd-card-radius': '20px', '--fd-font-size': '16px', '--fd-grid-visible': '1' } }), { cardCorner: 20, textSize: 16 })
  assert.deepEqual(legacyDesktopLook({ vars: { '--fd-card-radius': 'big' } }), {})
  assert.deepEqual(legacyDesktopLook(null), {})
})

test('a look changes the page only away from its default', () => {
  const props = new Map()
  const root = { dataset: {}, style: { setProperty: (k, v) => props.set(k, v), removeProperty: (k) => props.delete(k) } }
  applyInterfaceLook(root, normalize(null))
  assert.equal(root.dataset.cardCorner, undefined); assert.equal(root.dataset.textSize, undefined); assert.equal(props.size, 0)
  applyInterfaceLook(root, normalize({ cardCorner: 12, textSize: 16 }))
  assert.equal(props.get('--m-card-corner'), '12px'); assert.equal(props.get('--m-text-scale'), String(Math.round((16 / 14) * 10000) / 10000))
  assert.deepEqual([root.dataset.cardCorner, root.dataset.textSize], ['12', '16'])
  applyInterfaceLook(root, normalize(null))
  assert.equal(props.size, 0); assert.equal(root.dataset.cardCorner, undefined)
})

test('a stored background grid or scanlines of an earlier version is ignored and leaves no trace', () => {
  const old = normalize({ cardCorner: 20, bgGrid: true, scanlines: true })
  assert.equal(old.cardCorner, 20)
  assert.ok(!('bgGrid' in old) && !('scanlines' in old) && !('bgGrid' in DEFAULTS) && !('scanlines' in DEFAULTS))
  const root = { dataset: {}, style: { setProperty() {}, removeProperty() {} } }
  applyInterfaceLook(root, { ...old, bgGrid: true, scanlines: true })
  assert.ok(!('bgGrid' in root.dataset) && !('scanlines' in root.dataset))
  const css = readFileSync(new URL('../src/css/look.css', import.meta.url), 'utf8'), texts = readFileSync(new URL('../src/vue/appearanceTexts.js', import.meta.url), 'utf8'), page = readFileSync(new URL('../src/vue/MAppearance.vue', import.meta.url), 'utf8')
  for (const source of [css, texts, page]) assert.doesNotMatch(source, /bgGrid|scanlines|bg-grid|背景网格|扫描线/i)
  assert.doesNotMatch(css, /\.m-wp/)
})

test('the preview of 个性化 stays in the flow: the sections never pass under it', () => {
  const css = readFileSync(new URL('../src/css/appearance.css', import.meta.url), 'utf8')
  const rules = [...css.matchAll(/\.m-ap__preview\s*\{[^}]*\}/g)].map((m) => m[0])
  assert.ok(rules.length > 0)
  for (const rule of rules) assert.doesNotMatch(rule, /position:\s*(sticky|fixed)/)
})

test('the stylesheet scales every type token of tokens.css and is part of all.css', () => {
  const look = readFileSync(new URL('../src/css/look.css', import.meta.url), 'utf8'), tokens = readFileSync(new URL('../src/tokens/tokens.css', import.meta.url), 'utf8')
  const names = [...new Set([...tokens.matchAll(/^\s*(--m-(?:display|headline|title|body|label)-[\w-]+):\s*\d+\s+\d+px\//gm)].map((m) => m[1]))]
  for (const n of names) assert.match(look, new RegExp(`${n}: \\d+ calc\\(`), n)
  assert.match(readFileSync(new URL('../src/css/all.css', import.meta.url), 'utf8'), /@import '\.\/look\.css';/)
})

test('the list pane is a setting of the record: merged by default, one when chosen, anything else (an old step) is merged', () => {
  assert.equal(DEFAULTS.listStyle, 'merged')
  assert.equal(normalize({ listStyle: 'one' }).listStyle, 'one')
  assert.equal(normalize({ listStyle: 'step' }).listStyle, 'merged')
  assert.equal(normalize({}).listStyle, 'merged')
  const root = { dataset: {}, style: { setProperty() {}, removeProperty() {} } }
  applyInterfaceLook(root, normalize({ listStyle: 'one' }))
  assert.equal(root.dataset.list, 'one')
  applyInterfaceLook(root, normalize({}))
  assert.equal(root.dataset.list, 'merged')
})

test('the checks of the colour swatches are outlined, not shadowed: a CSS filter on the page made the change of colours 60 ms longer', async () => {
  const fs = await import('node:fs')
  const css = ['appearance.css', 'colourstyle.css'].map((f) => fs.readFileSync(new URL(`../src/css/${f}`, import.meta.url), 'utf8')).join('\n')
  const swatchRules = css.split('\n').filter((l) => /m-ap__swatch/.test(l) && /\.m-icon/.test(l) && !/--wall/.test(l))
  assert.ok(swatchRules.length >= 3)
  assert.ok(swatchRules.every((l) => !/drop-shadow|blur\(/.test(l)), 'no filter function on a check')
  assert.match(css, /\.m-ap__swatch \.m-icon \* \{ paint-order: stroke;/)
})
