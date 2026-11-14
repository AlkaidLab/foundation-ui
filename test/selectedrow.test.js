// The selected row of a list (MNavList item, selected MItem / MSplitItem, the drawer's nav item) is one rule (layout.css --m-sel-*). It must not be the tone of the list column it sits on:
// in the default colour style the secondary container IS the frame's tone (surface-container-high, e.g. #e5deff in a light vibrant scheme with a blue, violet, red, pink or rose seed), so the old
// rule gave the selected row a contrast of 1.0 against its column while the unselected rows (surface-bright) looked like the highlighted ones (主机设置 › 网络).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { schemeColors, COLOR_STYLES } from '../src/tokens/theme.js'
import { PRESET_SEEDS } from '../src/appearance/appearance.js'

const cssDir = new URL('../src/css/', import.meta.url)
const css = (name) => readFileSync(new URL(name, cssDir), 'utf8')
const layout = css('layout.css')
const appearance = css('appearance.css')

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const mix = (a, b, k) => a.map((v, i) => v * k + b[i] * (1 - k)) // color-mix(in srgb, a k%, b)

test('the selected-row tokens are defined once, as the fill, the ink and a ring in the accent text colour', () => {
  const tokens = layout.match(/html \{ --m-sel-fill: ([^;]+); --m-sel-ink: ([^;]+); --m-sel-ring: ([^;]+); --m-sel-ring-w: ([^;]+); \}/)
  assert.ok(tokens, 'html { --m-sel-fill; --m-sel-ink; --m-sel-ring; --m-sel-ring-w }')
  assert.equal(tokens[1], 'color-mix(in srgb, var(--md-sys-color-primary-text) 18%, var(--md-sys-color-surface-container-highest))')
  assert.equal(tokens[2], 'var(--md-sys-color-on-surface)')
  assert.equal(tokens[3], 'var(--md-sys-color-primary-text)')
  assert.match(layout, /\.m-item--selected, \.m-navlist__item\[aria-current='page'\], \.m-nav-item\[aria-current='page'\] \{ background: var\(--m-sel-fill\); color: var\(--m-sel-ink\); box-shadow: inset 0 0 0 var\(--m-sel-ring-w\) var\(--m-sel-ring\); \}/)
})

test('no stylesheet gives a selected row the secondary container again (that is the column tone)', () => {
  for (const name of readdirSync(cssDir).filter((n) => n.endsWith('.css'))) {
    for (const [, selector, body] of css(name).matchAll(/([^{}]*\.(?:m-item--selected|m-navlist__item\[aria-current='page'\]|m-nav-item\[aria-current='page'\]))\s*\{([^}]*)\}/g)) {
      assert.doesNotMatch(body, /background:[^;]*secondary-container/, `${name}: ${selector.trim()}`)
    }
  }
})

test('the list column is the frame tone (surface-container-high): the contrast numbers below are about that column', () => {
  assert.match(appearance, /--m-frame: var\(--md-sys-color-surface-container-high\)/)
  assert.match(appearance, /--m-list-left: var\(--m-frame\)/)
  assert.match(css('shell-blend.css'), /html\[data-list='merged'\] \{ --m-list-fill: var\(--m-rail-fill\); \}/)
})

test('in every colour style, mode and accent the selected row differs from its column and from the unselected rows, and no ring is drawn (Material 3 lists mark selection by fill and weight; the team removed the ring on 2026-11-09)', () => {
  const seeds = PRESET_SEEDS.concat([{ id: 'brand-light', hex: '#4a9eff' }, { id: 'brand-dark', hex: '#d4a5a5' }])
  let checked = 0
  for (const style of COLOR_STYLES) for (const dark of [false, true]) for (const seed of seeds) {
    const c = schemeColors(seed.hex, { dark, style, variant: dark ? 'tonalSpot' : 'vibrant' })
    const fill = mix(rgb(c.primaryText), rgb(c.surfaceContainerHighest), 0.18)
    const column = rgb(c.surfaceContainerHigh)
    const unselected = rgb(dark ? c.surfaceContainerHighest : c.surfaceBright) // appearance.css --m-row-solid
    const at = `${style} ${dark ? 'dark' : 'light'} ${seed.id}`
    assert.ok(ratio(fill, column) >= 1.25, `${at}: fill against the column ${ratio(fill, column).toFixed(2)}`)
    assert.ok(ratio(fill, unselected) >= 1.35, `${at}: fill against an unselected row ${ratio(fill, unselected).toFixed(2)}`)
    assert.notEqual(c.secondaryContainer.toLowerCase(), '#' + fill.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''), `${at}: the fill is not the secondary container`)
    checked++
  }
  assert.equal(checked, 3 * 2 * seeds.length)
})

test('the selected row has no ring', () => {
  assert.match(layout, /--m-sel-ring-w: 0px/)
})
