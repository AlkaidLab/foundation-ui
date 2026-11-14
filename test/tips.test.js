import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/css/controls.css', import.meta.url), 'utf8')
const info = readFileSync(new URL('../src/vue/MInfo.vue', import.meta.url), 'utf8')

test('a tooltip is drawn by the top layer box, never by a pseudo element or a positioned child that a card can cover', () => {
  // the box is the only drawing of a tip: no style sheet still draws one from `data-tip` with a pseudo element (the ::after of a [data-tip] control is free for the touch hit slop, css/touch.css)
  const sheets = ['expressive.css', 'controls.css', 'touch.css', 'components.css'].map((f) => readFileSync(new URL(`../src/css/${f}`, import.meta.url), 'utf8')).join('\n')
  assert.doesNotMatch(sheets, /content:\s*attr\(data-tip\)/)
  assert.match(css, /\.m-tipbox \{ position: fixed/)
  assert.match(info, /data-tip/)
})

test('the button group animation is switched off for reduced motion', () => {
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.match(block, /\.m-seg__btn\[data-pop\] \{ animation: none/)
})
