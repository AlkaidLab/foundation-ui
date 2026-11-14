import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SOURCE, ERROR_KINDS, UPDATE_CHANNELS, UPDATE_SOURCES, channelOptions, createMirrorChyanClient, downloadOrder, orderedDownloadUrls, updateTexts, errorKindOf, mirrorchyanUrl, normalizeSource, parseMirrorAnswer, updateSourceTexts } from '../src/update/index.js'

test('the sources are automatic, CNB, GitHub and Mirror酱; the channels are stable and beta only', () => {
  assert.deepEqual([...UPDATE_SOURCES], ['auto', 'cnb', 'github', 'mirror']); assert.equal(DEFAULT_SOURCE, 'auto')
  assert.deepEqual([...UPDATE_CHANNELS], ['stable', 'beta']); assert.deepEqual(channelOptions(), ['stable', 'beta'])
  assert.equal(normalizeSource('dev'), 'auto'); assert.equal(normalizeSource('github'), 'github')
  assert.deepEqual(downloadOrder('auto', { locale: 'zh-CN' }), ['cnb', 'github'], 'the Chinese interface: the domestic mirror first, GitHub when that fails'); assert.deepEqual(downloadOrder('github'), ['github'])
  for (const locale of ['en', 'en-US', 'ja', 'de', '', undefined]) assert.deepEqual(downloadOrder('auto', { locale }), ['github', 'cnb'], `every other language (${locale}): GitHub first, the mirror when that fails`)
  assert.deepEqual(downloadOrder('mirror', { locale: 'zh' }), ['cnb', 'github'], 'without a CDK Mirror酱 only checks the version')
  assert.deepEqual(downloadOrder('mirror', { locale: 'en' }), ['github', 'cnb'])
  assert.deepEqual(downloadOrder('mirror', { hasCdk: true, locale: 'zh' }), ['mirror', 'cnb', 'github'])
  assert.deepEqual(downloadOrder('mirror', { hasCdk: true, locale: 'en' }), ['mirror', 'github', 'cnb'])
  assert.deepEqual(downloadOrder('cnb', { locale: 'en' }), ['cnb'], 'a chosen source is the only one')
})

test('the request is the documented one and carries the CDK only when there is one', () => {
  const url = new URL(mirrorchyanUrl({ currentVersion: '2026.1101.1', cdk: 'SECRET', channel: 'beta', os: 'win', arch: 'x64' }))
  assert.equal(url.origin + url.pathname, 'https://mirrorchyan.com/api/resources/foundation-sunshine/latest')
  assert.deepEqual(Object.fromEntries(url.searchParams), { current_version: '2026.1101.1', cdk: 'SECRET', os: 'windows', arch: 'amd64', channel: 'beta', user_agent: 'foundation-sunshine-panel' })
  assert.equal(new URL(mirrorchyanUrl({})).searchParams.has('cdk'), false)
  assert.equal(new URL(mirrorchyanUrl({ channel: 'alpha' })).searchParams.get('channel'), 'stable', 'only stable and beta')
})

test('every documented error code is a kind with a sentence in both languages', () => {
  assert.deepEqual([errorKindOf(7001), errorKindOf(7002), errorKindOf(7003), errorKindOf(7004), errorKindOf(7005), errorKindOf(8001), errorKindOf(1001), errorKindOf(8009), errorKindOf(-1), errorKindOf(4242)], ['cdk-expired', 'cdk-invalid', 'cdk-limit', 'cdk-type', 'cdk-banned', 'no-resource', 'params', 'cdk-test', 'server', 'unknown'])
  for (const locale of ['zh', 'en']) for (const kind of new Set([...Object.values(ERROR_KINDS), 'server', 'malformed', 'network'])) assert.ok(updateSourceTexts(locale).errors[kind], `${locale} ${kind}`)
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(updateSourceTexts('zh')), keys(updateSourceTexts('en')))
})

