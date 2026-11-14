// The context menu follows the Material 3 Expressive vertical menu (standard colours): the values of m3.material.io/components/menus/specs (read 2026-11-09), the structure of its guidelines
// and the keyboard of its accessibility page. The numbers are the spec's; a change of one of them is a change of the design, and this test says so.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const here = new URL('.', import.meta.url).pathname
const src = (p) => fs.readFileSync(here + '../src/' + p, 'utf8')
const css = src('css/controls.css')
const block = css.slice(css.indexOf('md-menu, .m-menu {'), css.indexOf('/* ---- Tooltip'))
const token = (name) => new RegExp(`--md-menu-${name}:\\s*([^;]+);`).exec(block)?.[1].trim()

test('menu container: surface container low, Corner large 16 dp, elevation 2, 4 dp padding, 112 to 280 dp wide', () => {
  assert.equal(token('container-color'), 'var(--md-sys-color-surface-container-low)')
  assert.equal(token('container-shape'), '16px')
  assert.equal(token('container-elevation'), '2')
  assert.equal(token('top-space'), '4px'); assert.equal(token('bottom-space'), '4px')
  assert.match(block, /min-width: 112px; max-width: 280px;/)
})

test('menu item: 44 dp, 8 dp above and below, 16 dp at the sides, 12 dp between, 20 dp icons', () => {
  assert.equal(token('item-one-line-container-height'), '44px')
  assert.equal(token('item-top-space'), '8px'); assert.equal(token('item-bottom-space'), '8px')
  assert.equal(token('item-leading-space'), '16px'); assert.equal(token('item-trailing-space'), '16px')
  assert.match(block, /md-menu md-menu-item \{[^}]*gap: 12px/)
  assert.match(block, /md-menu md-menu-item \.m-icon \{ width: 20px; height: 20px; font-size: 20px; \}/)
})

test('menu item text: label 14/20 500, supporting text 12/16 400, trailing text 14/20 500', () => {
  assert.equal(token('item-label-text-size'), '14px'); assert.equal(token('item-label-text-weight'), '500'); assert.equal(token('item-label-text-line-height'), '20px')
  assert.equal(token('item-supporting-text-size'), '12px'); assert.equal(token('item-supporting-text-weight'), '400'); assert.equal(token('item-supporting-text-line-height'), '16px')
  assert.equal(token('item-trailing-supporting-text-size'), '14px'); assert.equal(token('item-trailing-supporting-text-weight'), '500'); assert.equal(token('item-trailing-supporting-text-line-height'), '20px')
})

test('menu colours: on-surface label, on-surface-variant icons / supporting / trailing text, selected in the secondary container, in light and dark alike, disabled 38 %, hover 8 %, pressed 10 %', () => {
  assert.equal(token('item-label-text-color'), 'var(--md-sys-color-on-surface)')
  for (const n of ['item-leading-icon-color', 'item-trailing-icon-color', 'item-supporting-text-color', 'item-trailing-supporting-text-color']) assert.equal(token(n), 'var(--md-sys-color-on-surface-variant)')
  assert.equal(token('item-selected-container-color'), 'var(--md-sys-color-secondary-container)')
  assert.equal(token('item-selected-label-text-color'), 'var(--md-sys-color-on-secondary-container)')
  assert.equal(token('item-disabled-opacity'), '0.38')
  assert.equal(token('item-hover-state-layer-opacity'), '0.08'); assert.equal(token('item-pressed-state-layer-opacity'), '0.1')
  assert.equal(token('item-hover-state-layer-color'), 'var(--md-sys-color-on-surface)')
  assert.equal(token('item-pressed-state-layer-color'), 'var(--md-sys-color-on-surface)')
  assert.match(block, /md-menu md-menu-item:focus-visible:not\(\[disabled\]\) \{ background: color-mix\(in srgb, var\(--md-sys-color-on-surface\) 10%/)
  assert.match(block, /--md-focus-ring-color: var\(--md-sys-color-secondary\); --md-focus-ring-width: 3px; --md-focus-ring-offset: -3px;/)
  assert.equal(/--md-divider-color:\s*var\(--md-sys-color-outline-variant\)/.test(block), true)
})

test('menu item shapes: 4 dp, 12 dp on the outer corners of a group, 12 dp when selected; the menu with a submenu open is 8 dp, the submenu 24 dp', () => {
  assert.match(block, /md-menu md-menu-item \{[^}]*border-radius: 4px;/)
  assert.match(block, /md-menu-item\.m-first \{ border-start-start-radius: 12px; border-start-end-radius: 12px; \}/)
  assert.match(block, /md-menu-item\.m-last \{ border-end-start-radius: 12px; border-end-end-radius: 12px; \}/)
  assert.match(block, /md-menu-item\.m-selected \{ border-radius: 12px;/)
  assert.match(block, /md-menu:has\(> md-sub-menu > md-menu\[open\]\) \{ --md-menu-container-shape: 8px; \}/)
  assert.match(block, /md-menu > md-sub-menu > md-menu \{ --md-menu-container-shape: 24px; \}/)
})

test('the menu is a menu: a submenu opens beside its item, groups are dividers, a section label is not focusable, the first item takes the focus', () => {
  const menu = src('vue/MMenu.vue'); const entries = src('vue/MMenuEntries.vue'); const row = src('vue/MMenuRow.vue')
  assert.ok(menu.includes('default-focus="first-item"'))
  assert.ok(entries.includes('<md-sub-menu') && entries.includes('slot="menu"') && entries.includes('anchor-corner="start-end" menu-corner="start-start"'))
  assert.ok(entries.includes('<md-divider v-if="row.item.divider" />') && entries.includes('class="m-menu__label" role="presentation"'))
  assert.ok(row.includes('slot="start"') && row.includes('slot="trailing-supporting-text"') && row.includes('slot="end" name="chevron_right"'))
  assert.ok(src('vue/index.js').includes("@material/web/menu/sub-menu.js"))
  // the menu window of the Panel shows one level at a time
  assert.ok(src('vue/MMenuPopup.vue').includes(':submenus="false"'))
})
