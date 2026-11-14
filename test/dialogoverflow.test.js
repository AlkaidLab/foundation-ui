import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/css/notify.css', import.meta.url), 'utf8')
const vue = readFileSync(new URL('../src/vue/MDialog.vue', import.meta.url), 'utf8')

test('a dialog never leaves the window: capped to the viewport, fixed title and actions, a body that scrolls', () => {
  assert.match(css, /\.m-dialog__panel \{[^}]*max-height: calc\(100dvh - 48px\)/)
  assert.match(css, /\.m-dialog__title, \.m-dialog__actions[^{]*\{ flex: none; \}/)
  assert.match(css, /\.m-dialog__body \{[^}]*min-height: 0; overflow-y: auto/)
})

test('the body fades at the edge that has more to scroll', () => {
  for (const edge of ['top', 'bottom', 'both']) assert.match(css, new RegExp(`\\.m-dialog__body\\[data-fade='${edge}'\\] \\{ mask-image`))
  assert.match(vue, /data-fade/)
  assert.match(vue, /ResizeObserver/)
})
