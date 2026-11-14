import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { aboutTexts, buildChannelLabel, buildRows, buildTimeLocal, normalizeBuild } from '../src/about/index.js'

const COMMIT = '96a1e2b68829134784b718c9471b8f58e61e8b89'
const panel = { version: '2026.1104.121813', commit: COMMIT, commitShort: '96a1e2b68829', branch: 'master', dirty: false, channel: 'beta', buildTimeUtc: '2026-11-04T04:18:13Z', variant: 'foundation-sunshine', package: 'installer', packageSource: 'layout', builder: 'ci', ciRun: '' }
const api = { json_version: 1, version: '2026.1104.121813', commit: COMMIT, commit_short: '96a1e2b68829', branch: 'master', dirty: true, channel: 'local', build_time_utc: '2026-11-04T04:18:13Z', variant: 'foundation-sunshine', package: 'portable', package_source: 'layout', builder: 'local', ci_run: '' }

test('the panel and the API spellings read the same', () => {
  const a = normalizeBuild(panel), b = normalizeBuild(api)
  assert.equal(a.commit, COMMIT)
  assert.equal(b.commit, COMMIT)
  assert.equal(a.buildTimeUtc, b.buildTimeUtc)
  assert.equal(b.dirty, true)
  assert.equal(normalizeBuild(null), null)
  assert.equal(normalizeBuild({ commit: '' }), null)
  assert.equal(normalizeBuild({ commit: 'zzzz' }), null)
})

test('the build channel is named, not guessed', () => {
  const zh = aboutTexts('zh-CN'), en = aboutTexts('en')
  assert.equal(buildChannelLabel('stable', zh), '正式版')
  assert.equal(buildChannelLabel('beta', zh), '测试版')
  assert.equal(buildChannelLabel('dev', zh), '开发版')
  assert.equal(buildChannelLabel('local', en), 'Local build')
  assert.equal(buildChannelLabel('nightly', en), '')
})

test('the UTC build time is shown in local time', () => {
  const local = buildTimeLocal('2026-11-04T04:18:13Z')
  assert.match(local, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  const d = new Date(Date.UTC(2026, 10, 4, 4, 18, 13))
  assert.equal(local.slice(11, 13), String(d.getHours()).padStart(2, '0'))
  assert.equal(buildTimeLocal('2026-11-04 04:18:13'), '')
  assert.equal(buildTimeLocal(''), '')
})

test('构建详情 lists the recorded fields and copies the whole commit', () => {
  const zh = aboutTexts('zh-CN')
  const rows = buildRows(api, zh)
  assert.deepEqual(rows.map((r) => r.id), ['commit', 'channel', 'time', 'branch', 'variant', 'package', 'builder'])
  assert.equal(rows[0].copy, COMMIT)
  assert.match(rows[0].value, /含未提交的改动/)
  assert.equal(rows.find((r) => r.id === 'package').value, '便携版')
  assert.equal(rows.find((r) => r.id === 'channel').value, '本地构建')
  assert.deepEqual(buildRows(null, zh), [])
})

test('both languages carry the build words', () => {
  for (const locale of ['en', 'zh-CN']) {
    const t = aboutTexts(locale)
    for (const key of ['buildDetails', 'buildCommit', 'buildDirty', 'buildTime', 'buildBranch', 'buildVariant', 'buildPackage', 'buildBuilder', 'copyCommit']) assert.ok(t[key], `${locale} ${key}`)
    for (const c of ['stable', 'beta', 'dev', 'local']) assert.ok(t.buildChannels[c], `${locale} ${c}`)
  }
})

test('MAbout takes the identity and prefers it over the version guesses', () => {
  const vue = readFileSync(new URL('../src/vue/MAbout.vue', import.meta.url), 'utf8')
  assert.match(vue, /build: \{ type: Object, default: null \}/)
  assert.match(vue, /buildTimeLocal\(identity\.value\.buildTimeUtc\)/)
  assert.match(vue, /buildChannelLabel\(identity\.value\.channel, T\.value\)\) \|\|/)
  assert.match(vue, /class="m-item m-about__build"/)
})
