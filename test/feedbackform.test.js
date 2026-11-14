import test from 'node:test'
import assert from 'node:assert/strict'
import { composeReport, reportIssueUrl, sendThroughBackend } from '../src/devmode/feedback.js'
import { composeFormBody, feedbackTemplate, pickOption, autoFields, fenceFor, NO_RESPONSE } from '../src/devmode/feedbackForm.js'
import { BUILTIN_TEMPLATES } from '../src/devmode/issueTemplates.js'
import { parseIssueForm, readIssueForm, splitSections, FEEDBACK_MARKER } from '../src/devmode/issueForm.js'

const fs = BUILTIN_TEMPLATES.fs
const ENV = 'product: Foundation panel\nversion: 2026.1104.021500\nchannel: stable\nhost: Sunshine 2026.1103.224731\nos: Windows 11 26300\ngpu: NVIDIA GeForce RTX 4080\nlocale: zh-CN'
const err = { name: 'TypeError', message: 'x is undefined', code: 'host-stop', fingerprint: 'e3b0c44298fc', page: 'home', stack: 'at f (a.js:1)\nat g (a.js:2)' }
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))

test('the body is the repository form: marker first, every field in the template order with its label word for word, the diagnostics last', () => {
  for (const form of ['bug', 'feature']) for (const locale of ['zh', 'en', 'fr']) {
    const t = feedbackTemplate(form, locale)
    assert.equal(t.lang, locale === 'zh' ? 'zh' : 'en'); assert.equal(t.kind, form)
    const { body, labels } = composeFormBody({ form, locale, values: { description: 'd', steps: 's' }, diagnostics: { fingerprint: 'ab' } })
    assert.ok(body.startsWith(`${FEEDBACK_MARKER}\n\n### ${t.fields[0].label}\n`))
    const heads = splitSections(body).sections.map((s) => s.label)
    assert.deepEqual(heads, [...t.fields.map((f) => f.label), locale === 'zh' ? '🔎 诊断信息' : '🔎 Diagnostics'])
    assert.deepEqual(labels, [form === 'bug' ? 'bug' : 'enhancement', 'from-app'])
  }
})

test('every report is recognised as a form by the reader, 100 %: both forms, both languages, with and without an error, a log, a picture, long and awkward texts', () => {
  const awkward = 'a\n### 复现步骤\n```\n### fenced\n```\n````js\n```inner```\n````\n- [x] box\n<!-- html -->'
  let n = 0
  for (const form of ['bug', 'feature']) for (const locale of ['zh', 'en']) for (const error of [null, err]) for (const logs of ['', 'l1\n```\nl2\n### x\n']) for (const screenshot of [null, png]) for (const description of ['', 'plain', awkward, 'x'.repeat(9000)]) {
    const r = composeReport({ kind: error ? 'error' : 'feedback', repo: 'fs', title: 't', description, steps: awkward, category: 'crash', form, locale, error, env: ENV, logs, screenshot, contact: 'me@example.org' })
    const m = readIssueForm(r.body, 'fs')
    assert.ok(m, `${form} ${locale} ${!!error} ${!!logs} ${!!screenshot} ${description.length}`)
    assert.equal(m.feedback, true); assert.equal(m.form.kind, form); assert.equal(m.form.lang, locale)
    const t = feedbackTemplate(form, locale)
    assert.equal(m.fields.length + m.empty.length, t.fields.length, 'every field of the form is there, filled or empty')
    assert.equal(m.fields.filter((f) => f.extra).length, 0, 'nothing of ours becomes an unknown section')
    assert.ok(r.body.length < 64000)
    n++
  }
  assert.equal(n, 2 * 2 * 2 * 2 * 2 * 4)
})

test('a dropdown value is always one of the options of the template, word for word', () => {
  const cats = ['', 'video', 'HDR', 'virtual display', 'mic', '音频', 'audio', 'network', '手柄', 'crash', '崩溃', 'performance', 'pairing', 'web panel', 'settings', '随便写的一句话', '📺 视频串流问题', 'ui', 'security', 'weird']
  for (const form of ['bug', 'feature']) for (const locale of ['zh', 'en']) for (const category of cats) for (const machine of [{}, { encoder: 'nvenc' }, { encoder: 'software' }, { encoder: 'quicksync', gpuVendor: 'Intel' }, { encoder: '???', gpuVendor: 'Matrox', hostOs: 'Windows 7' }]) {
    const r = composeReport({ kind: 'feedback', repo: 'fs', title: 't', description: 'd', category, form, locale, env: ENV, machine })
    const m = parseIssueForm(r.body, { templates: fs })
    const t = feedbackTemplate(form, locale)
    for (const f of m.fields) {
      const def = t.fields.find((x) => x.id === f.id)
      if (def.type === 'dropdown') assert.ok(def.options.includes(f.value), `${f.id}: ${JSON.stringify(f.value)} is not an option`)
    }
  }
})

