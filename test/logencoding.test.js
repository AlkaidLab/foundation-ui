import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeLogBytes, readLogResponse } from '../src/diagnostics/index.js'
import { parseErrorLog } from '../src/vue/homeModel.js'
import { buildCatalogue } from '../src/vue/homeCatalogue.js'
import { CATALOGUE_TEXTS } from '../src/vue/homeCatalogueTexts.js'

// "系统找不到指定的文件。" in GBK, as a host log written before it wrote UTF-8 carries it
const GBK = [0xcf, 0xb5, 0xcd, 0xb3, 0xd5, 0xd2, 0xb2, 0xbb, 0xb5, 0xbd, 0xd6, 0xb8, 0xb6, 0xa8, 0xb5, 0xc4, 0xce, 0xc4, 0xbc, 0xfe, 0xa1, 0xa3]
const WORDS = '系统找不到指定的文件。'
const head = (s) => [...Buffer.from(s, 'utf8')]
const gbkLog = () => Uint8Array.from([...head('[2026-11-02 10:00:00.000]: Info: start\n[2026-11-02 10:00:01.000]: Error: '), ...GBK, 0x0a, ...head('[2026-11-02 10:00:02.000]: Warning: 慢帧\n')])
const LINES = `[2026-11-02 10:00:00.000]: Info: start\n[2026-11-02 10:00:01.000]: Error: ${WORDS}\n[2026-11-02 10:00:02.000]: Warning: 慢帧\n`

test('a GBK log line is read as GBK and a UTF-8 line beside it is kept', () => {
  const text = decodeLogBytes(gbkLog())
  assert.ok(!text.includes('�'))
  assert.equal(text, LINES)
})

test('a UTF-16 log (with a BOM, or without one) is read whole', () => {
  const le = Buffer.from('﻿' + LINES, 'utf16le')
  assert.equal(decodeLogBytes(new Uint8Array(le)), LINES)
  assert.equal(decodeLogBytes(new Uint8Array(Buffer.from(LINES, 'utf16le'))), LINES)
  const be = Buffer.from(LINES, 'utf16le').swap16()
  assert.equal(decodeLogBytes(new Uint8Array(be)), LINES)
})

test('what a home fetch reads goes through the same decoder: the response, the 错误 rows and the 日志 card never hold U+FFFD', async () => {
  for (const bytes of [gbkLog(), new Uint8Array(Buffer.from('﻿' + LINES, 'utf16le'))]) {
    const text = await readLogResponse(new Response(bytes))
    assert.ok(!text.includes('�'))
    const rows = parseErrorLog(text)
    assert.ok(rows.rows.some((r) => r.text.includes(WORDS)))
    const T = CATALOGUE_TEXTS.zh || CATALOGUE_TEXTS.en
    const card = buildCatalogue({ logText: text, logs: rows, now: Date.parse('2026-11-02T12:00:00Z') }, T).data
    assert.ok(!JSON.stringify(card.errors || {}).includes('�') && !JSON.stringify(card.logs || {}).includes('�'))
    assert.ok(JSON.stringify(card.logs).includes(WORDS))
  }
})

test('a response without arrayBuffer falls back to its text', async () => {
  assert.equal(await readLogResponse({ text: async () => 'plain' }), 'plain')
})
