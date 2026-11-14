import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RATE_PRESETS, RESOLUTION_PRESETS, insertEntry, normalizeRate, normalizeResolution, pickerGroups, sortList } from '../src/settings/modeList.js'
import { MODE_LIST_TEXTS } from '../src/settings/modeListTexts.js'
import { displayTreeTexts } from '../src/settings/displayTreeTexts.js'

test('MP1: every preset passes the rules of the host, and the presets are what the brief names', () => {
  for (const g of RESOLUTION_PRESETS) for (const v of g.values) assert.deepEqual(normalizeResolution(v), { value: v }, v)
  for (const v of RATE_PRESETS) assert.deepEqual(normalizeRate(v), { value: v }, v)
  assert.deepEqual(RESOLUTION_PRESETS.map((g) => g.id), ['16:9', '16:10', '21:9', '32:9'])
  assert.deepEqual([...RATE_PRESETS], ['60', '90', '120', '144', '165', '240'])
  const all = RESOLUTION_PRESETS.flatMap((g) => g.values)
  assert.equal(new Set(all).size, all.length, 'no resolution is in two groups')
  for (const v of RESOLUTION_PRESETS.find((g) => g.id === '16:9').values) { const [w, h] = v.split('x').map(Number); assert.ok(Math.abs(w / h - 16 / 9) < 0.01, v) }
  for (const v of RESOLUTION_PRESETS.find((g) => g.id === '21:9').values) { const [w, h] = v.split('x').map(Number); assert.ok(Math.abs(w / h - 21 / 9) < 0.08, v) }
})

test('MP2: what the list holds beyond the presets gets a group of its own, in the list order; presets alone give none', () => {
  const groups = pickerGroups('resolution', ['1920x1080', '1366x768', '2000x900'])
  assert.deepEqual(groups.map((g) => g.id), ['16:9', '16:10', '21:9', '32:9', 'custom'])
  assert.deepEqual(groups.at(-1).values, ['1366x768', '2000x900'])
  assert.equal(groups.at(-1).custom, true)
  assert.equal(pickerGroups('resolution', ['1920x1080']).length, 4)
  assert.deepEqual(pickerGroups('rate', ['60', '59.94']).map((g) => [g.id, g.values.length]), [['common', 6], ['custom', 1]])
})

test('MP3: a value added to a list in size order lands in its place; any other list keeps the person\'s order', () => {
  assert.deepEqual(insertEntry('resolution', ['1280x720', '2560x1440'], '1920x1080').list, ['1280x720', '1920x1080', '2560x1440'])
  assert.deepEqual(insertEntry('resolution', ['2560x1440', '1280x720'], '1920x1080').list, ['2560x1440', '1280x720', '1920x1080'])
  assert.deepEqual(insertEntry('rate', ['60', '144'], '120').list, ['60', '120', '144'])
  assert.deepEqual(insertEntry('rate', ['60'], '59.94').list, ['59.94', '60'])
  assert.equal(insertEntry('rate', ['60'], '60').error, 'exists')
  assert.equal(insertEntry('rate', ['30', '60', '90', '120', '144'], '240').error, 'full')
  assert.equal(insertEntry('resolution', ['1280x720'], '100x100').error, 'range')
  assert.deepEqual(sortList('rate', insertEntry('rate', ['144', '60'], '120').list), ['60', '120', '144'])
})

test('MP4: the picker texts exist in both languages with the same keys and carry no colloquial wording', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(MODE_LIST_TEXTS.zh.picker), keys(MODE_LIST_TEXTS.en.picker))
  assert.equal(MODE_LIST_TEXTS.zh.picker.resolution.name, '支持的分辨率')
  assert.equal(MODE_LIST_TEXTS.zh.picker.rate.name, '支持的刷新率')
  assert.equal(MODE_LIST_TEXTS.en.picker.resolution.name, 'Supported resolutions')
  assert.equal(MODE_LIST_TEXTS.en.picker.rate.name, 'Supported refresh rates')
  assert.doesNotMatch(JSON.stringify(MODE_LIST_TEXTS.zh), /你|这个|已经|就行|一下|要留下/)
})

test('MP5: the component is a checklist plus one row for a custom value, not a text field of comma-separated values', () => {
  const vue = readFileSync(new URL('../src/vue/MModePicker.vue', import.meta.url), 'utf8')
  assert.match(vue, /role="checkbox"/)
  assert.match(vue, /<form class="m-mpick__add" @submit\.prevent="addDraft">/)
  assert.match(vue, /pickerGroups\(props\.kind, list\.value\)/)
  assert.match(vue, /data-part="offered"/)
  assert.doesNotMatch(vue, /split\(','\)|join\(','\)/)
  const index = readFileSync(new URL('../src/vue/index.js', import.meta.url), 'utf8')
  assert.match(index, /as MModePicker }/)
})

test('MP6: the colloquial names of the display configuration are gone from every source file', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
  const files = []
  const walk = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|vue)$/.test(e.name) && e.name !== 'labels.js') files.push(p) } }
  walk(root)
  const source = files.map((f) => readFileSync(f, 'utf8')).join('\n')
  for (const phrase of ['只开这块', '只留这块', '只保留这一块', '确保已开启', '只保留这一塊', '確保已開啟', '雜魚虛擬顯示器', '设为主屏', 'Only this on\'', 'Only this one\'', 'Make main\'']) assert.ok(!source.includes(phrase), `colloquial copy is back: ${phrase}`)
})

test('MP7: the display configuration is named with the terms of the system settings, each with the effect it has', () => {
  const zh = displayTreeTexts('zh').prep
  const en = displayTreeTexts('en').prep
  assert.deepEqual([zh.no_operation, zh.ensure_active, zh.ensure_primary, zh.ensure_only_display, zh.ensure_secondary], ['不更改', '激活此显示器', '设为主显示器', '仅使用此显示器', '扩展显示器'])
  assert.deepEqual([en.no_operation, en.ensure_active, en.ensure_primary, en.ensure_only_display, en.ensure_secondary], ['No change', 'Activate this display', 'Set as main display', 'Use only this display', 'Extend displays'])
  assert.equal(zh.effect.ensure_only_display, '断开其他显示器')
  assert.equal(en.effect.ensure_only_display, 'Disconnects all other displays')
  for (const key of Object.keys(zh).filter((k) => k.startsWith('ensure_') || k === 'no_operation')) assert.ok(zh.effect[key] && en.effect[key], key)
})
