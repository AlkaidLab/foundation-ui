import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// A chart that reads its width with getBoundingClientRect() in onMounted forces a layout of everything the page has mounted so far, once per chart: the first mount of the overview (a spark in
// every tile) and of 日志与诊断 (a chart beside 1500 log rows) each held one task of 51-62 ms. The ResizeObserver delivers the first width before the first paint of the same frame, so the charts do not read it themselves.
test('a chart takes its width from the ResizeObserver, not from a synchronous read while the page is mounting', () => {
  for (const f of ['MChart.vue', 'MChartX.vue', 'MDashSpark.vue']) {
    const src = fs.readFileSync(new URL(`../src/vue/${f}`, import.meta.url), 'utf8')
    const mounted = src.match(/onMounted\(\(\) => \{[^\n]*\n?/)[0]
    assert.ok(/new ResizeObserver\(read\)/.test(mounted), f)
    assert.equal((mounted.match(/\bread\(\)/g) || []).length, 1, `${f}: read() is called once, and only without an observer`)
    assert.match(mounted, /typeof ResizeObserver === 'undefined'\) read\(\)/, `${f}: the read stays only where there is no observer`)
  }
})

test('the log viewer lays out the tail of the log at its first mount, and 「显示更早」 adds more', () => {
  const src = fs.readFileSync(new URL('../src/vue/MLogViewer.vue', import.meta.url), 'utf8')
  assert.match(src, /const LIMIT_FIRST = 500/)
  assert.match(src, /const limit = ref\(LIMIT_FIRST\)/)
  assert.match(src, /limit \+= LIMIT_STEP/)
})

test('the slider does not read the width of its track for every stop while it renders', () => {
  const src = fs.readFileSync(new URL('../src/vue/MSlider.vue', import.meta.url), 'utf8')
  assert.ok(!/nearHandle = [^\n]*clientWidth/.test(src), 'nearHandle takes the cached width')
  assert.match(src, /const nearHandle = [^\n]*trackW\.value/)
  assert.match(src, /new ResizeObserver\(/)
})
