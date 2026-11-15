import test from 'node:test'
import assert from 'node:assert/strict'
import { parentPlace } from '../src/settings/index.js'

// 输入 is four pages of 输入与外设 (手柄, 键盘, 鼠标与触控, USB 转发); there is no 高级 page and no row 输入 in the stream settings

test('a page inside the gamepad page belongs to 手柄; a place belongs to itself', () => {
  assert.equal(parentPlace('input', 'keyboard'), 'keyboard'); assert.equal(parentPlace('input', 'gamepad-pergame'), 'gamepad'); assert.equal(parentPlace('input', 'ds5-lightbar'), 'gamepad')
  assert.equal(parentPlace('display', 'modes'), 'modes'); assert.equal(parentPlace('general', 'prep'), '')
})

test('the one page is called 诊断与日志, and a search for either old name still finds its row', async () => {
  const fs = await import('node:fs')
  const src = fs.readFileSync(new URL('../src/diagnostics/texts.js', import.meta.url), 'utf8')
  assert.match(src, /title: 'Diagnostics and logs',/); assert.match(src, /title: '诊断与日志',/)
  assert.ok(!/日志与诊断|Logs and diagnostics/.test(src))
  const { rowKeywords, rowLines, ROW_IDS } = await import('../src/settings/rowLines.js')
  assert.ok(!ROW_IDS.includes('troubleshooting'), 'the two rows are one')
  assert.match(rowLines({ locale: 'zh' }).diagnostics, /AI 诊断/)
  assert.match(rowLines({ locale: 'zh' }).diagnostics, /重启/)
  assert.ok(rowKeywords('diagnostics').includes('日志与排错') && rowKeywords('diagnostics').includes('Logs and troubleshooting'))
  const page = fs.readFileSync(new URL('../src/vue/MDiagnostics.vue', import.meta.url), 'utf8')
  assert.ok(page.indexOf("has('restart')") < page.indexOf('m-diag__tabs'), 'restart sits at the top')
  assert.ok(!/v-if="panel"/.test(page), 'panel-only behaviour is a fact passed in, not a second page')
})
