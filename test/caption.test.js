import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/vue/MCaption.vue', import.meta.url), 'utf8')

test('the caption bar orders its slots: [back] brand [version], search, mita, connect, announcements, account, then the window controls', () => {
  const order = [...source.matchAll(/<slot name="([a-z]+)"/g)].map((m) => m[1])
  // back and version share a row with the brand; a product that fills neither gets the brand alone (a second slot with v-else)
  assert.deepEqual(order, ['back', 'brand', 'version', 'search', 'mita', 'connect', 'announcements', 'account', 'controls'])
  assert.match(source, /<header class="m-caption" :class="bem">/)
})

// the caption bar of a phone is one design for both products: the sizes of its buttons are here, not in the product's styles
const layout = fs.readFileSync(new URL('../src/css/layout.css', import.meta.url), 'utf8')
const phone = layout.slice(layout.indexOf('@media (max-width: 599.98px) {', layout.indexOf('.m-caption__actions')))
test('below 600 px the caption actions are icon buttons of one size, touching, with no empty slot for the status bell and a plain connect icon', () => {
  const block = phone.slice(0, phone.indexOf('\n}\n'))
  assert.match(block, /\.m-caption__actions \{ gap: 0; margin-inline-start: 0; padding-inline-end: 4px; \}/)
  assert.match(block, /\.m-caption \.m-icon-btn, \.m-caption \.m-caption-connect \{ width: 44px; height: 44px; min-width: 44px; padding: 0; justify-content: center; \}/)
  assert.match(block, /\.m-caption \.m-annbtn, \.m-caption \.m-statusbell \{ width: 44px; \}/)
  assert.match(block, /\.m-caption \.m-statusbell--rest \{ display: none; \}/)
  assert.match(block, /\.m-caption \.m-caption-connect \{ background: transparent;[^}]*border-radius: 50%; \}/)
})
