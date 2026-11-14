import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { appearanceTexts } from '../src/vue/appearanceTexts.js'
import { ROW_IDS, rowKeywords, rowLines } from '../src/settings/rowLines.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const ap = read('src/vue/MAppearance.vue')
// 2026-11-10: 个性化 of the Panel is four pages (主题, 磨砂与动效, 概览, 托盘图标) like 输入与外设; MAppearance draws the sections of one `part`
const sectionOf = (needle) => { const at = ap.indexOf(needle); assert.ok(at > 0, needle); return at }
const template = ap.slice(ap.indexOf('<template>'))

test('MAppearance takes a part: without one every section shows (the Web UI), the essential form is unchanged', () => {
  assert.match(ap, /part: \{ type: String, default: '' \}/)
  assert.match(ap, /const on = \(name\) => !props\.part \|\| props\.part === name/)
  assert.match(ap, /essential: \{ type: Boolean, default: false \}/)
})

test('each section belongs to one part: theme (preview, background, colour style, colour, light or dark, icon style, interface), frost (frost groups, fade, animations), home (the overview tiles)', () => {
  assert.match(template.slice(template.lastIndexOf('<div', template.indexOf('ref="previewEl"')), template.indexOf('ref="previewEl"')), /on\('theme'\) \|\| on\('frost'\)/, 'the preview is on the theme page and the frost page')
  const bg = template.lastIndexOf('<section', template.indexOf('<h4>{{ T.background }}'))
  assert.match(template.slice(bg, bg + 80), /v-if="on\('theme'\)"/)
  assert.match(template, /<template v-if="wall && on\('frost'\)">\s*<section v-for="g in groups"/)
  const cs = template.lastIndexOf('<section', template.indexOf('<h4>{{ T.colourStyle }}'))
  assert.match(template.slice(cs, cs + 80), /v-if="on\('theme'\)"/)
  const col = template.lastIndexOf('<section', template.indexOf('<h4>{{ T.colour }}'))
  assert.match(template.slice(col, col + 80), /v-if="on\('theme'\)"/)
  assert.match(template, /<template v-if="on\('frost'\)">\s*<h4>\{\{ T\.motion \}\}<\/h4>/, 'the animations are on the frost page')
  assert.match(template, /<template v-if="showIcons && on\('theme'\)"><h4>\{\{ T\.iconStyle \}\}/, 'the icon style is on the theme page')
  assert.match(template, /<section v-if="!essential && on\('theme'\)" class="m-ap__row m-ap__frost">\s*<h4>\{\{ T\.look \}\}/)
  assert.match(template, /<section v-if="!essential && on\('home'\)" class="m-ap__row m-ap__tiles">/)
  // the sections of the three parts are the whole of what the page had: nothing was dropped
  for (const h of ['T.background', 'T.colourStyle', 'T.colour', 'T.mode', 'T.darkStyle', 'T.motion', 'T.iconStyle', 'T.look', 'T.overview', 'T.clockFace', 'T.density', 'T.heroStyle', 'T.frostHome']) assert.ok(template.includes(`{{ ${h} }}`) || ap.includes(h), h)
})

test('the frost page with a solid background says why it is empty and offers the wallpaper', () => {
  const at = sectionOf(`<section v-else-if="part === 'frost'"`)
  const block = ap.slice(at, ap.indexOf('</section>', at))
  assert.ok(block.includes('T.frostNeedsWallpaper') && block.includes("ap.set({ background: 'wallpaper' })") && block.includes('T.useWallpaper'))
  for (const l of ['zh', 'en']) { const T = appearanceTexts(l); for (const k of ['frost', 'frostNeedsWallpaper', 'useWallpaper']) assert.ok(T[k] && T[k].length > 1, `${l} ${k}`) }
})

test('the four pages have a row each with a second line in both languages; a search for a setting finds the page that holds it', () => {
  const rows = ['appearance-theme', 'appearance-frost', 'appearance-home', 'appearance-tray']
  for (const id of rows) assert.ok(ROW_IDS.includes(id), id)
  for (const locale of ['zh', 'en']) { const lines = rowLines({ locale }); for (const id of rows) assert.ok(lines[id] && lines[id].length > 8, `${locale} ${id}`) }
  const holds = (word) => rows.filter((id) => rowKeywords(id).toLowerCase().includes(word.toLowerCase()))
  assert.deepEqual(holds('托盘'), ['appearance-tray'])
  assert.deepEqual(holds('壁纸'), ['appearance-theme'])
  assert.deepEqual(holds('模糊'), ['appearance-frost'])
  assert.deepEqual(holds('动画'), ['appearance-frost'])
  assert.deepEqual(holds('智能磁贴'), ['appearance-home'])
  assert.deepEqual(holds('时钟'), ['appearance-home'])
  assert.deepEqual(holds('圆角'), ['appearance-theme'])
  assert.deepEqual(holds('wallpaper'), ['appearance-theme'])
  assert.deepEqual(holds('blur'), ['appearance-frost'])
  assert.deepEqual(holds('tray'), ['appearance-tray'])
  assert.deepEqual(holds('主页'), ['appearance-home'], 'the overview is also looked for as the home page')
})

test('the entry named 个性化 is found by its name only: the words of what is inside belong to the pages', () => {
  const list = read('src/vue/useSettingsList.js')
  assert.ok(list.includes('keywords: altLabel(c.labelKey) }'))
})
