import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { modalityOf } from '../src/a11y/modality.js'

test('the keyboard and the pointer are told apart, a modifier shortcut and a letter are neither', () => {
  assert.equal(modalityOf({ type: 'keydown', key: 'Tab' }), 'keyboard')
  assert.equal(modalityOf({ type: 'keydown', key: 'Enter' }), 'keyboard')
  assert.equal(modalityOf({ type: 'keydown', key: 'ArrowDown' }), 'keyboard')
  assert.equal(modalityOf({ type: 'keydown', key: 'k', ctrlKey: true }), null)
  assert.equal(modalityOf({ type: 'keydown', key: 'a' }), null)
  assert.equal(modalityOf({ type: 'pointerdown' }), 'pointer')
  assert.equal(modalityOf({ type: 'touchstart' }), 'pointer')
})

test('the focus frame is the M3 indicator: 3 dp, offset 2 dp, never its own corner, keyboard only', () => {
  const css = readFileSync(new URL('../src/css/base.css', import.meta.url), 'utf8')
  const rule = css.match(/\.m-app :focus-visible[^{]*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /outline: 3px solid var\(--md-sys-color-secondary\)/)
  assert.match(rule[1], /outline-offset: 2px/)
  assert.doesNotMatch(rule[1], /border-radius/, 'a corner set by the frame squares every focused button, chip and switch')
  assert.match(css, /html:not\(\[data-modality='keyboard'\]\) :focus-visible \{ outline-color: transparent !important; \}/)
})
