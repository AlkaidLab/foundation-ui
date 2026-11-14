import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { coachTexts } from '../src/vue/coachTexts.js'

const source = fs.readFileSync(new URL('../src/vue/MCoachMarks.vue', import.meta.url), 'utf8')

test('the tour has the eight stops of the brief, each with a title and a sentence in both languages', () => {
  const ids = ['rail', 'search', 'overview', 'edit', 'pair', 'config', 'system', 'help']
  assert.deepEqual(source.match(/const STEPS = \[([^\]]+)\]/)[1].replace(/['\s]/g, '').split(','), ids)
  for (const locale of ['zh', 'en']) for (const id of ids) { const s = coachTexts(locale).steps[id]; assert.ok(s.title && s.text, `${locale} ${id}`) }
  assert.equal(coachTexts('zh').done, '知道了'); assert.equal(coachTexts('zh').next, '下一个')
})

test('it runs once (the done flag is remembered), can be started again, skips what is not on screen and points at the bottom bar on a narrow window', () => {
  assert.match(source, /storage\(\)\?\.setItem\(props\.storageKey, '1'\)/)
  assert.match(source, /foundation-coach-start/); assert.match(source, /foundation-guide-progress/)
  assert.match(source, /\.filter\(\(s\) => s\.el\)/)
  assert.match(source, /\.m-scene__bar/)
  assert.match(source, /key === 'Escape'/)
})
