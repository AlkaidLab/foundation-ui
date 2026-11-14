import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { composeReport, errorDraft, withCarriedLogs } from '../src/devmode/feedback.js'
import { devReport, registerDevReport, openDevReport, closeDevReport } from '../src/vue/devmode/devReport.js'
import { devmodeTexts } from '../src/devmode/texts.js'

// The team: 「这个页面没有填充报错」: the report of an error opened with an empty 内容 and 「没有可附的内容」 on 日志, although the error report had its log lines.
const error = { name: 'TypeError', message: "Cannot read properties of undefined (reading 'value')", page: 'home', version: '2026.1110.004928', os: 'Windows', product: 'web', locale: 'zh', logs: '[2026-11-10 17:21:55.465]: Warning: Web UI: [<ip>] CSRF token missing or invalid for [/api/config]' }

test('the draft of an error report names the error, the page and the version, and leaves a line for the steps', () => {
  const zh = errorDraft(error, devmodeTexts('zh'))
  assert.equal(zh, "错误: TypeError: Cannot read properties of undefined (reading 'value')\n页面: home\n版本: 2026.1110.004928 (web · Windows)\n\n复现步骤：\n")
  const en = errorDraft(error, devmodeTexts('en'))
  assert.match(en, /^Error: TypeError: .*\nPage: home\nVersion: 2026\.1110\.004928 \(web · Windows\)\n\nSteps to reproduce:\n$/)
  assert.equal(errorDraft({ name: 'E' }, devmodeTexts('zh')), '错误: E\n\n复现步骤：\n', 'what the report lacks is left out, never printed as undefined')
  assert.equal(errorDraft({}, devmodeTexts('en')), 'Steps to reproduce:\n')
})

test('the log of the window and the log the error carried are both kept, once', () => {
  assert.equal(withCarriedLogs('', 'carried', '-- t --'), 'carried')
  assert.equal(withCarriedLogs('live', '', '-- t --'), 'live')
  assert.equal(withCarriedLogs('live', 'carried', '-- t --'), 'live\n\n-- t --\ncarried')
  assert.equal(withCarriedLogs('a carried b', 'carried', '-- t --'), 'a carried b', 'a live log that holds the carried lines is not doubled')
  assert.equal(withCarriedLogs(undefined, undefined), '')
})

test('opening the report with a draft and the carried logs: 内容 is filled and 日志 is not empty, with a window that cannot give its own log', async () => {
  registerDevReport({ capture: async () => null, logs: () => '', env: () => '' })
  closeDevReport()
  const words = devmodeTexts('zh')
  await openDevReport({ kind: 'error', error: { name: error.name, message: error.message, page: 'home' }, draft: { title: `${error.name}: ${error.message}`, description: errorDraft(error, words) }, carriedLogs: error.logs, carriedLabel: words.draftLogs })
  assert.equal(devReport.open, true)
  assert.match(devReport.draft.description, /复现步骤：/)
  assert.equal(devReport.logs, error.logs)
  const r = composeReport({ kind: 'error', repo: 'foundation-sunshine', title: devReport.draft.title, description: devReport.draft.description, error: devReport.error, logs: devReport.logs })
  assert.ok(r.files.some((f) => f.id === 'logs'), 'the log file rides along')
  assert.match(r.body, /复现步骤：/)
  assert.match(r.body, /CSRF token missing or invalid/)
  closeDevReport()
})

test('the error dialog hands its report, its words and its log lines to the sheet', () => {
  const src = readFileSync(new URL('../src/vue/MErrorHost.vue', import.meta.url), 'utf8')
  assert.match(src, /draft: fb \|\| !r \? null : \{ title: .*description: errorDraft\(r, words\) \}/)
  assert.match(src, /carriedLogs: fb \|\| !r \? '' : r\.logs/)
})
