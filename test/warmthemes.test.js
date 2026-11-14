import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('the idle preparation of the next themes waits while the window is being used', () => {
  const src = read('src/appearance/apply.js')
  assert.match(src, /const WARM_QUIET_MS = 4000/)
  assert.match(src, /performance\.now\(\) - lastInputAt < WARM_QUIET_MS/)
  for (const type of ['pointerdown', 'pointermove', 'keydown', 'wheel']) assert.ok(src.includes(`'${type}'`), type)
  assert.match(src, /isInputPending/)
})

test('the theme memo is documented for what it covers: the forward hue, not the inverse HCT solve', () => {
  const src = read('src/tokens/theme.js')
  assert.match(src, /HctSolver\.hueOf/)
  assert.match(src, /warmNextThemes/)
})
