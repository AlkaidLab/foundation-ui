import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseReleaseNotes } from '../src/update/notes.js'

test('the compare link of the generated Full Changelog line is kept, and only a GitHub compare address', () => {
  const md = '## What\'s Changed\n* fix: a thing by @x in #1\n\n**Full Changelog**: https://github.com/AlkaidLab/foundation-sunshine/compare/v1.0.0...v1.1.0'
  assert.equal(parseReleaseNotes(md).fullChangelog, 'https://github.com/AlkaidLab/foundation-sunshine/compare/v1.0.0...v1.1.0')
  assert.equal(parseReleaseNotes('**Full Changelog**: https://evil.example/compare/a...b').fullChangelog, '')
  assert.equal(parseReleaseNotes('nothing here').fullChangelog, '')
  assert.equal(parseReleaseNotes('').fullChangelog, '')
})

test('the update sheet offers it as a link of its own, with a text in both languages', () => {
  const sheet = fs.readFileSync(new URL('../src/vue/MUpdateSheet.vue', import.meta.url), 'utf8')
  assert.match(sheet, /emit\('open-changelog', notes\.fullChangelog\)/)
  const model = fs.readFileSync(new URL('../src/update/model.js', import.meta.url), 'utf8')
  assert.ok(model.includes("fullChangelog: 'Full changelog'") && model.includes("fullChangelog: '完整更新日志'"))
})
