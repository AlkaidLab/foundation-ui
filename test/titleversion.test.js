import test from 'node:test'
import assert from 'node:assert/strict'
import { shortVersion, hasTestSuffix, titleVersionView, titleVersionTip, reportText } from '../src/about/titleVersion.js'
import { captionTexts, fill } from '../src/nav/captionTexts.js'

const ZH = captionTexts('zh-CN')
const build = (over = {}) => ({ version: '2026.1107.120000', commit: 'a'.repeat(40), commit_short: 'aaaaaaaaaaaa', branch: 'main', dirty: false, channel: 'stable', build_time_utc: '2026-11-07T12:00:00Z', variant: 'x', package: 'installer', builder: 'ci', ...over })

test('the short version of the host stamp is YYYY.MMDD', () => {
  assert.equal(shortVersion('2026.1107.120000'), '2026.1107')
  assert.equal(shortVersion('v2026.1031.121458.杂鱼'), '2026.1031')
  assert.equal(shortVersion('2026.1107'), '2026.1107')
})
test('a semantic version keeps major.minor.patch, anything else is kept short', () => {
  assert.equal(shortVersion('1.3.9-rc5'), '1.3.9')
  assert.equal(shortVersion('1.3'), '1.3')
  assert.equal(shortVersion('dev'), 'dev')
  assert.equal(shortVersion('a-very-long-version-string'), 'a-very-long-ve')
  assert.equal(shortVersion(''), '')
  assert.equal(shortVersion(null), '')
})
test('a pre-release hint in the version text', () => {
  for (const v of ['1.3.9-rc5', '2026.1107.120000.beta', '1.0.0-alpha.2', '1.0-dev', '2026.1107.1-test']) assert.ok(hasTestSuffix(v), v)
  for (const v of ['2026.1107.120000', '2026.1031.121458.杂鱼', '1.3.9', '', 'prerelease-free']) assert.ok(!hasTestSuffix(v), v)
})
test('the recorded channel decides the 测试版 tag; the suffix only when the build has no identity', () => {
  assert.deepEqual([titleVersionView({ version: '2026.1107.120000', build: build() }).test, titleVersionView({ version: '2026.1107.120000', build: build() }).testFrom], [false, ''])
  const beta = titleVersionView({ version: '2026.1107.120000', build: build({ channel: 'beta' }) })
  assert.equal(beta.test, true); assert.equal(beta.testFrom, 'build')
  for (const channel of ['dev', 'local']) assert.equal(titleVersionView({ version: '2026.1107.1', build: build({ channel }) }).test, true, channel)
  // stable wins over a suffix-looking version
  assert.equal(titleVersionView({ version: '1.0-rc1', build: build({ channel: 'stable' }) }).test, false)
  const bySuffix = titleVersionView({ version: '2026.1107.120000.beta', build: null })
  assert.equal(bySuffix.test, true); assert.equal(bySuffix.testFrom, 'suffix')
  assert.equal(titleVersionView({ version: '2026.1107.120000', build: null }).test, false)
})
test('the view has the short and the full version and the short commit', () => {
  const v = titleVersionView({ version: ' v2026.1107.120000 ', build: build() })
  assert.equal(v.full, '2026.1107.120000'); assert.equal(v.short, '2026.1107'); assert.equal(v.commit, 'aaaaaaaaaaaa')
  assert.equal(titleVersionTip(v, ZH), '2026.1107.120000 · aaaaaaaaaaaa')
  assert.equal(titleVersionTip(titleVersionView({ version: '2026.1107.1', build: build({ channel: 'beta' }) }), ZH), '2026.1107.1 · 测试版 · aaaaaaaaaaaa')
  assert.equal(titleVersionTip(titleVersionView({ version: '' }), ZH), '')
})
test('the copied report has one fact per line and leaves out what is not known', () => {
  const time = () => '2026-11-07 20:00:00'
  const full = reportText({ version: '2026.1107.120000', build: build({ channel: 'beta', dirty: true }), os: 'Windows 11 24H2' }, ZH, time).split('\n')
  assert.equal(full[0], 'Foundation Sunshine 2026.1107.120000')
  assert.ok(full.includes('渠道: 测试版')); assert.ok(full.includes(`提交: ${'a'.repeat(40)} (有未提交改动)`)); assert.ok(full.includes('分支: main'))
  assert.ok(full.includes('构建时间: 2026-11-07 20:00:00')); assert.ok(full.includes('安装包: 安装版')); assert.ok(full.includes('系统: Windows 11 24H2'))
  assert.equal(reportText({ version: '2026.1107.120000', build: null }, ZH), 'Foundation Sunshine 2026.1107.120000')
  assert.equal(reportText({ version: '1.0-rc1', build: null, os: 'Linux' }, ZH), 'Foundation Sunshine 1.0-rc1\n渠道: 测试版\n系统: Linux')
  assert.equal(reportText({ version: '', build: null }, ZH), 'Foundation Sunshine 还没读到')
})
test('texts: Chinese and English, the rest English; fill replaces the named values', () => {
  assert.equal(captionTexts('zh-CN').test, '测试版'); assert.equal(captionTexts('en').test, 'Beta'); assert.equal(captionTexts('de').test, 'Beta')
  assert.equal(fill(captionTexts('zh').backTo, { page: '体检' }), '返回：体检'); assert.equal(fill(captionTexts('en').chipBack, { page: 'Health check' }), 'Back to Health check')
  assert.equal(captionTexts('en', { test: 'Pre' }).test, 'Pre')
})
