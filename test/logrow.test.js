import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { shortSource } from '../src/devmode/logrow.js'

// 开发者 › 实时日志: the source column has a width of its own and never runs over the message ().
const css = fs.readFileSync(new URL('../src/css/devmode.css', import.meta.url), 'utf8')
const vue = fs.readFileSync(new URL('../src/vue/devmode/DevLogs.vue', import.meta.url), 'utf8')

test('a long source keeps its end behind a leading ellipsis, a short one is untouched', () => {
  assert.equal(shortSource('src\\clipboard.rs:1296'), 'src\\clipboard.rs:1296')
  const long = 'C:\\alk-tools\\rust\\cargo-home\\registry\\src\\tauri-2.12.4\\src\\manager\\mod.rs:418'
  const short = shortSource(long); assert.equal(short.length, 30); assert.ok(short.startsWith('…') && short.endsWith('manager\\mod.rs:418'))
  assert.equal(shortSource('', 30), ''); assert.equal(shortSource(null), '')
})

test('the columns: time, level and source have widths of their own, the source truncates, the message starts after it and wraps (CJK too)', () => {
  assert.match(css, /\.dm-logrow \{ display: grid; grid-template-columns: 96px 56px minmax\(120px, 200px\) minmax\(0, 1fr\);/)
  assert.match(css, /\.dm-logsrc \{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; \}/)
  assert.match(css, /\.dm-logmsg \{ min-width: 0; overflow-wrap: anywhere; white-space: pre-wrap; \}/)
  assert.match(css, /\.dm-logrow > span \{ min-width: 0; \}/)
  // narrow: the source column goes (its text stays the tooltip of nothing: the message keeps the room)
  assert.match(css, /@media \(max-width: 700px\) \{[\s\S]*\.dm-logrow \{ grid-template-columns: 78px 48px minmax\(0, 1fr\); \}[\s\S]*\.dm-logrow > :nth-child\(3\) \{ display: none; \}/)
  assert.match(vue, /<span class="dm-dim dm-logsrc" :title="l\.src">\{\{ shortSource\(l\.src\) \}\}<\/span><span class="dm-logmsg" data-redact="path">/)
})
