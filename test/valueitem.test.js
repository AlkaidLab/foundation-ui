import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

test('a text or number setting is a row with the value and a pencil, and its dialog holds the one field', () => {
  const item = read('vue/MValueItem.vue')
  assert.match(item, /<MItem[^>]*action[^>]*:title="label"[^>]*:value="shown"/)
  assert.match(item, /name="edit"/)
  assert.match(item, /<MValueDialog[^>]*:help="help"/)
  const dialog = read('vue/MValueDialog.vue')
  assert.match(dialog, /md-outlined-text-field/)
  assert.match(dialog, /:disabled="!!problem"/, 'a value the host refuses keeps 确定 off')
  assert.match(dialog, /@keydown\.enter\.prevent="apply"/)
  // nothing reaches the model before 确定
  assert.doesNotMatch(dialog, /@input="model = /)
})
