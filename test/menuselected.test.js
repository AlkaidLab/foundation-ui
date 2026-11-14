import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = fs.readFileSync(new URL('../src/css/controls.css', import.meta.url), 'utf8')
const row = fs.readFileSync(new URL('../src/vue/MMenuRow.vue', import.meta.url), 'utf8')

test('a selected menu row is the secondary container with its own ink, the same in light and dark (no tertiary container)', () => {
  assert.match(css, /--md-menu-item-selected-container-color: var\(--md-sys-color-secondary-container\)/)
  assert.match(css, /--md-menu-item-selected-label-text-color: var\(--md-sys-color-on-secondary-container\)/)
  assert.doesNotMatch(css.split('/* ---- Tooltip')[0].replace(/\/\*[\s\S]*?\*\//g, ''), /tertiary/, 'no tertiary role left in the menu rules')
})

test('the submenu arrow is the chevron_right symbol, 20 px, on-surface-variant, on the trailing edge', () => {
  assert.match(row, /slot="end" name="chevron_right"/)
  assert.match(css, /md-menu md-menu-item \.m-icon \{ width: 20px; height: 20px; font-size: 20px; \}/)
  assert.match(css, /md-menu md-menu-item \.m-icon\[slot='end'\] \{ color: var\(--md-sys-color-on-surface-variant\); margin-inline-end: -4px; \}/)
})
