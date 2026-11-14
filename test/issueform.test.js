import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createGithubClient, TEMPLATES_TTL_MS } from '../src/devmode/github.js'
import { BUILTIN_TEMPLATES } from '../src/devmode/issueTemplates.js'
import { parseYaml, parseTemplate, splitSections, isEmptyValue, parseChecks, extractImages, parseIssueForm, readIssueForm, mergeTemplates, looksLikeForm, labelPlain, FEEDBACK_MARKER } from '../src/devmode/issueForm.js'

const dir = new URL('./fixtures/issue-forms/', import.meta.url)
const body = (n) => readFileSync(new URL(`${n}.md`, dir), 'utf8')
const meta = (n) => JSON.parse(readFileSync(new URL(`${n}.meta.json`, dir), 'utf8'))
const yml = (f) => readFileSync(new URL(`templates/${f}`, dir), 'utf8')
const fs = BUILTIN_TEMPLATES.fs
const ids = (m) => m.fields.map((f) => f.id)

test('yaml: maps, lists, flow lists, quoted and block scalars of an Issue Form', () => {
  const y = parseYaml('name: "A: b"\nlabels: ["bug", \'x\']\nbody:\n  - type: dropdown\n    id: k\n    attributes:\n      label: "L"\n      options:\n        - "one"\n        - two\n    validations:\n      required: true\n  - type: markdown\n    attributes:\n      value: |\n        ## Hi\n\n        - [ ] a\n')
  assert.equal(y.name, 'A: b'); assert.deepEqual(y.labels, ['bug', 'x'])
  assert.deepEqual(y.body[0].attributes.options, ['one', 'two']); assert.equal(y.body[0].validations.required, true)
  assert.equal(y.body[1].attributes.value, '## Hi\n\n- [ ] a\n')
})

test('the built-in templates are the ISSUE_TEMPLATE files of foundation-sunshine as they were read (regenerate with scripts/gen-issue-templates.mjs when they change)', () => {
  const files = readdirSync(new URL('templates/', dir)).filter((f) => f.endsWith('.yml')).sort()
  assert.deepEqual(files, fs.map((t) => t.file).sort())
  for (const f of files) assert.deepEqual(parseTemplate(f, yml(f)), fs.find((t) => t.file === f), f)
  const bug = fs.find((t) => t.file === 'bug_report_zh.yml')
  assert.equal(bug.kind, 'bug'); assert.equal(bug.lang, 'zh'); assert.equal(bug.fields.length, 17); assert.deepEqual(bug.labels, ['bug'])
  assert.deepEqual(bug.fields.slice(0, 3).map((f) => [f.id, f.type, f.label, f.required]), [['bug-type', 'dropdown', '🏷️ 问题类型', true], ['describe-bug', 'textarea', '📝 问题描述', true], ['steps-reproduce', 'textarea', '🔄 复现步骤', true]])
  assert.equal(bug.fields.find((f) => f.id === 'logs').render, 'shell')
  assert.equal(fs.find((t) => t.file === 'feature_request_en.yml').kind, 'feature')
})

test('a real bug form (#1220, Chinese): every field is found by its label, in order, with the right role', () => {
  const m = parseIssueForm(body(1220), { templates: fs })
  assert.equal(m.form.file, 'bug_report_zh.yml'); assert.equal(m.form.kind, 'bug'); assert.equal(m.feedback, false)
  assert.deepEqual(ids(m), ['bug-type', 'describe-bug', 'steps-reproduce', 'affected-games', 'reproducibility', 'host-os', 'os-version', 'sunshine-version', 'gpu-vendor', 'gpu-model', 'encoder', 'client-device', 'settings-default', 'settings-adjusted-settings', 'logs', 'additional'])
  assert.deepEqual(m.empty, ['📸 截图/视频'], '_无_ is empty too')
  const by = Object.fromEntries(m.fields.map((f) => [f.id, f]))
  assert.equal(by['bug-type'].role, 'chip'); assert.equal(by['bug-type'].value, '🖥️ 虚拟显示器问题')
  assert.equal(by['sunshine-version'].role, 'env'); assert.equal(by['logs'].role, 'code'); assert.equal(by['logs'].code.lang, 'shell')
  assert.match(by['logs'].code.text, /vdd_prep/)
  assert.match(by['steps-reproduce'].value, /^1\. 双显卡笔记本/); assert.equal(by['describe-bug'].role, 'text')
  assert.ok(by['describe-bug'].value.includes('建议（任一）'), 'the text keeps its own list and paragraphs')
  assert.equal(by['settings-adjusted-settings'].code.text.split('\n').length, 4, 'a fenced block inside a text field is found')
  assert.equal(by['bug-type'].plain, '问题类型')
})

