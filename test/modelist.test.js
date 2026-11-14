import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { addEntry, cleanList, editEntry, fromResolutionNodes, LIMITS, moveEntry, normalizeRate, normalizeResolution, parseResolution, removeEntry, sameList, shown, sortList, toResolutionNodes } from '../src/settings/modeList.js'
import { MODE_LIST_TEXTS, modeListTexts } from '../src/settings/modeListTexts.js'

test('a resolution is read in the usual spellings and written as widthxheight', () => {
  assert.deepEqual(parseResolution('1920x1080'), { width: 1920, height: 1080 })
  assert.deepEqual(parseResolution(' 2560 × 1440 '), { width: 2560, height: 1440 })
  assert.equal(parseResolution('1920'), null)
  assert.deepEqual(normalizeResolution('1920X1080'), { value: '1920x1080' })
  assert.deepEqual(normalizeResolution('01920x1080'), { value: '1920x1080' })
})

test('resolution ranges: below 320 or above 16384 on either side is refused', () => {
  assert.equal(normalizeResolution('319x1080').error, 'range')
  assert.equal(normalizeResolution('1920x16385').error, 'range')
  assert.equal(normalizeResolution('320x320').value, '320x320')
  assert.equal(normalizeResolution('abc').error, 'invalid')
})

test('refresh rates follow the host: 30 to 500, up to three decimals, comma and Hz accepted, canonical text', () => {
  assert.deepEqual(LIMITS.rate, { min: 30, max: 500, count: 5 })
  assert.deepEqual(LIMITS.resolution, { min: 320, max: 16384, count: 25 })
  assert.deepEqual(normalizeRate('59.94'), { value: '59.94' })
  assert.deepEqual(normalizeRate('119,88'), { value: '119.88' })
  assert.deepEqual(normalizeRate('144 Hz'), { value: '144' })
  assert.deepEqual(normalizeRate('60.0'), { value: '60' })
  assert.equal(normalizeRate('29').error, 'range')
  assert.equal(normalizeRate('501').error, 'range')
  assert.equal(normalizeRate('59.9444').error, 'invalid')
  assert.equal(normalizeRate('-60').error, 'invalid')
})

test('adding: to the end; a duplicate in another spelling, a bad value and a full list change nothing', () => {
  const list = ['1920x1080', '1280x720']
  assert.deepEqual(addEntry('resolution', list, '2560 × 1440').list, ['1920x1080', '1280x720', '2560x1440'])
  assert.deepEqual(list, ['1920x1080', '1280x720'])
  assert.deepEqual(addEntry('resolution', list, '1920X1080'), { list, error: 'exists' })
  assert.deepEqual(addEntry('resolution', list, '100x100'), { list, error: 'range' })
  assert.deepEqual(addEntry('rate', ['60'], '60.0'), { list: ['60'], error: 'exists' })
  const five = ['30', '60', '90', '120', '144']
  assert.equal(addEntry('rate', five, '240').error, 'full')
  const many = Array.from({ length: 25 }, (_, i) => `${1000 + i}x1000`)
  assert.equal(addEntry('resolution', many, '1920x1080').error, 'full')
})

test('editing keeps the position; the same value written back is no error; a clash is', () => {
  const list = ['60', '120', '144']
  assert.deepEqual(editEntry('rate', list, 1, '119.88').list, ['60', '119.88', '144'])
  assert.deepEqual(editEntry('rate', list, 1, '120.0'), { list, value: '120' })
  assert.equal(editEntry('rate', list, 1, '144').error, 'exists')
  assert.equal(editEntry('rate', list, 1, '999').error, 'range')
  assert.equal(editEntry('rate', list, 7, '90').error, 'invalid')
})

test('removing: the last entry stays; moving: one place, nothing at the ends; sorting only on request', () => {
  assert.deepEqual(removeEntry(['60', '120'], 0).list, ['120'])
  assert.deepEqual(removeEntry(['60'], 0), { list: ['60'], error: 'minOne' })
  const list = ['a', 'b', 'c']
  assert.deepEqual(moveEntry(list, 2, -1), ['a', 'c', 'b'])
  assert.equal(moveEntry(list, 0, -1), list)
  assert.deepEqual(sortList('resolution', ['3840x2160', '1280x720', '1920x1080']), ['1280x720', '1920x1080', '3840x2160'])
  assert.deepEqual(sortList('rate', ['144', '59.94', '60', '120']), ['59.94', '60', '120', '144'])
})

test('a loaded list keeps its order and what the person already has, even outside the editor ranges', () => {
  assert.deepEqual(cleanList('resolution', ['2560x1440', '1920x1080', '2560x1440', '200x100']), ['2560x1440', '1920x1080', '200x100'])
  assert.deepEqual(cleanList('rate', ['120', '60', '60.0', '24', 144]), ['120', '60', '24', '144'])
  assert.equal(sameList(['a', 'b'], ['a', 'b']), true)
  assert.equal(sameList(['a', 'b'], ['b', 'a']), false)
  assert.equal(shown('resolution', '1920x1080'), '1920 × 1080')
  assert.equal(shown('rate', '59.94'), '59.94 Hz')
})

test('the driver nodes round trip in order', () => {
  const list = ['2560x1440', '800x600', '1920x1080']
  assert.deepEqual(fromResolutionNodes(toResolutionNodes(list)), list)
  assert.deepEqual(fromResolutionNodes([{ width: 0, height: 1080 }, null, { width: 1920, height: 1080 }]), ['1920x1080'])
})

test('texts: both languages carry the same keys, the full Chinese name and Foundation Virtual Display', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(MODE_LIST_TEXTS.zh), keys(MODE_LIST_TEXTS.en))
  assert.equal(modeListTexts('zh-CN'), MODE_LIST_TEXTS.zh)
  assert.equal(modeListTexts('de').resolutionTitle, 'Auflösungen von Foundation Virtual Display')
  assert.match(MODE_LIST_TEXTS.zh.resolutionTitle, /基地虚拟显示器/)
  assert.match(MODE_LIST_TEXTS.en.note, /Foundation Virtual Display/)
  assert.doesNotMatch(JSON.stringify(MODE_LIST_TEXTS.zh), /杂鱼显示器|杂鱼虚拟显示器/)
})

test('the dialog keeps drafts until Save, the row opens it, and the package exports all three', () => {
  const dialog = readFileSync(new URL('../src/vue/MModeListDialog.vue', import.meta.url), 'utf8')
  assert.match(dialog, /emit\('save', value\)/)
  assert.match(dialog, /props\.saver/)
  assert.match(dialog, /if \(failure\.value\) return\n  \} else emit/)
  assert.match(dialog, /shortNote \? t\.noteShort : t\.note/)
  assert.match(dialog, /watch\(open/)
  assert.match(dialog, /<p v-if="lead"/)
  assert.match(dialog, /@click="open = false">\{\{ t\.cancel \}\}/)
  const row = readFileSync(new URL('../src/vue/MModeListRow.vue', import.meta.url), 'utf8')
  assert.match(row, /emit\('edit', kind\)/)
  const index = readFileSync(new URL('../src/vue/index.js', import.meta.url), 'utf8')
  for (const name of ['MModeList', 'MModeListDialog', 'MModeListRow']) assert.match(index, new RegExp(`as ${name} }`))
})
