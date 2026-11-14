import assert from 'node:assert/strict'
import test from 'node:test'
import { parsePanelLogs } from '../src/diagnostics/adapters.js'
import { filterRows } from '../src/diagnostics/logs.js'
import { diagnosticsTexts } from '../src/diagnostics/texts.js'

// The old log console filtered the panel's records by the file that wrote them.
const records = parsePanelLogs([
  { timestamp: '2026-11-02 10:00:01.000', level: 'info', message: 'one', file: 'src/tray.rs', line: 4 },
  { timestamp: '2026-11-02 10:00:02.000', level: 'warn', message: 'two', file: 'src/vdd.rs', line: 9 },
  { timestamp: '2026-11-02 10:00:03.000', level: 'info', message: 'three', file: 'src/tray.rs', line: 12 },
  { timestamp: '2026-11-02 10:00:04.000', level: 'info', message: 'no file' },
])

test('the file filter keeps the records of that file, and combines with the other filters', () => {
  assert.equal(filterRows(records, {}).rows.length, 4)
  assert.equal(filterRows(records, { files: ['src/tray.rs'] }).rows.length, 2)
  assert.equal(filterRows(records, { files: ['src/vdd.rs'] }).rows.length, 1)
  assert.equal(filterRows(records, { files: ['src/tray.rs'], query: 'three' }).rows.length, 1)
  assert.equal(filterRows(records, { files: [] }).rows.length, 4, 'an empty selection is no filter')
})

test('the file filter has words in both languages', () => {
  for (const locale of ['zh', 'en']) {
    const T = diagnosticsTexts(locale)
    assert.ok(T.sourceFile && T.allFiles, locale)
  }
})
