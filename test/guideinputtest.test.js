import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { KEYBOARD_ARROWS, KEYBOARD_CODES, KEYBOARD_ROWS, MOUSE_BUTTON_NAMES, codeLabel, mouseButtons, wheelGauge } from '../src/testtools/logic.js'
import { testToolTexts } from '../src/testtools/texts.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// guide p2b item 18: the input test is a keyboard tester
test('the drawn keyboard has each key once, every row of the main block is 15 units wide, and the common keys are on it', () => {
  const codes = [...KEYBOARD_ROWS.flat().filter(Array.isArray).map((k) => k[0]), ...KEYBOARD_ARROWS.flat().filter(Boolean).map((k) => k[0])]
  assert.equal(new Set(codes).size, codes.length)
  for (const [i, row] of KEYBOARD_ROWS.entries()) {
    const w = row.reduce((a, k) => a + (Array.isArray(k) ? k[2] : k), 0)
    if (i > 0) assert.equal(w, 15, `row ${i}`)
  }
  for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Enter', 'Escape', 'ShiftLeft', 'ControlLeft', 'AltLeft', 'Tab', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'F12', 'Digit0']) assert.ok(KEYBOARD_CODES.has(c), c)
  assert.equal(codeLabel('Numpad7'), 'Numpad 7')
  assert.equal(codeLabel('KeyQ'), 'Q')
})

test('the mouse buttons come from the bit mask and the wheel gauge stays inside its track', () => {
  assert.deepEqual(mouseButtons(0), { left: false, right: false, middle: false, back: false, forward: false })
  assert.deepEqual(mouseButtons(1 | 4 | 16), { left: true, right: false, middle: true, back: false, forward: true })
  assert.deepEqual(MOUSE_BUTTON_NAMES, ['left', 'middle', 'right', 'back', 'forward'])
  assert.equal(wheelGauge(120), 0.5)
  assert.equal(wheelGauge(-9999), -1)
  assert.equal(wheelGauge(NaN), 0)
})

test('only the wheel zone takes the wheel; the keyboard takes keys only while the pointer is over it or it has focus, and Tab always leaves', () => {
  const v = read('src/vue/testtools/TestInput.vue')
  assert.equal((v.match(/@wheel\.prevent/g) || []).length, 1)
  assert.match(v, /class="m-kt__zone m-kt__wheel"[^>]*@wheel\.prevent/)
  assert.doesNotMatch(v, /addEventListener\('wheel'/)
  assert.match(v, /if \(!active\.value\) return\s*\n\s*if \(e\.code !== 'Tab'\) e\.preventDefault\(\)/)
  assert.match(v, /const active = computed\(\(\) => hover\.value \|\| focus\.value\)/)
  // the click zone shows left, middle, right, back and forward and keeps the context menu and the middle-click scroll out of the way
  assert.match(v, /@contextmenu\.prevent @mousedown\.middle\.prevent/)
  const css = read('src/css/testtools.css')
  assert.match(css, /\.m-kb__key\.is-down \{ background: var\(--md-sys-color-primary\)/)
  assert.doesNotMatch(css.slice(css.indexOf('.m-kt {')), /touch-action: none[^}]*\}\s*\.m-kb/)
})

test('the guide has the keyboard, the mouse and touch, and the gamepad as three tests of their own; the tools page keeps the keyboard and the mouse in one', () => {
  const g = read('src/vue/MGuideTry.vue')
  assert.match(g, /\['keyboard', 'keyboard'\], \['mouse', 'mouse'\], \['pad', 'sports_esports'\]/)
  assert.match(g, /keyboard: TestInput, mouse: TestInput, pad: TestPad/)
  assert.match(g, /tool === 'keyboard' \|\| tool === 'mouse' \? \{ part: tool \} : \{\}/)
  assert.doesNotMatch(g, /input: TestInput/)
  const v = read('src/vue/testtools/TestInput.vue')
  assert.match(v, /part: \{ type: String, default: 'all' \}/)
  assert.match(v, /<div v-if="showKb" class="m-kt__card">/)
  assert.match(v, /<div v-if="showMouse" class="m-kt__card">/)
  assert.doesNotMatch(read('src/vue/testtools/MTestTools.vue'), /part=|pad: true/)
  for (const l of ['zh', 'en']) { const t = testToolTexts(l).tools; assert.ok(t.keyboard && t.mouse && t.pad, l) }
  assert.equal(testToolTexts('zh').tools.keyboard, '键盘')
  assert.equal(testToolTexts('zh').tools.mouse, '鼠标与触控')
})

test('the gamepad tool draws nothing about a pad when there is none and no host to rumble (it threw in the guide, which has no host rumble)', () => {
  assert.match(read('src/vue/testtools/TestPad.vue'), /<template v-else-if="pad">/)
})

test('the new words exist in both languages', () => {
  const keys = ['keyboard', 'kbIdle', 'kbLive', 'kbLegend', 'kbOther', 'mouse', 'clickZone', 'clickHint', 'wheelZone', 'wheelHint', 'wheelUp', 'wheelDown', 'left', 'right', 'middle', 'back', 'forward', 'pad']
  for (const l of ['zh', 'en']) for (const k of keys) assert.ok(testToolTexts(l).input[k], `${l} ${k}`)
})
