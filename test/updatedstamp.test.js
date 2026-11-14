import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { stampLabel, stampTexts } from '../src/stamp/index.js'
import { providePageStamp, usePageStamp } from '../src/vue/usePageStamp.js'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const at = (hour, minute = 0) => new Date(2026, 10, 11, hour, minute, 0).getTime()

test('the stamp: just now, minutes ago, a time today, a date on another day; nothing without a time', () => {
  const now = at(14, 5)
  assert.equal(stampLabel(now - 20_000, { now, locale: 'zh' }), '刚刚更新')
  assert.equal(stampLabel(at(14, 2), { now, locale: 'zh' }), '更新于 3 分钟前')
  assert.equal(stampLabel(at(14, 2), { now, locale: 'en' }), 'Updated 3 min ago')
  assert.match(stampLabel(at(9, 30), { now, locale: 'zh' }), /^更新于 \d{1,2}:30$/)
  assert.match(stampLabel(at(9, 30), { now, locale: 'en' }), /^Updated at /)
  assert.match(stampLabel(new Date(2026, 10, 9, 14, 5).getTime(), { now, locale: 'zh' }), /^更新于 11 月 9 日 14:05$/)
  assert.equal(stampLabel(0, { now }), '')
  assert.equal(stampLabel(undefined, { now }), '')
  assert.equal(stampLabel(NaN, { now }), '')
})

test('every language reads the stamp: Chinese and English are written, the rest read English', () => {
  assert.equal(stampTexts('zh_TW').refresh, '刷新')
  assert.equal(stampTexts('de').refresh, 'Refresh')
  assert.equal(stampTexts('en_GB').now, 'Updated just now')
})

test('a component inside a page registers its time and refresh with the page; outside a page it does nothing', async () => {
  let slot = null
  let refreshed = 0
  const time = ref(0)
  const Child = { setup() { usePageStamp({ at: time, refresh: () => { refreshed++ }, locale: 'zh' }); return () => h('i') } }
  const Page = { setup() { slot = providePageStamp(); return () => h('div', [h(Child)]) } }
  time.value = 1234
  await renderToString(createSSRApp(Page))
  assert.equal(slot.at, 1234)
  assert.equal(slot.locale, 'zh')
  slot.refresh()
  assert.equal(refreshed, 1)
  const Lone = { setup() { assert.equal(usePageStamp({ at: time }), null); return () => h('i') } }
  await renderToString(createSSRApp(Lone))
})

test('the stamp has one place: the trailing end of the page header, before the page actions', () => {
  const page = read('vue/MPage.vue')
  assert.match(page, /<div class="m-page__bar-actions"><MUpdatedStamp [^>]*\/><slot name="actions" \/><\/div>/)
  const css = read('css/layout.css')
  assert.match(css, /\.m-stamp \{/)
  assert.ok(!/m-stamp[^{]*\{[^}]*animation:[^}]*\b(spin|rotate)/.test(css), 'no fast spinner')
})

test('the pages that show fetched data pass their time to the page header', () => {
  assert.match(read('vue/MComponentStatus.vue'), /<MPage [^>]*:updated="latest"/)
  assert.match(read('vue/MServiceStatus.vue'), /<MPage [^>]*:updated="readAt"/)
  assert.match(read('vue/MDoctor.vue'), /<MPage [^>]*:updated="state\.finishedAt/)
  assert.match(read('vue/MDiagnostics.vue'), /<MPage [^>]*:updated="readAt"/)
  assert.match(read('vue/MAbout.vue'), /<MPage [^>]*:updated="update\.checkedAt/)
  assert.match(read('vue/MNetworkOverview.vue'), /usePageStamp\(\{ at: \(\) => Date\.parse\(props\.report\?\.checkedAt\)/)
  assert.match(read('vue/MReachOverview.vue'), /usePageStamp\(/)
  assert.match(read('vue/devmode/DevIssues.vue'), /usePageStamp\(\{ at: \(\) => status\.value\.at/)
})
