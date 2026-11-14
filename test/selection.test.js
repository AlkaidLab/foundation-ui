// Selection in lists and navigation, M3 Expressive: the selected list row changes shape (MDC List.md), the selected navigation label is not bold
// (MDC NavigationRail.md / BottomNavigation.md), the expanded rail brings its labels in after the indicator.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const layout = readFileSync(new URL('../src/css/layout.css', import.meta.url), 'utf8')
const comp = readFileSync(new URL('../src/css/components.css', import.meta.url), 'utf8')

test('a selected row of a segmented list has four large corners, also first and last in its group', () => {
  assert.match(layout, /\.m-item\.m-item--selected, \.m-group > \.m-item\.m-item--selected \{ border-radius: var\(--md-sys-shape-corner-large\); \}/)
  // after the first/last rules, so it wins at equal specificity
  assert.ok(layout.indexOf('.m-group > .m-item.m-item--selected') > layout.indexOf('.m-group > .m-item:last-child'))
})

test('no navigation item makes its selected label bold', () => {
  const rule = comp.match(/\.m-nav-item\[aria-current='page'\] \{([^}]*)\}/)[1]
  assert.doesNotMatch(rule, /emphasized|font-weight|font:/)
  assert.doesNotMatch(layout, /\.m-rail__item\[aria-current='page'\][^{]*\{[^}]*(emphasized|font-weight: [6-9]00)/)
})

test('expanding the rail fades the row labels in (opacity only), and reduced motion turns it off', () => {
  assert.match(layout, /\.m-rail--expanded \.m-rail__label--row \{ animation: m-rail-label-in var\(--m-spring-default-effects-duration\) var\(--m-spring-default-effects\) 60ms both; \}/)
  assert.match(layout, /@keyframes m-rail-label-in \{ from \{ opacity: 0; \} \}/)
  assert.match(layout, /html\[data-motion='reduced'\] \.m-rail--expanded :is\(\.m-rail__pill, \.m-rail__label--row\) \{ animation: none; \}/)
})
