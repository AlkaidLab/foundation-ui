import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = fs.readFileSync(new URL('../src/css/stack.css', import.meta.url), 'utf8')

test('a page dot is a 24 x 24 px button (WCAG 2.2 target size) around a 6 px dot, in every tile height', () => {
  assert.match(css, /\.m-dstack__dot \{ all: unset; box-sizing: border-box; width: 24px; height: 24px;/)
  assert.match(css, /\.m-dstack__dot i \{ display: block; width: 6px; height: 6px;/, 'the visible dot did not grow')
  assert.doesNotMatch(css, /\.m-dstack__dot \{ height: 1\d?px; \}/, 'no compact override makes the button shorter again')
})

test('the dots stay inside the tile and clear of the pin: a second column when one cannot hold them', () => {
  assert.match(css, /max-height: calc\(100cqh - 72px\);/)
  // one grid of 24 px cells: every column starts on the same line (a flex wrap with each column centred put a short second column half a cell, 12 px, off the first; 2026-11-09)
  const box = /\.m-dstack__dots \{[^}]*\}/.exec(css)[0]
  assert.match(box, /display: grid; grid-auto-flow: column; grid-auto-columns: 24px; grid-template-rows: repeat\(auto-fit, 24px\);/)
  assert.doesNotMatch(box, /flex-wrap|display: flex/)
})