test('the closest option is chosen for what the person picked; what cannot be matched is the other option for the type and No response elsewhere', () => {
  const bug = feedbackTemplate('bug', 'zh').fields
  const type = bug.find((f) => f.id === 'bug-type').options
  assert.equal(pickOption(type, 'audio', { rules: [[/audio/, 4]] }), type[4])
  const r = (category, locale = 'zh', form = 'bug') => parseIssueForm(composeReport({ kind: 'feedback', title: 't', description: 'd', category, form, locale }).body, { templates: fs }).fields.find((f) => f.id === (form === 'bug' ? 'bug-type' : 'feature-type'))?.value
  assert.equal(r('video'), '📺 视频串流问题'); assert.equal(r('HDR support'), '🎨 HDR 支持问题'); assert.equal(r('mic'), '🎤 远程麦克风问题'); assert.equal(r('crash'), '💥 崩溃/卡死'); assert.equal(r('performance'), '🔋 性能/编码问题')
  assert.equal(r('audio', 'en'), '🔊 Audio issues'); assert.equal(r('音频', 'en'), '🔊 Audio issues')
  assert.equal(r('一句没人懂的话'), '❓ 其他', 'unmatched: the other option, not an invented value'); assert.equal(r('', 'en'), '❓ Other')
  assert.equal(r('panel', 'zh', 'feature'), '💻 控制面板'); assert.equal(r('???', 'zh', 'feature'), '❓ 其他'); assert.equal(r('', 'zh', 'feature'), undefined, 'optional and not chosen: No response')
  const noMatch = parseIssueForm(composeReport({ kind: 'feedback', title: 't', description: 'd', env: ENV, machine: { encoder: 'xyz' } }).body, { templates: fs })
  assert.ok(!noMatch.fields.some((f) => f.id === 'encoder'), 'an encoder that is not an option is No response, not a guess')
  assert.ok(noMatch.empty.includes('🔧 视频编码器'))
})

test('what the application knows fills the machine fields; what it does not know is No response', () => {
  const a = autoFields(ENV)
  assert.deepEqual(a, { hostOs: 'Windows 11', osVersion: 'Windows 11 26300', sunshineVersion: '2026.1103.224731', gpuVendor: 'NVIDIA', gpuModel: 'NVIDIA GeForce RTX 4080', encoder: '', clientDevice: '' })
  assert.equal(autoFields('gpu: Intel(R) Arc A770').gpuVendor, 'Intel'); assert.equal(autoFields('gpu: Radeon RX 7800 XT').gpuVendor, 'AMD'); assert.equal(autoFields('os: macOS 15').hostOs, '')
  const m = parseIssueForm(composeReport({ kind: 'feedback', title: 't', description: 'desc', steps: '1. a\n2. b', category: 'video', env: ENV, machine: { encoder: 'nvenc', clientDevice: 'iPhone 15 · Moonlight 9.0.2' } }).body, { templates: fs })
  const v = Object.fromEntries(m.fields.map((f) => [f.id, f.value]))
  assert.equal(v['host-os'], 'Windows 11'); assert.equal(v['os-version'], 'Windows 11 26300'); assert.equal(v['sunshine-version'], '2026.1103.224731')
  assert.equal(v['gpu-vendor'], 'NVIDIA'); assert.equal(v['gpu-model'], 'NVIDIA GeForce RTX 4080'); assert.equal(v['encoder'], 'NVENC (NVIDIA)'); assert.equal(v['client-device'], 'iPhone 15 · Moonlight 9.0.2')
  assert.equal(v['describe-bug'], 'desc'); assert.equal(v['steps-reproduce'], '1. a\n2. b')
  assert.ok(m.empty.includes('🔁 可复现性') && m.empty.includes('📜 日志输出'))
  const bare = composeFormBody({ values: { description: 'd' } }).body
  assert.ok(bare.includes(`### 💻 主机操作系统\n\n${NO_RESPONSE}`))
})