test('an answer without a download address is still an answer; an error answer is a kind', () => {
  const ok = parseMirrorAnswer({ status: 200, json: { code: 0, msg: 'success', data: { version_name: 'v2026.1102.1', channel: 'stable', release_note: 'notes' } } })
  assert.deepEqual([ok.ok, ok.version, ok.hasDownload, ok.cdk.state], [true, 'v2026.1102.1', false, 'none'])
  const withCdk = parseMirrorAnswer({ status: 200, json: { code: 0, data: { version_name: 'v1', url: 'https://example.org/d.exe', cdk_expired_time: 1893456000 } } }, { hadCdk: true })
  assert.deepEqual([withCdk.hasDownload, withCdk.cdk.state, withCdk.cdk.expiresAt], [true, 'valid', 1893456000000])
  assert.equal(parseMirrorAnswer({ status: 200, json: { code: 0, data: { version_name: 'v1', url: 'http://plain.example/d.exe' } } }, { hadCdk: true }).hasDownload, false, 'only https')
  assert.deepEqual(parseMirrorAnswer({ status: 403, json: { code: 7001, msg: 'KEY_EXPIRED' } }), { ok: false, kind: 'cdk-expired', code: 7001, message: 'KEY_EXPIRED' })
  assert.equal(parseMirrorAnswer({ status: 200, json: '<html>' }).kind, 'malformed'); assert.equal(parseMirrorAnswer(null).kind, 'network')
})

test('the client behind the interface maps the CDK state; the mock transport is the only network', async () => {
  const calls = []
  const make = (answer, has = true) => createMirrorChyanClient({ hasCdk: async () => has, transport: async (args) => { calls.push(args); if (answer instanceof Error) throw answer; return answer } })
  assert.equal((await make({ status: 403, json: { code: 7001 } }).cdkStatus()).state, 'expired')
  assert.equal((await make({ status: 403, json: { code: 7002 } }).cdkStatus()).state, 'invalid')
  assert.equal((await make({ status: 403, json: { code: 7003 } }).cdkStatus()).state, 'limit')
  assert.equal((await make(new Error('down')).cdkStatus()).state, 'offline')
  assert.equal((await make({ status: 200, json: { code: 0, data: { version_name: 'v1', url: 'https://x.example/f', cdk_expired_time: 1893456000 } } }).cdkStatus()).state, 'valid')
  assert.deepEqual(await make({}, false).cdkStatus(), { state: 'none', expiresAt: null, kind: '' }, 'no CDK: nothing is asked')
  assert.ok(calls.every((c) => !('cdk' in c)), 'the CDK is never handed to this code')
})

const CNB = 'https://cnb.cool/AlkaidLab/foundation-sunshine-release/-/releases/download/v1/setup.exe'
const GH = 'https://github.com/AlkaidLab/foundation-sunshine/releases/download/v1/setup.exe'
test('the two addresses of a file are ordered by the language: CNB first in Chinese, GitHub first in every other language', () => {
  assert.deepEqual(orderedDownloadUrls({ url: CNB, fallbackUrl: GH }, { source: 'auto', locale: 'zh-CN' }), { url: CNB, fallbackUrl: GH })
  assert.deepEqual(orderedDownloadUrls({ url: CNB, fallbackUrl: GH }, { source: 'auto', locale: 'en' }), { url: GH, fallbackUrl: CNB })
  assert.deepEqual(orderedDownloadUrls({ url: GH, fallbackUrl: CNB }, { source: 'auto', locale: 'zh' }), { url: CNB, fallbackUrl: GH })
  assert.deepEqual(orderedDownloadUrls({ url: CNB, fallbackUrl: GH }, { source: 'github', locale: 'zh' }), { url: GH, fallbackUrl: null }, 'a chosen source is the only one')
  assert.deepEqual(orderedDownloadUrls({ url: GH, fallbackUrl: '' }, { source: 'cnb', locale: 'zh' }), { url: GH, fallbackUrl: null }, 'a source that has no address does not strand the download')
  assert.deepEqual(orderedDownloadUrls({ url: 'https://example.com/a.exe', fallbackUrl: GH }, { source: 'auto', locale: 'en' }), { url: 'https://example.com/a.exe', fallbackUrl: GH }, 'an address of another host is left as it is')
})

test('no sentence of the update says which host to use or is tried first; a failed source is said plainly', () => {
  for (const locale of ['zh', 'en']) {
    const all = JSON.stringify([updateSourceTexts(locale).sources, updateTexts(locale)])
    assert.doesNotMatch(all, /先用|优先使用|CNB first|GitHub first|use CNB|try CNB/i, locale)
    assert.equal(updateSourceTexts(locale).autoHint, undefined)
  }
  assert.equal(updateTexts('zh').phaseRetrying, '下载失败，正在尝试备用源')
  assert.equal(updateTexts('en').phaseRetrying, 'Download failed, trying another source')
  assert.doesNotMatch(updateTexts('en').stepDownloadHintPlain, /GitHub|CNB/)
})
