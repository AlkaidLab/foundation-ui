import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

test('a field of a form is the plain field: no row box, the info icon inside the field', () => {
  const field = read('vue/MFieldItem.vue')
  assert.doesNotMatch(field, /class="m-item/)
  assert.match(field, /slot="trailing-icon"/)
  assert.match(read('css/notify.css'), /\.m-group:has\(> \.m-fieldrow\)/)
})

test('a field among the rows of a group is a row of it: the card, the corners and the 2 px seam; a group of fields only stays a form', () => {
  const css = read('css/notify.css')
  assert.match(css, /\.m-group:has\(> \.m-fieldrow\) \{ gap: 16px; \}/, 'a form keeps its gap')
  assert.match(css, /\.m-group:has\(> \.m-item\):has\(> \.m-fieldrow\) \{ gap: 2px; \}/)
  assert.match(css, /\.m-group:has\(> \.m-item\) > \.m-fieldrow \{ background: var\(--m-card\)/)
  assert.match(css, /\.m-group:has\(> \.m-item\) > \.m-fieldrow:first-child \{ border-top-left-radius/)
  assert.match(css, /\.m-group:has\(> \.m-item\) > \.m-fieldrow:last-child \{ border-bottom-left-radius/)
})

test('the icon of a field sits inside the field at its start', () => {
  const field = read('vue/MFieldItem.vue')
  assert.match(field, /icon: \{ type: String, default: '' \}/)
  assert.match(field, /<MIcon v-if="icon" slot="leading-icon" :name="icon" \/>/)
})
