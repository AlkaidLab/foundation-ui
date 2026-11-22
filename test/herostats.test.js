import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fitDetail } from '../src/vue/fitText.js'

// 本主机 stat pills (real Panel): a pill's height comes from its content, a label is one line that says less before an ellipsis cuts it, a card too short for the rows loses whole pills.
// The label rule is checked with stubs (the rule, not the browser); the CSS and the markup by their text, like tilefit.test.js.
function label({ size = 12, full, short, room }) {
  const el = { clientWidth: room, attrs: new Set(), style: { fontSize: '', removeProperty() { this.fontSize = '' } }, setAttribute(n) { this.attrs.add(n) }, removeAttribute(n) { this.attrs.delete(n) }, hasAttribute(n) { return this.attrs.has(n) } }
  const px = () => parseFloat(el.style.fontSize) || size
  Object.defineProperty(el, 'scrollWidth', { get: () => (el.attrs.has('data-fit-short') ? short : full) * (px() / size) })
  globalThis.getComputedStyle = () => ({ display: 'block', visibility: 'visible', fontSize: `${size}px` })
  return el
}
test('a label that fits stays as it is', () => {
  const el = label({ full: 90, short: 24, room: 100 }); fitDetail(el)
  assert.equal(el.hasAttribute('data-fit-short'), false); assert.equal(el.style.fontSize, '')
})
test('a label a little too wide goes to 11 px before it says less', () => {
  const el = label({ full: 105, short: 24, room: 100 }); fitDetail(el)
  assert.equal(el.hasAttribute('data-fit-short'), false); assert.equal(el.style.fontSize, '11px')
})
test('a label far too wide says only its first words (version number in the pill title), never wraps', () => {
  const el = label({ full: 165, short: 24, room: 80 }); fitDetail(el)
  assert.equal(el.hasAttribute('data-fit-short'), true)
  assert.equal(el.style.fontSize, '', 'the short label fits at its own size: no shrink')
})
test('a second pass with more room puts the detail back', () => {
  const el = label({ full: 165, short: 24, room: 80 }); fitDetail(el)
  el.clientWidth = 200; fitDetail(el)
  assert.equal(el.hasAttribute('data-fit-short'), false)
})
test('the hero marks its pills: rows drop whole, the label has a short form, the title carries the full text', () => {
  const v = fs.readFileSync(new URL('../src/vue/tiles/cal/CalHero.vue', import.meta.url), 'utf8')
  assert.match(v, /class="m-calh__blocks"[^>]*data-fit-rows="drop"/)
  assert.match(v, /<small data-fit-detail>/)
  assert.match(v, /:title="`\$\{x\.value\} · \$\{x\.label\}`"/)
})
test('the pills take their height from their content and never squeeze below it', () => {
  const c = fs.readFileSync(new URL('../src/css/tiles-cal.css', import.meta.url), 'utf8')
  assert.match(c, /\.m-calh__blocks \{[^}]*grid-auto-rows: minmax\(min-content, 76px\)[^}]*overflow: clip/)
  assert.doesNotMatch(c, /\.m-calh__blocks \{[^}]*grid-auto-rows: minmax\(0, 1fr\)/)
  const r = fs.readFileSync(new URL('../src/css/tilefit-real.css', import.meta.url), 'utf8')
  assert.match(r, /:is\(\.m-dash__cell, \.m-dock__cell\) \.m-calh__blocks li > small \{ white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important/)
  assert.match(r, /\.m-calh__blocks li > b\[data-fit-wrap\] \{ white-space: nowrap !important/)
})
