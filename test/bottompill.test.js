import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/css/notify.css', import.meta.url), 'utf8')

test('every member of the bottom stack is one tonal surface with on-surface text and an elevation shadow', () => {
  const rule = css.match(/^\.m-pbar, \.m-snackbar, \.m-pin-toast \{([^}]*)\}/m)
  assert.ok(rule, 'the shared rule of the bottom pill')
  assert.match(rule[1], /background: var\(--md-sys-color-surface-container-highest\)/)
  assert.match(rule[1], /color: var\(--md-sys-color-on-surface\)/)
  assert.match(rule[1], /box-shadow:/)
})

test('the actions in the pill use the primary roles, not inverse colours', () => {
  assert.match(css, /\.m-pbar \.m-btn--text, \.m-snackbar \.m-btn--text \{ --m-btn-fg: var\(--md-sys-color-primary\)/)
  assert.match(css, /\.m-pbar \.m-btn:not\(\.m-btn--text\) \{ --m-btn-bg: var\(--md-sys-color-primary\); --m-btn-fg: var\(--md-sys-color-on-primary\)/)
  assert.doesNotMatch(css, /\.m-pbar[^{]*\{[^}]*inverse-/)
})

test('the page scrolls clear of the bar of unsaved changes: its height, the gap and the base are reserved at the bottom of the detail pane', async () => {
  const { reserveOf, STACK_BASE, STACK_GAP } = await import('../src/notify/stack.js')
  assert.equal(reserveOf({}), 0)
  assert.equal(reserveOf({ snackbar: { order: 1, height: 48 } }), 0, 'a snackbar comes and goes: not reserved')
  assert.equal(reserveOf({ pbar: { order: 0, height: 64 } }), STACK_BASE + 64 + STACK_GAP)
  const layout = readFileSync(new URL('../src/css/layout.css', import.meta.url), 'utf8')
  assert.match(layout, /\.m-scene:not\(\.m-scene--fab\) \.m-scene__pane--detail \.m-scene__inner::after \{[^}]*var\(--m-bottom-reserve/)
  assert.match(layout, /\.m-web-embedded::after \{ content: ''; display: block; height: var\(--m-bottom-reserve, 0px\); \}/, 'the page in the panel\'s frame reserves the same space inside itself')
  assert.match(layout, /\.m-scene--fab \.m-scene__pane--detail \.m-scene__inner::after \{[^}]*max\(96px, calc\(var\(--m-bottom-reserve/)
})
