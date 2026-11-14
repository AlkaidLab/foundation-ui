import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ICONS } from '../src/icons/icons.js'
import { NAMES } from '../src/icons/names.js'
import { DEFAULT_ROOTS, scanResult, isSymbol } from '../scripts/scan-icons.mjs'

// The glyphs are drawn from icons.js (SVG paths, no icon font): a name that is not in it draws nothing. The set is built from names.js and from everything the code asks for in this package,
// the control panel and the Web UI (scripts/scan-icons.mjs, run by `npm run build:icons`); this test fails when a name that is used is not in the set or is not a Material Symbol at all.
test('every icon name the packages, the panel and the Web UI ask for is a glyph of the set', () => {
  const { names, unknown } = scanResult()
  assert.deepEqual(unknown, [], 'names that are not Material Symbols: ' + unknown.map((u) => `${u.name} (${u.files[0]})`).join(', '))
  const missing = names.filter((n) => !ICONS[n])
  assert.deepEqual(missing, [], 'used but not in icons.js (run npm run build:icons): ' + missing.join(', '))
  assert.ok(names.length > 150, 'the scan finds the names (it found ' + names.length + ')')
})

test('the names listed by hand are all in the set, and every glyph has a drawing', () => {
  for (const n of NAMES) { assert.ok(isSymbol(n), `${n} is not a Material Symbol`); assert.ok(ICONS[n], `${n} is not in icons.js`) }
  for (const [name, g] of Object.entries(ICONS)) {
    assert.ok(typeof g.d === 'string' && g.d.length > 20 && /^[Mm]/.test(g.d.trim()), `${name} has no drawing`)
    if (g.f !== undefined) assert.ok(typeof g.f === 'string' && g.f.length > 20, `${name} has no filled drawing`)
  }
})

test('the glyphs a page names by data (the ones the scan cannot see) are collected at run time and a sweep can read them', () => {
  const icon = fs.readFileSync(new URL('../src/vue/MIcon.vue', import.meta.url), 'utf8')
  assert.match(icon, /__mIconMissing/)
  assert.match(icon, /console\.warn\(`\[m-icon\] no glyph named/)
})

test('the scan reads the roots of this package and of the products beside it', () => {
  assert.ok(DEFAULT_ROOTS.length >= 3 && DEFAULT_ROOTS[0].endsWith('src'))
})

test('a name that is not a symbol is found in a choice between two icons, also when the condition has commas', async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const { scanResult } = await import('../scripts/scan-icons.mjs')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-'))
  fs.writeFileSync(path.join(dir, 'x.js'), "export const a = { icon: ['android', 'ios'].includes(os) ? 'smartphone' : 'computer', tone: ok ? 'on' : 'off' }\n")
  fs.writeFileSync(path.join(dir, 'y.vue'), '<template><MIcon :icon="big ? \'zzz_none\' : \'home\'" /></template>\n')
  const { names, unknown } = scanResult([dir])
  assert.deepEqual(unknown.map((u) => u.name).sort(), ['smartphone', 'zzz_none'])
  assert.ok(names.includes('computer') && names.includes('home'))
  assert.ok(!unknown.some((u) => u.name === 'on' || u.name === 'off'), 'a tone is not an icon')
})

// "Not a Material glyph": every drawing of the set is the file of Material Symbols (Rounded, weight 400) byte for byte, outline and fill, so no hand-drawn or older-set (Material Icons) shape is in it.
test('every glyph of the set is the Material Symbols Rounded 400 drawing, byte for byte', async () => {
  const dir = new URL('../node_modules/@material-symbols/svg-400/rounded/', import.meta.url)
  const d = (svg) => svg && [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ')
  const read = (file) => (fs.existsSync(new URL(file, dir)) ? fs.readFileSync(new URL(file, dir), 'utf8') : null)
  const differing = []
  for (const [name, g] of Object.entries(ICONS)) {
    if (d(read(`${name}.svg`)) !== g.d) differing.push(`${name} (outline)`)
    const fill = read(`${name}-fill.svg`)
    if (fill && d(fill) !== g.f) differing.push(`${name} (fill)`)
  }
  assert.deepEqual(differing, [])
})

test('the 键盘输入 tile (and 鼠标输入) draw the Material Symbols keyboard (mouse) through MIcon', () => {
  const more = fs.readFileSync(new URL('../src/vue/homeCatalogueMore.js', import.meta.url), 'utf8')
  assert.ok(more.includes("d['ctl-keyboard'] = sw('ctl-keyboard', 'keyboard', 'keyboard')"))
  assert.ok(more.includes("d['ctl-mouse'] = sw('ctl-mouse', 'mouse', 'mouse')"))
  const tile = fs.readFileSync(new URL('../src/vue/tiles/TileToggleB3.vue', import.meta.url), 'utf8')
  assert.ok(tile.includes('<MIcon :name="d.icon" />'), 'the glyph of a switch tile is an MIcon, not markup of its own')
  assert.ok(ICONS.keyboard && ICONS.mouse)
})
