// One selected-state rule (「那个选中描边怎么还在」): a selected card, choice, swatch, chip-like control or row is shown by its container colour (layout.css --m-sel-fill, or the spec's
// secondary container for chips and segmented buttons), a check where there is room for one and a heavier label, never by a border, outline or box-shadow ring wider than 1 px.
// Material 3: filter chips and segmented buttons (selected = secondary container, the outline of the unselected control goes, a check replaces the icon), checked cards (a checked icon and a tinted
// container, the stroke stays at the outlined card's 1 dp), interaction states (selected is a container; focus is the separate ring).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { selectedRings, selectedRingsIn } from '../scripts/selected-ring.mjs'
import { fileURLToPath } from 'node:url'

const src = (p) => new URL(`../src/${p}`, import.meta.url)
const read = (p) => readFileSync(src(p), 'utf8')

test('the scanner finds the rings it is meant to find', () => {
  const bad = selectedRings(`
.a.is-on { box-shadow: inset 0 0 0 2px var(--c); }
.b[aria-checked='true'] { outline: 3px solid red; }
.c.selected { border: 2px solid var(--x); }
.d { &.is-selected { box-shadow: 0 0 0 3px var(--s), 0 0 0 5px var(--p); } }
.g { border: 2px solid transparent; } .g.is-on { border-color: var(--p); }
@media (min-width: 1px) { .e[aria-pressed="true"] { outline-width: 2px; } }`)
  assert.deepEqual(bad.map((b) => b.selector).sort(), ['.a.is-on', ".b[aria-checked='true']", '.c.selected', '.d.is-selected', ".e[aria-pressed=\"true\"]", '.g.is-on'].sort())
})

test('the scanner leaves alone what is not a selected ring', () => {
  assert.deepEqual(selectedRings(`
.a.is-on { box-shadow: inset 0 0 0 1px var(--c); border: 1px solid var(--c); outline: 0; }
.b[aria-checked='true'] { box-shadow: none; border: 2px solid transparent; box-shadow: 0 8px 24px rgb(0 0 0 / .2); }
.c.is-on:focus-visible { outline: 2px solid var(--p); outline-offset: 2px; }
.d:focus-visible { box-shadow: 0 0 0 3px var(--p); }
.e { box-shadow: inset 0 0 0 3px var(--p); }
.f.is-live { box-shadow: 0 0 0 3px var(--p); }
.h { border: 2px solid var(--o); } .h.is-on { background: var(--p); border-color: var(--p); }
.i { border: 1px solid var(--o); } .i.is-on { border-color: var(--p); }`), [])
})

test('no selected-state rule of the package draws a ring wider than 1 px', () => {
  const found = selectedRingsIn(fileURLToPath(new URL('../src/', import.meta.url)))
  assert.deepEqual(found.map((f) => `${f.file.split('/src/')[1]}:${f.line} ${f.selector} { ${f.rings.join('; ')} }`), [])
})

test('the selected container is one token and the check one mask; the focus ring stays', () => {
  const layout = read('css/layout.css')
  assert.match(layout, /--m-check-mask: url\("data:image\/svg\+xml,/)
  assert.match(layout, /--m-sel-ring-w: 0px/)
  for (const [file, selector] of [['settings.css', '.m-cards__card.is-on'], ['tray.css', '.m-trayset__choice.is-on'], ['appearance.css', '.m-ap__source.is-on'], ['clock.css', '.m-ap__face.is-on']]) {
    const css = read(`css/${file}`)
    const i = css.indexOf(`${selector} {`)
    assert.ok(i >= 0, selector)
    assert.match(css.slice(i, css.indexOf('}', i)), /background: var\(--m-sel-fill\)/, `${selector} is the selected container`)
  }
  assert.match(read('css/settings.css'), /\.m-cards__card:focus-visible \{ outline: 2px solid var\(--md-sys-color-primary\)/, 'focus is its own ring')
  assert.match(read('css/tray.css'), /\.m-trayset__choice:focus-visible \{ outline: 2px solid/)
})

test('a selected colour shows a check, not a ring', () => {
  const c = read('css/components.css')
  assert.match(c, /\.m-swatch\[aria-checked='true'\]::after, \.m-b3s__discs button\.is-on::after \{[^}]*mask: var\(--m-check-mask\)/)
  assert.match(read('css/tiles-b3.css'), /\.m-b3w__srcs button\.is-on::after \{[^}]*mask: var\(--m-check-mask\)/)
  assert.match(read('vue/MAppearance.vue'), /:name="s\.color === 'wallpaper' \? 'check' : 'palette'"/)
  assert.match(read('css/tray.css'), /\.m-trayset__choice\.is-on::after \{[^}]*mask: var\(--m-check-mask\)/)
})
