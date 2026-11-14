import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyTheme, warmTheme } from '../src/tokens/theme.js'

// the least of a document applyTheme needs: one style element whose writes are counted
function fakeRoot() {
  const style = { id: '', writes: 0, _text: '' }
  Object.defineProperty(style, 'textContent', { get() { return this._text }, set(v) { this.writes += 1; this._text = v } })
  const doc = { getElementById: () => (style.id ? style : null), createElement: () => style, head: { appendChild() {} } }
  return { root: { ownerDocument: doc }, style }
}

test('the same theme applied again, as a light/dark change does, writes nothing', () => {
  const { root, style } = fakeRoot()
  applyTheme(root, { light: '#4a9eff', dark: '#4a9eff' })
  const text = style.textContent
  assert.match(text, /--md-sys-color-primary/)
  applyTheme(root, { light: '#4a9eff', dark: '#4a9eff' })
  assert.equal(style.writes, 1)
  assert.equal(style.textContent, text)
})

test('a theme worked out ahead is the theme that is applied later', () => {
  const a = fakeRoot(), b = fakeRoot()
  applyTheme(a.root, { light: '#d94f70', dark: '#d94f70', black: true })
  warmTheme({ light: '#d94f70', dark: '#d94f70', black: true })
  applyTheme(b.root, { light: '#d94f70', dark: '#d94f70', black: true })
  assert.equal(a.style.textContent, b.style.textContent)
})

test('another seed or the pure-black variant is another sheet', () => {
  const a = fakeRoot(), b = fakeRoot(), c = fakeRoot()
  applyTheme(a.root, { light: '#d94f70', dark: '#d94f70' })
  applyTheme(b.root, { light: '#3fae7a', dark: '#3fae7a' })
  applyTheme(c.root, { light: '#d94f70', dark: '#d94f70', black: true })
  assert.notEqual(a.style.textContent, b.style.textContent)
  assert.notEqual(a.style.textContent, c.style.textContent)
})
