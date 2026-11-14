import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/css/appearance.css', import.meta.url), 'utf8')
const layout = readFileSync(new URL('../src/css/layout.css', import.meta.url), 'utf8')
const tokenOf = (block, name) => new RegExp(`${name}: ([^;]+);`).exec(block)?.[1]

test('a row of the list pane has a surface of its own in every scheme: in the dark ones it is not the colour of the frame (the list of the merged look)', () => {
  const dark = /html\[data-bs-theme='dark'\][^{]*\{([^}]*)\}/.exec(css)[1]
  const frame = tokenOf(dark, '--m-frame')
  const row = tokenOf(dark, '--m-row-solid')
  assert.ok(frame && row, 'the dark scheme names the frame and the row')
  assert.notEqual(row, frame, 'rows of the colour of the frame were invisible on the merged list (1.00:1)')
  assert.match(row, /surface-container-highest/)
  assert.match(css, /--m-row-fill: var\(--m-row-solid\);/)
  assert.match(css, /--m-row-fill: color-mix\(in srgb, var\(--m-row-solid\) calc\(var\(--m-row-alpha\) \* 100%\), transparent\);/)
  assert.match(layout, /\.m-navlist__item \{[^}]*background: var\(--m-row-fill\)/s)
})