test('a feature request in English (#1232) and one in Chinese (#1228); No response fields are hidden and named', () => {
  const en = parseIssueForm(body(1232), { templates: fs })
  assert.equal(en.form.file, 'feature_request_en.yml'); assert.equal(en.form.kind, 'feature'); assert.equal(en.form.lang, 'en')
  assert.deepEqual(ids(en), ['feature-type', 'problem', 'solution', 'use-case', 'willing-to-test'])
  assert.equal(en.empty.length, 7); assert.ok(en.empty.includes('📊 Priority'))
  const zh = parseIssueForm(body(1228), { templates: fs })
  assert.equal(zh.form.file, 'feature_request_zh.yml'); assert.equal(zh.fields.find((f) => f.id === 'priority').value, '🔴 关键 - 没有它无法使用')
})

test('a form with fields taken out is still a form when most of its headings are fields (#1212), and the empty fence and None are kept apart', () => {
  const m = parseIssueForm(body(1212), { templates: fs })
  assert.equal(m.form.file, 'bug_report_zh.yml'); assert.ok(!ids(m).includes('bug-type'))
  assert.ok(m.fields.find((f) => f.id === 'describe-bug').value.includes('| 表面 | blur | 位置 |'), 'the table stays in its text')
  const none = parseIssueForm(body(1202), { templates: fs })
  assert.equal(none.fields.find((f) => f.id === 'encoder').value, 'None', 'a person who typed None gets None')
  assert.ok(none.empty.includes('📜 日志输出'), 'an empty shell fence is empty')
  assert.equal(parseIssueForm(body(1202), { templates: fs }).fields.find((f) => f.id === 'describe-bug').images.length, 1, 'the <img> is found')
})

test('not a form: a long proposal with its own headings, a one-line issue, a bug without headings fall back (null)', () => {
  for (const n of [1203, 1218, 1215]) assert.equal(parseIssueForm(body(n), { templates: fs }), null, String(n))
  assert.equal(parseIssueForm('', { templates: fs }), null); assert.equal(parseIssueForm(null, { templates: fs }), null)
  assert.equal(parseIssueForm(body(1220), { templates: [] }), null, 'no templates: nothing is known')
  assert.equal(looksLikeForm(body(1203)), true, 'the cheap test only says maybe'); assert.equal(looksLikeForm(body(1218)), false)
})