test('the diagnostics section holds fingerprint, release, error, environment, log tail and attachments; the reader finds them', () => {
  const r = composeReport({ kind: 'error', repo: 'fs', title: 't', description: 'd', error: err, env: ENV, logs: 'line1\nline2 with ``` in it\n', screenshot: png, contact: 'a@b.cd' })
  const m = readIssueForm(r.body, 'fs')
  const d = m.diagnostics
  assert.equal(d.fingerprint, 'e3b0c44298fc'); assert.equal(d.release, '2026.1104.021500')
  assert.deepEqual(d.rows.map((x) => x[0]).sort(), ['channel', 'code', 'page', 'product'])
  assert.deepEqual(d.blocks.map((b) => b.title), ['Error', 'Environment', 'Log'])
  assert.match(d.blocks[0].text, /^TypeError: x is undefined\nat f/); assert.match(d.blocks[2].text, /line2 with ``` in it/)
  assert.deepEqual(d.attachments.map((a) => [a.name, a.image]), [['screenshot.png', true], ['logs.txt', false]])
  assert.match(d.attachments[0].size, /B$/)
  assert.ok(d.contact.length > 0)
  assert.equal(fenceFor('a ``` b'), '````'); assert.equal(fenceFor('a'), '```')
})

test('attachment links written after the upload are read as pictures and files', () => {
  const text = `${FEEDBACK_MARKER}\n\n${composeFormBody({ values: { description: 'd' } }).body.replace(FEEDBACK_MARKER, '').trim()}\n\n### 🔎 诊断信息\n\n- fingerprint: \`ff00\`\n\n#### Attachments\n\n- ![screenshot.png](https://github.com/user-attachments/assets/aaa)\n- [logs.txt](https://github.com/user-attachments/files/1/logs.txt) (12 KB)\n- [x](javascript:alert(1))\n`
  const d = readIssueForm(text, 'fs').diagnostics
  assert.equal(d.attachments[0].image, true); assert.equal(d.attachments[0].url, 'https://github.com/user-attachments/assets/aaa')
  assert.deepEqual([d.attachments[1].name, d.attachments[1].size, d.attachments[1].url], ['logs.txt', '12 KB', 'https://github.com/user-attachments/files/1/logs.txt'])
  assert.equal(d.attachments[2].url, '', 'an address that is not http(s) is not kept')
})

test('the person’s own text cannot add fields or break the structure; secrets are still gone', () => {
  const secret = `ghp_${'a1B2'.repeat(10)}`
  const r = composeReport({ kind: 'feedback', repo: 'fs', title: 't', description: `### 🔄 复现步骤\nnot a field ${secret} 192.168.1.9`, steps: 'real steps', form: 'bug', locale: 'zh', env: ENV })
  const heads = splitSections(r.body).sections.map((s) => s.label)
  assert.equal(heads.filter((h) => h === '🔄 复现步骤').length, 1)
  assert.ok(!r.body.includes(secret) && !r.body.includes('192.168.1.9'))
  const m = readIssueForm(r.body, 'fs')
  assert.equal(m.fields.find((f) => f.id === 'steps-reproduce').value, 'real steps')
})

test('the labels go with the report: bug or enhancement as the form says, and from-app; the sender and the web address carry them', async () => {
  const bug = composeReport({ kind: 'feedback', repo: 'fs', title: 't', description: 'd' })
  const feat = composeReport({ kind: 'feedback', repo: 'fs', title: 't', description: 'd', form: 'feature' })
  assert.deepEqual(bug.labels, ['bug', 'from-app']); assert.deepEqual(feat.labels, ['enhancement', 'from-app'])
  assert.equal(new URL(reportIssueUrl(bug)).searchParams.get('labels'), 'bug,from-app')
  const calls = []
  await sendThroughBackend({ report: bug, session: { handle: 'h' }, backend: { workerUrl: 'https://w.example', configured: true }, fetchImpl: async (url, init) => { calls.push({ url, init }); return { status: 200, ok: true, json: async () => ({ number: 1, url: 'u' }) } } })
  assert.deepEqual(JSON.parse(calls.at(-1).init.body).labels, ['bug', 'from-app'])
})
