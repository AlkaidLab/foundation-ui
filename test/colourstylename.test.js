import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = fs.readFileSync(new URL('../src/css/colourstyle.css', import.meta.url), 'utf8')

test('the name of the chosen colour-style card keeps clear of its check badge; the other names have the whole width', () => {
  assert.match(css, /\.m-ap__style\.is-on::before, \.m-ap__style\.is-on::after \{[^}]*bottom: 12px; right: 10px; width: 22px; height: 22px;/)
  assert.match(css, /\.m-ap__stylename \{ min-width: 0; padding-inline: 4px; overflow: hidden; text-overflow: ellipsis;/)
  assert.match(css, /\.m-ap__style\.is-on \.m-ap__stylename \{ padding-inline: 28px; \}/, 'symmetric: the name does not move when the check comes')
})