test('a form edited by hand so it half matches falls back; a lightly edited one does not', () => {
  const lines = body(1220).split('\n')
  // rename most labels the way a person who rewrote the template would
  let k = 0
  const half = lines.map((l) => (/^### /.test(l) && k++ % 3 !== 0 ? `${l} (我的)` : l)).join('\n')
  assert.equal(parseIssueForm(half, { templates: fs }), null)
  // one extra heading of their own after a text field is part of that text; one before everything is the lead
  const edited = `请先看这里\n\n${body(1220).replace('### 🔁 可复现性', '### 补充\n\n多一段\n\n### 🔁 可复现性')}`
  const m = parseIssueForm(edited, { templates: fs })
  assert.equal(m.lead, '请先看这里')
  assert.match(m.fields.find((f) => f.id === 'affected-games').value, /### 补充\n\n多一段/)
  // an extra heading after a dropdown stays a section of its own, in place
  const extra = parseIssueForm(body(1220).replace('### 🎨 显卡型号及驱动', '### 备注\n\n多一段\n\n### 🎨 显卡型号及驱动'), { templates: fs })
  assert.deepEqual(extra.fields.slice(8, 11).map((f) => f.label), ['🎨 显卡厂商', '备注', '🎨 显卡型号及驱动'].slice(0, 3).map((l) => l))
  assert.equal(extra.fields.find((f) => f.label === '备注').extra, true)
})

test('headings inside a fenced block do not split the body; CRLF bodies read the same; the label may lose its emoji', () => {
  const text = '### 📝 问题描述\n\n```md\n### 🔄 复现步骤\nnot a field\n```\n\n### 🔄 复现步骤\n\n1. a\n\n### 🏷️ 问题类型\n\n❓ 其他\n'
  assert.deepEqual(splitSections(text).sections.map((s) => s.label), ['📝 问题描述', '🔄 复现步骤', '🏷️ 问题类型'])
  const crlf = body(1220).replace(/\n/g, '\r\n')
  assert.deepEqual(ids(parseIssueForm(crlf, { templates: fs })), ids(parseIssueForm(body(1220), { templates: fs })))
  const plain = body(1220).replace(/^### \S+ /gm, '### ')
  assert.equal(parseIssueForm(plain, { templates: fs }).form.file, 'bug_report_zh.yml')
  assert.equal(labelPlain('🏷️ 问题类型'), '问题类型')
})

test('values: empty marks, checkboxes, pictures, code', () => {
  for (const e of ['', '  ', '_No response_', '_无_', '_暂无_', '```shell\n\n```', '```\n  \n```']) assert.equal(isEmptyValue(e), true, JSON.stringify(e))
  for (const e of ['None', '无', '```\nx\n```', 'No response']) assert.equal(isEmptyValue(e), false, e)
  assert.deepEqual(parseChecks('- [x] 我已搜索\n- [ ] 另一项\n* [X] 星号\n不是'), [{ checked: true, text: '我已搜索' }, { checked: false, text: '另一项' }, { checked: true, text: '星号' }])
  const im = extractImages('看 ![图一](https://github.com/user-attachments/assets/a) 和 <img width="1" alt="b" src="https://example.com/b.png" /> 还有 ![x](javascript:alert(1)) 以及 ![y](http://insecure/y.png)\n文字')
  assert.deepEqual(im.images.map((i) => i.src), ['https://github.com/user-attachments/assets/a', 'https://example.com/b.png'])
  assert.equal(im.images[0].alt, '图一'); assert.ok(im.text.includes('文字') && !im.text.includes('<img'))
})

test('a checkboxes field (a form with one) reads as read-only rows', () => {
  const t = parseTemplate('x.yml', 'name: X\ntitle: "x"\nlabels: ["bug"]\nbody:\n  - type: checkboxes\n    id: terms\n    attributes:\n      label: "Terms"\n      options:\n        - label: "I agree"\n          required: true\n        - label: "I read it"\n  - type: input\n    id: a\n    attributes:\n      label: "A"\n  - type: input\n    id: b\n    attributes:\n      label: "B"\n  - type: input\n    id: c\n    attributes:\n      label: "C"\n')
  assert.deepEqual(t.fields[0].options, ['I agree', 'I read it'])
  const m = parseIssueForm('### Terms\n\n- [x] I agree\n- [ ] I read it\n\n### A\n\n1\n\n### B\n\n2\n\n### C\n\n3', { templates: [t] })
  assert.equal(m.fields[0].role, 'check'); assert.deepEqual(m.fields[0].checks.map((c) => c.checked), [true, false])
})

test('templates are read through the GitHub client: the folder, then each file, cached six hours, the rate limit and a missing folder are answers', async () => {
  const calls = []
  const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')
  const reply = (status, data, h = {}) => ({ status, ok: status < 300, headers: { get: (k) => h[k.toLowerCase()] ?? null }, json: async () => data })
  let t = 1000
  const client = createGithubClient({ storage: null, now: () => t, fetchImpl: async (url) => {
    calls.push(url)
    if (url.endsWith('/contents/.github/ISSUE_TEMPLATE')) return reply(200, [{ type: 'file', name: 'bug_report_zh.yml', path: '.github/ISSUE_TEMPLATE/bug_report_zh.yml', sha: 's1' }, { type: 'file', name: 'config.yml', path: '.github/ISSUE_TEMPLATE/config.yml', sha: 's2' }, { type: 'dir', name: 'x', path: 'x' }], { etag: 'W/"d"' })
    if (url.endsWith('bug_report_zh.yml')) return reply(200, { type: 'file', content: b64(yml('bug_report_zh.yml')) })
    return reply(404, {})
  } })
  const a = await client.templates('fs')
  assert.equal(a.state, 'ok'); assert.equal(a.items.length, 1); assert.equal(a.items[0].file, 'bug_report_zh.yml'); assert.equal(a.items[0].fields.length, 17)
  assert.equal(calls.length, 2, 'config.yml and folders are not read')
  assert.equal(calls[0], 'https://api.github.com/repos/AlkaidLab/foundation-sunshine/contents/.github/ISSUE_TEMPLATE')
  t += 60 * 60 * 1000
  assert.equal((await client.templates('fs')).items.length, 1); assert.equal(calls.length, 2, 'inside six hours: the cache')
  assert.ok(TEMPLATES_TTL_MS >= 6 * 60 * 60 * 1000)
  const live = a.items
  assert.equal(readIssueForm(body(1220), 'fs', live).form.file, 'bug_report_zh.yml')
  assert.equal(mergeTemplates('fs', live).length, 4, 'the live one replaces the built-in one of the same name')
  assert.equal((await client.templates('nope')).state, 'error')
  const none = createGithubClient({ storage: null, fetchImpl: async () => reply(404, {}) })
  assert.equal((await none.templates('vdd')).state, 'forbidden')
  const limited = createGithubClient({ storage: null, fetchImpl: async () => reply(403, {}, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '99999999999' }) })
  assert.equal((await limited.templates('fs')).state, 'rate')
})

test('a feedback body is read with the Foundation Sunshine forms whichever repository it went to', () => {
  const b = `${FEEDBACK_MARKER}\n\n${body(1220)}\n\n### 🔎 诊断信息\n\n- fingerprint: \`ab12\`\n`
  assert.equal(readIssueForm(b, 'vdd')?.feedback, true)
  assert.equal(readIssueForm(body(1220), 'vdd'), null, 'a plain issue of another repository is not guessed')
})

test('real public issues of AlkaidLab/foundation-sunshine (read through the client on 2026-11-11): the forms are read, hand-written ones fall back', () => {
  const real = JSON.parse(readFileSync(new URL('real-issues.json', dir), 'utf8'))
  const by = Object.fromEntries(real.map((i) => [i.n, i]))
  const file = (n) => readIssueForm(by[n].body, 'fs')?.form.file ?? null
  assert.deepEqual([1220, 1202, 1212, 1185].map(file), Array(4).fill('bug_report_zh.yml'))
  assert.equal(file(1232), 'feature_request_en.yml'); assert.equal(file(1228), 'feature_request_zh.yml')
  for (const n of [1234, 1203, 1215, 1194]) assert.equal(file(n), null, `#${n} is not a form`)
  const m = readIssueForm(by[1220].body, 'fs')
  assert.equal(m.fields.find((f) => f.id === 'bug-type').value, '🖥️ 虚拟显示器问题'); assert.equal(m.fields.find((f) => f.id === 'sunshine-version').value, 'v2026.1031.121458.杂鱼')
  assert.equal(by[1220].thread.length, by[1220].comments, 'the comments of the thread came with it')
})
