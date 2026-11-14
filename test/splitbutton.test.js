// Split button (SplitButtonSmallTokens, MDC SplitButton.md) and FAB menu (MDC FloatingActionButtonMenu.md): their open states, and where they are used.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const css = read('css/expressive.css'), split = read('vue/MSplitButton.vue'), fab = read('vue/MFabMenu.vue')

test('split button: 2 px apart, inner corners 4 (12 hovered or focused), the trailing button round and its arrow turned over while the menu is open', () => {
  assert.match(css, /\.m-split \{ display: inline-flex; gap: 2px; \}/)
  assert.match(css, /\.m-split \{ --m-split-inner: 4px; \}/)
  assert.match(css, /\.m-split:is\(:hover, :focus-within\) \{ --m-split-inner: 12px; \}/)
  assert.match(css, /\.m-split\.is-open \.m-split__more \{ border-radius: 20px; \}/)
  assert.match(css, /\.m-split\.is-open \.m-split__more \.m-icon \{ transform: rotate\(180deg\); \}/)
  assert.match(css, /\.m-split__main \{ padding: 0 12px 0 16px;/) // LeadingButtonLeadingSpace 16, TrailingSpace 12
  assert.match(css, /\.m-split__more \.m-icon \{ font-size: 22px;/) // TrailingIconSize 22
  assert.match(split, /:aria-expanded="String\(open\)"/)
  assert.match(split, /@opening="open = true" @closing="open = false" @closed="open = false"/)
})

test('FAB menu: 56 px items; the first item takes the focus when it opens, the FAB gets it back when it closes', () => {
  assert.match(css, /\.m-fabmenu__item \{[^}]*height: 56px;/)
  assert.match(fab, /if \(v\) root\.value\?\.querySelector\('\.m-fabmenu__item'\)\?\.focus\(\); else if \(was && root\.value\?\.contains\(document\.activeElement\)\) fab\.value\?\.focus\(\)/)
})

test('检查更新 is a split button', () => {
  // 导出诊断 stays a row of the diagnostics list (copy summary, report and export are rows of the same group); the split button is 检查更新 on 关于
  const about = read('vue/MAbout.vue')
  assert.equal((about.match(/<MSplitButton v-if="updateChannel"/g) || []).length, 2)
  assert.match(about, /@select="\(item\) => emit\('channel-change', item\.id\)"/)
})
