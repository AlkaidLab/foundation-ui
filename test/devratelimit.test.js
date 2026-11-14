import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createGithubClient } from '../src/devmode/github.js'
import { devmodeTexts, fillText } from '../src/devmode/texts.js'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const reply = (status, body, h2 = {}) => ({ status, ok: status >= 200 && status < 300, headers: { get: (k) => h2[String(k).toLowerCase()] ?? null }, json: async () => body })
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) } }

test('the unauthenticated GitHub limit: a sentence, the reset time and a sign-in button, with no 每日 and no colloquialism', () => {
  const zh = devmodeTexts('zh')
  assert.equal(zh.rateNoteComments, 'GitHub 公共访问额度已用尽，登录 GitHub 后可查看最新评论。')
  assert.equal(zh.rateNote, 'GitHub 公共访问额度已用尽，登录 GitHub 后可查看最新内容。')
  assert.equal(zh.connect, '登录 GitHub')
  assert.equal(fillText(zh.rateReset, { m: 23 }), '约 23 分钟后恢复')
  const en = devmodeTexts('en')
  assert.equal(en.rateNoteComments, 'The GitHub public access limit has been reached. Sign in to GitHub to see the latest comments.')
  assert.equal(en.connect, 'Sign in to GitHub')
  assert.equal(fillText(en.rateReset, { m: 23 }), 'Resets in about 23 min')
  for (const t of [zh, en]) for (const k of ['rateTitle', 'rateNote', 'rateNoteComments', 'rateNoteSigned', 'rateReset', 'commentsFail']) assert.ok(!/每日|暂时|读不到|用完|daily/.test(t[k]), k)
})

test('the limit answer says whether its reset time is known (x-ratelimit-reset or retry-after), so the page never invents one', async () => {
  const withReset = createGithubClient({ storage: memory(), now: () => 1_000_000, fetchImpl: async () => reply(403, {}, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '2000' }) })
  const a = await withReset.list('fs', 'issue')
  assert.equal(a.state, 'rate'); assert.equal(a.resetAt, 2_000_000); assert.equal(a.resetKnown, true)
  const guess = createGithubClient({ storage: memory(), now: () => 1_000_000, fetchImpl: async () => reply(403, {}) })
  const b = await guess.list('fs', 'issue')
  assert.equal(b.state, 'rate'); assert.equal(b.resetKnown, false)
})

test('the list and the comments show the limit as a sentence, a reset line and a 登录 GitHub button', () => {
  const list = read('vue/devmode/DevIssues.vue')
  assert.match(list, /text: signed \? t\.rateNoteSigned : t\.rateNote, sub: resetLine\.value, action: signed \? '' : t\.connect, connect: !signed/)
  assert.match(list, /data-dev="issues-note-action"/)
  const reader = read('vue/devmode/DevIssueReader.vue')
  assert.match(reader, /text: signed \? t\.rateNoteSigned : t\.rateNoteComments/)
  assert.match(reader, /data-dev="issue-comments-action"/)
  assert.match(reader, /openDevSignIn\(\)/)
  assert.ok(!/T\.commentsFail \}\}：/.test(reader), 'the reason is a second line, not glued to the title')
})

test('without a backend the sign-in sheet explains it in one line', () => {
  const zh = devmodeTexts('zh')
  assert.equal(zh.siOffTitle, 'GitHub 登录服务尚未配置')
  assert.ok(!zh.siOffText.includes('\n'))
  assert.ok(zh.siOffText.length < 80)
})

test('one comment reads "1 comment" (English) and "1 条评论" (Chinese), not "1 comments"', () => {
  assert.equal(devmodeTexts('en').commentOne, '1 comment')
  assert.equal(devmodeTexts('zh').commentOne, '1 条评论')
  assert.match(read('vue/devmode/DevIssues.vue'), /commentsLabel\(i\.comments\)/)
  assert.match(read('vue/devmode/DevIssueReader.vue'), /item\.comments === 1 && /)
})

test('a tooltip that arrives with the focus waits until its button holds still (a dialog is still scaling in)', () => {
  const tips = read('vue/tips.js')
  assert.match(tips, /const armStable = /)
  assert.match(tips, /focusin', \(e\) => \{ if \(e\.target instanceof Element && e\.target\.matches\(':focus-visible'\)\) armStable\(e\) \}/)
})

test('the close button of a dialog shows its tip beside it, not over the first line', () => {
  assert.match(read('vue/tips.js'), /data-tip-side'\) === 'start'/)
  assert.match(read('vue/MSheet.vue'), /<MIconButton v-if="!persistent" icon="close" :label="closeLabel" data-tip-side="start"/)
})
