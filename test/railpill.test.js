import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = (f) => readFileSync(new URL(`../src/css/${f}`, import.meta.url), 'utf8')

test('the current destination of the rail has a pill token: a step off secondaryContainer in the light scheme, secondaryContainer in the dark ones', () => {
  const layout = css('layout.css')
  assert.match(layout, /html \{ --m-rail-pill: color-mix\(in srgb, var\(--md-sys-color-secondary-container\), var\(--md-sys-color-on-surface\) \d+%\); \}/)
  assert.match(layout, /html\[data-bs-theme='dark'\] \{ --m-rail-pill: var\(--md-sys-color-secondary-container\); \}/)
})

test('both rules of the pill read the token (the one of the blend sheet used the role itself and showed no pill in light)', () => {
  assert.match(css('layout.css'), /\.m-rail__item\[aria-current='page'\] \.m-rail__pill \{ background: var\(--m-rail-pill\)/)
  assert.match(css('shell-blend.css'), /\.m-rail--expanded \.m-rail__item\[aria-current='page'\] \.m-rail__pill \{ background: var\(--m-rail-pill\); \}/)
})
