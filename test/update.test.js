import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  METADATA_URLS,
  NOTES_LIMITS,
  channelOfVersion,
  compareReleases,
  compareVersions,
  detectDriverNotes,
  displayVersion,
  downloadView,
  fetchReleaseMetadata,
  clearMetadataCache,
  metadataUrlsFor,
  formatBytes,
  formatText,
  normalizeMetadata,
  parseReleaseNotes,
  phaseShape,
  pickRelease,
  previewNotes,
  releaseLink,
  releasePageUrl,
  sheetFromGithubRelease,
  sheetFromPanelInfo,
  stepsFor,
  updateTexts,
  UPDATE_PHASES,
} from '../src/update/index.js'
import * as viaExports from 'foundation-ui/update'

// test/fixtures/release-metadata.live.json is the answer of https://www.alkaidlab.com/release-metadata/foundation-sunshine.json
// fetched on 2026-11-02 (byte for byte the same as the .cn host's answer at that time). Nothing in it was edited.
const LIVE = JSON.parse(readFileSync(new URL('./fixtures/release-metadata.live.json', import.meta.url), 'utf8'))
const clone = (value) => JSON.parse(JSON.stringify(value))

// ---- the live metadata ----------------------------------------------------------------------------------------------

test('the live metadata normalizes: both channels, the installer asset with its checksum', () => {
  const meta = normalizeMetadata(LIVE)
  assert.ok(meta)
  assert.equal(meta.latest.version, 'v2026.1031.121458.杂鱼')
  assert.equal(meta.latest.prerelease, false)
  assert.equal(meta.preLatest.version, 'v2026.1101.150529.杂鱼')
  assert.equal(meta.preLatest.prerelease, true)
  for (const release of [meta.latest, meta.preLatest]) {
    assert.equal(release.installer.type, 'windows-x64-installer')
    assert.match(release.installer.name, /^Sunshine\.v\d+\.\d+\.WindowsInstaller\.exe$/)
    assert.match(release.installer.sha256, /^[0-9a-f]{64}$/)
    assert.ok(release.installer.size > 1_000_000)
    assert.match(release.installer.url, /^https:\/\/cnb\.cool\//)
    assert.match(release.installer.fallbackUrl, /^https:\/\/github\.com\//)
    assert.ok(release.assets.some((asset) => asset.type === 'dualsense-sidecar-zip'))
    assert.match(release.releasePage, /^https:\/\/github\.com\/AlkaidLab\/foundation-sunshine\/releases\/tag\/v2026\./)
    assert.ok(release.publishedAt)
  }
})

test('pickRelease follows the channel, the current version and the skipped version', () => {
  const stable = pickRelease(LIVE, { channel: 'stable', current: 'v2026.1020.23431.杂鱼' })
  assert.equal(stable.status, 'available')
  assert.equal(stable.channel, 'stable')
  assert.equal(stable.release.version, 'v2026.1031.121458.杂鱼')

  const beta = pickRelease(LIVE, { channel: 'prerelease', current: '2026.1020.23431' })
  assert.equal(beta.status, 'available')
  assert.equal(beta.channel, 'prerelease')
  assert.equal(beta.release.version, 'v2026.1101.150529.杂鱼')

  assert.equal(pickRelease(LIVE, { channel: 'stable', current: 'v2026.1031.121458.杂鱼' }).status, 'latest')
  assert.equal(pickRelease(LIVE, { channel: 'stable', current: '2027.1.1' }).status, 'latest')
  // On the pre-release channel a user already on the stable build is offered the newer pre-release; one on it is current.
  assert.equal(pickRelease(LIVE, { channel: 'prerelease', current: 'v2026.1101.150529' }).status, 'latest')

  const skipped = pickRelease(LIVE, { channel: 'stable', current: '2026.1020.1', skipped: '2026.1031.121458.杂鱼' })
  assert.equal(skipped.status, 'skipped')
  assert.equal(pickRelease(LIVE, { channel: 'stable', current: '2026.1020.1', skipped: '2026.1031.121458.杂鱼', manual: true }).status, 'available')
  assert.equal(pickRelease(LIVE, { channel: 'stable', current: '2026.1020.1', skipped: 'v2026.1030.1' }).status, 'available')

  const unknown = pickRelease(LIVE, { channel: 'stable', current: 'dirty-build' })
  assert.equal(unknown.status, 'available')
  assert.equal(unknown.currentKnown, false)
})

test('pickRelease ignores a release without an installer only when asked to', () => {
  const doc = clone(LIVE)
  doc.channels.latest.assets = doc.channels.latest.assets.filter((asset) => asset.type !== 'windows-x64-installer')
  assert.equal(pickRelease(doc, { current: '1.0' }).status, 'available')
  assert.equal(pickRelease(doc, { current: '1.0', requireInstaller: true }).status, 'none')
  assert.equal(pickRelease(doc, { channel: 'prerelease', current: '1.0', requireInstaller: true }).release.version, 'v2026.1101.150529.杂鱼')
})

test('the newer of two releases is decided by release id, publish time, then version', () => {
  const a = { id: 5, publishedAt: '2026-01-02T00:00:00.000Z', version: 'v2.0', prerelease: false }
  const b = { id: 9, publishedAt: '2026-01-01T00:00:00.000Z', version: 'v1.0', prerelease: true }
  assert.equal(compareReleases(b, a), 1)
  assert.equal(compareReleases({ ...b, id: null }, { ...a, id: null }), -1)
  assert.equal(compareReleases({ ...b, id: null, publishedAt: null }, { ...a, id: null, publishedAt: null }), -1)
  assert.equal(compareReleases({ ...a, version: 'v2.0', prerelease: true }, { ...a, id: null, prerelease: false }), -1)
})

test('channelOfVersion tells which channel a version belongs to', () => {
  assert.equal(channelOfVersion(LIVE, 'v2026.1031.121458.杂鱼'), 'stable')
  assert.equal(channelOfVersion(LIVE, '2026.1101.150529.杂鱼'), 'prerelease')
  assert.equal(channelOfVersion(LIVE, 'v2026.1.1'), '')
  assert.equal(channelOfVersion(null, 'v1'), '')
  assert.equal(channelOfVersion(LIVE, 42), '')
})

test('version helpers', () => {
  assert.equal(displayVersion('v2026.1031.121458.杂鱼'), '2026.1031.121458.杂鱼')
  assert.equal(displayVersion('  V1.2 '), '1.2')
  assert.equal(displayVersion(null), '')
  assert.equal(compareVersions('v2026.1031.121458.杂鱼', 'v2026.1020.23431.杂鱼'), 1)
  assert.equal(compareVersions('1.2', '1.2.0'), 0)
  assert.equal(compareVersions('x', '1'), null)
  assert.equal(releasePageUrl('v2026.1031.121458.杂鱼'), 'https://github.com/AlkaidLab/foundation-sunshine/releases/tag/v2026.1031.121458.%E6%9D%82%E9%B1%BC')
  assert.equal(releasePageUrl(''), '')
})

// ---- malformed metadata -----------------------------------------------------------------------------------------------

test('metadata of another shape is refused', () => {
  const bad = [
    null, undefined, 'text', 7, [], {}, { schema: 1 },
    { ...clone(LIVE), schema: 2 },
    { ...clone(LIVE), kind: 'announcements' },
    { ...clone(LIVE), product: 'other' },
    { ...clone(LIVE), channels: null },
    { ...clone(LIVE), channels: [] },
    { ...clone(LIVE), channels: {} },
    { ...clone(LIVE), channels: { latest: 'v1' } },
    { ...clone(LIVE), channels: { latest: { version: '' } } },
    { ...clone(LIVE), channels: { latest: { version: 'not a version' } } },
    { ...clone(LIVE), channels: { latest: { version: 'v' + '9'.repeat(200) } } },
  ]
  for (const document of bad) {
    assert.equal(normalizeMetadata(document), null)
    assert.equal(pickRelease(document, {}).status, 'invalid')
  }
})

test('a broken channel is dropped, the other one stays', () => {
  const doc = clone(LIVE)
  doc.channels.latest = { version: 'oops' }
  const meta = normalizeMetadata(doc)
  assert.equal(meta.latest, null)
  assert.equal(meta.preLatest.version, 'v2026.1101.150529.杂鱼')
  assert.equal(pickRelease(doc, { channel: 'stable', current: '1.0' }).status, 'none')
  assert.equal(pickRelease(doc, { channel: 'prerelease', current: '1.0' }).release.prerelease, true)
})

test('assets: only https links to the release hosts and a real checksum make an installer', () => {
  const doc = clone(LIVE)
  const installer = doc.channels.latest.assets.find((asset) => asset.type === 'windows-x64-installer')
  const variants = [
    { url: 'http://github.com/x.exe', fallbackUrl: 'javascript:alert(1)' },
    { url: 'https://evil.example/x.exe', fallbackUrl: 'https://github.com.evil.example/x.exe' },
    { url: 'https://user:pw@github.com/x.exe', fallbackUrl: 'not a url' },
    { sha256: 'zz' },
    { sha256: '' },
    { sha256: 7 },
  ]
  for (const patch of variants) {
    const copy = clone(doc)
    Object.assign(copy.channels.latest.assets.find((asset) => asset.type === 'windows-x64-installer'), patch)
    const release = normalizeMetadata(copy).latest
    assert.equal(release.installer, null, JSON.stringify(patch))
  }
  const withPrefix = clone(doc)
  withPrefix.channels.latest.assets.find((asset) => asset.type === 'windows-x64-installer').sha256 = `sha256:${installer.sha256.toUpperCase()}`
  assert.equal(normalizeMetadata(withPrefix).latest.installer.sha256, installer.sha256)
  const junk = clone(doc)
  junk.channels.latest.assets = [null, 4, 'x', {}, { type: 1, name: 2 }, ...junk.channels.latest.assets]
  assert.equal(normalizeMetadata(junk).latest.assets.length, installer ? doc.channels.latest.assets.length : 0)
})

test('odd field values are normalized, not trusted', () => {
  const doc = clone(LIVE)
  Object.assign(doc.channels.latest, { prerelease: 'true', githubReleaseId: -4, publishedAt: 'yesterday', releaseNotes: 12 })
  const release = normalizeMetadata(doc).latest
  assert.equal(release.prerelease, false)
  assert.equal(release.id, null)
  assert.equal(release.publishedAt, null)
  assert.equal(release.notes, '')
  doc.channels.latest.releaseNotes = 'x'.repeat(500_000)
  assert.equal(normalizeMetadata(doc).latest.notes.length, 128 * 1024)
})

// ---- release notes ---------------------------------------------------------------------------------------------------

const lineTexts = (parsed) => parsed.lines.map((line) => line.text)

test('the live stable notes become plain text', () => {
  const parsed = parseReleaseNotes(LIVE.channels.latest.releaseNotes)
  assert.equal(parsed.title, '杂鱼更新：1020 → 1031')
  assert.equal(parsed.truncated, false)
  const all = [parsed.title, ...lineTexts(parsed)].join('\n')
  assert.doesNotMatch(all, /[*_`#<>\[\]]|https?:|🐟|&amp;|@\w+\]/)
  assert.doesNotMatch(all, /Contributors|Full Changelog|What's Changed|Star/i.test('') ? /$^/ : /Contributors|Full Changelog|What's Changed/)
  assert.ok(lineTexts(parsed).includes('Sunshine 完全免费。如果你通过第三方平台付费购买，请申请退款。'))
  const quote = parsed.lines.filter((line) => line.kind === 'quote')
  assert.equal(quote.length, 2)
  assert.match(quote[1].text, /^推荐大多数用户下载 Sunshine\.v2026\.1031\.WindowsInstaller\.exe/)
  const bullets = parsed.lines.filter((line) => line.kind === 'bullet')
  assert.equal(bullets.length, 20)
  assert.deepEqual({ ...bullets[0] }, { kind: 'bullet', text: 'docs: update user guide links', by: '@Yundi339', ref: '#1171' })
  const bot = bullets.find((line) => line.ref === '#1190')
  assert.equal(bot.text, 'Update driver versions')
  assert.equal(bot.by, '@github-actions[bot]')
})

test('the live pre-release notes: no title, one change', () => {
  const parsed = parseReleaseNotes(LIVE.channels['pre-latest'].releaseNotes)
  assert.equal(parsed.title, '')
  assert.deepEqual(parsed.lines.map((line) => line.text), ['ci: pin and verify the Inno Setup installer download'])
  assert.equal(parsed.lines[0].by, '@AsafMah')
})

test('driver signals come from the notes only, and say what kind of line they are', () => {
  const stable = detectDriverNotes(parseReleaseNotes(LIVE.channels.latest.releaseNotes))
  assert.equal(stable.found, true)
  assert.equal(stable.driver, true)
  assert.equal(stable.level, 'caution')
  assert.equal(stable.items[0].level, 'caution')
  assert.match(stable.items[0].text, /616\.55/)
  assert.ok(stable.items.some((item) => item.level === 'update' && item.text === 'Update driver versions'))
  assert.equal(stable.component, true)
  assert.ok(stable.items.length <= 3)

  const pre = detectDriverNotes(parseReleaseNotes(LIVE.channels['pre-latest'].releaseNotes))
  assert.equal(pre.found, false)
  assert.deepEqual(pre.items, [])
  assert.equal(pre.level, '')

  assert.equal(detectDriverNotes(null).found, false)
  assert.equal(detectDriverNotes({ lines: [null, {}, { text: 5 }] }).found, false)
  const english = detectDriverNotes(parseReleaseNotes('* Bundles a new driver for the virtual display\n* Please avoid driver 616.55'))
  assert.equal(english.level, 'caution')
  assert.deepEqual(english.items.map((item) => item.level), ['caution', 'mention'])
  const componentOnly = detectDriverNotes(parseReleaseNotes('Updated components'))
  assert.equal(componentOnly.driver, false)
  assert.equal(componentOnly.component, true)
})

test('markup is removed, links lose their target, nothing is executable text', () => {
  const parsed = parseReleaseNotes([
    '# <img src=x onerror=alert(1)> Title',
    '<script>alert(1)</script>visible',
    '<!-- hidden -->after',
    '[click](javascript:alert(1)) and [site](https://example.com/a?b=c) and https://example.org/x and www.example.net',
    '![pixel](https://track.example/p.png) text',
    '<a href="https://x"><img src="https://y"></a>',
    '**bold** __also__ *it* _it_ ~~gone~~ `code` snake_case_name 2*3*4',
    '1. first\n2) second\n- [x] done\n+ plus',
    '&lt;b&gt; &amp; &quot;q&quot; &#39;s&#39;',
    '[ref][1]\n\n[1]: https://example.com',
  ].join('\n'))
  const all = [parsed.title, ...lineTexts(parsed).filter((text) => !text.includes('&'))].join('\n')
  assert.doesNotMatch(all, /<|>(?!\))|javascript|https?:|www\.|onerror|alert|track\.example/)
  assert.equal(parsed.title, 'Title')
  assert.ok(lineTexts(parsed).includes('visible'))
  assert.ok(lineTexts(parsed).includes('after'))
  assert.ok(lineTexts(parsed).includes('click and site and and'))
  assert.ok(lineTexts(parsed).includes('text'))
  assert.ok(lineTexts(parsed).includes('bold also it it gone code snake_case_name 2*3*4'))
  assert.deepEqual(parsed.lines.filter((line) => line.kind === 'bullet').map((line) => line.text), ['first', 'second', 'done', 'plus'])
  assert.ok(lineTexts(parsed).includes('<b> & "q" \'s\''))
  assert.ok(lineTexts(parsed).includes('ref'))
})

test('control, bidirectional, zero-width and tag characters are removed', () => {
  const nasty = String.fromCharCode(97,0,98,7,99,27,100,127,101,102,8203,103,8207,104,8238,105,8294,106,8297,107,65279,108,173,109) + String.fromCodePoint(0xE0041) + String.fromCharCode(110,55296,111,56320,112)
  const parsed = parseReleaseNotes(`## ${nasty}\n${nasty}\n${String.fromCharCode(0x202e)}txt.exe`)
  const all = [parsed.title, ...lineTexts(parsed)].join('\n')
  assert.doesNotMatch(all, /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD\ud800-\udfff]|[\u{E0000}-\u{E007F}]/u)
  assert.equal(parsed.title, 'abcdefghijklmnop')
  assert.ok(lineTexts(parsed).includes('txt.exe'))
  // Unicode line separators are line breaks, not invisible characters inside one line.
  assert.deepEqual(lineTexts(parseReleaseNotes(`one${String.fromCharCode(0x2028)}two${String.fromCharCode(0x2029)}three${String.fromCharCode(0x85)}four`)), ['one', 'two', 'three', 'four'])
})

test('emoji decoration at the start of a line is removed, emoji inside text stays', () => {
  const parsed = parseReleaseNotes('## 🐟 杂鱼更新\n🚀 Faster start\n* ✨ Shiny 🎉\n👨‍👩‍👧 family\n🇨🇳 flag\n1️⃣ keycap\n© 2026')
  assert.equal(parsed.title, '杂鱼更新')
  assert.deepEqual(lineTexts(parsed), ['Faster start', 'Shiny 🎉', 'family', 'flag', '1️⃣ keycap', '© 2026'].map((text) => (text === '© 2026' ? '2026' : text)))
})

test('headings other than the first stay as headings; the generated sections go', () => {
  const parsed = parseReleaseNotes('## What\'s Changed\n* a by @x in #1\n\n### Fixes\n* b\n\n## New Contributors\n* @y made their first contribution in #2\n\n**Full Changelog**: https://github.com/a/b/compare/1...2\n\n---\n## Contributors\n<a href="https://github.com/z"><img src="https://github.com/z.png"></a>')
  assert.equal(parsed.title, '')
  assert.deepEqual(parsed.lines.map((line) => [line.kind, line.text]), [['bullet', 'a'], ['heading', 'Fixes'], ['bullet', 'b']])
})

test('code fences keep their lines as plain text', () => {
  const parsed = parseReleaseNotes('Run:\n```\nnpm **install**\n# not a heading\n```\nDone')
  assert.deepEqual(lineTexts(parsed), ['Run:', 'npm **install**', '# not a heading', 'Done'])
})

test('input that is not a string, empty or only decoration gives an empty result', () => {
  for (const value of [undefined, null, 5, {}, [], '', '   \n\n ', '---', '🐟🐟', '<br><br>', '[]()']) {
    const parsed = parseReleaseNotes(value)
    assert.deepEqual(parsed.lines, [], String(value))
    assert.equal(parsed.title, '')
  }
})

test('size caps: input, number of lines, one line, total', () => {
  const huge = parseReleaseNotes(`${'word '.repeat(40)}\n`.repeat(5000))
  assert.equal(huge.truncated, true)
  assert.ok(huge.lines.length <= NOTES_LIMITS.maxLines)
  assert.ok(huge.lines.reduce((sum, line) => sum + Array.from(line.text).length, 0) <= NOTES_LIMITS.maxTotalChars + NOTES_LIMITS.maxLineChars)

  const manyLines = parseReleaseNotes(Array.from({ length: 400 }, (_, i) => `* item ${i}`).join('\n'))
  assert.equal(manyLines.lines.length, NOTES_LIMITS.maxLines)
  assert.equal(manyLines.truncated, true)

  const longLine = parseReleaseNotes(`${'あ'.repeat(5000)}\n## ${'題'.repeat(500)}`)
  assert.equal(Array.from(longLine.lines[0].text).length, NOTES_LIMITS.maxLineChars)
  assert.ok(longLine.lines[0].text.endsWith('…'))
  assert.equal(longLine.truncated, true)

  const oneMegabyte = parseReleaseNotes('x'.repeat(1_000_000))
  assert.equal(oneMegabyte.truncated, true)
  assert.equal(oneMegabyte.lines.length, 1)

  // A cut never splits a surrogate pair.
  const astral = parseReleaseNotes('😀'.repeat(1000).replace(/^/, 'a'))
  assert.doesNotMatch(astral.lines[0].text, /[\ud800-\udbff](?![\udc00-\udfff])/)

  const small = parseReleaseNotes('short note')
  assert.equal(small.truncated, false)

  const custom = parseReleaseNotes('a\nb\nc', { maxLines: 2 })
  assert.deepEqual(lineTexts(custom), ['a', 'b'])
  assert.equal(custom.truncated, true)
})

test('pathological input stays fast', () => {
  const started = Date.now()
  parseReleaseNotes('*'.repeat(60_000))
  parseReleaseNotes('_a'.repeat(30_000))
  parseReleaseNotes('['.repeat(30_000) + ']('.repeat(30_000))
  parseReleaseNotes('<'.repeat(60_000))
  parseReleaseNotes('**a'.repeat(20_000))
  assert.ok(Date.now() - started < 3000, `took ${Date.now() - started} ms`)
})

test('previewNotes shows the first lines and counts the rest', () => {
  const parsed = parseReleaseNotes(LIVE.channels.latest.releaseNotes)
  const preview = previewNotes(parsed, { maxLines: 5, maxChars: 360 })
  assert.ok(preview.lines.length >= 1 && preview.lines.length <= 5)
  assert.equal(preview.hidden, parsed.lines.length - preview.lines.length)
  assert.ok(preview.hidden > 0)
  assert.deepEqual(previewNotes(null), { lines: [], hidden: 0 })
  const first = previewNotes({ lines: [{ text: 'x'.repeat(1000) }, { text: 'y' }] }, { maxLines: 5, maxChars: 100 })
  assert.equal(first.lines.length, 1)
  assert.equal(first.hidden, 1)
})

// ---- fetching with both hosts -------------------------------------------------------------------------------------------

const answer = (body, { status = 200, length } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (name.toLowerCase() === 'content-length' && length != null ? String(length) : null) },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
})
const later = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))
const fetchMeta = (options) => { clearMetadataCache(); return fetchReleaseMetadata(options) }
const COM = METADATA_URLS[0]
const CN = METADATA_URLS[1]

test('the two metadata hosts are the public ones', () => {
  assert.deepEqual([...METADATA_URLS], [
    'https://www.alkaidlab.com/release-metadata/foundation-sunshine.json',
    'https://www.alkaidlab.cn/release-metadata/foundation-sunshine.json',
  ])
})

test('one host is asked first; the mirror is not asked when it answered', async () => {
  const asked = []
  const result = await fetchMeta({
    fetch: async (url, init) => {
      asked.push([url, init.credentials, init.referrerPolicy, init.cache])
      return answer(LIVE)
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.host, 'www.alkaidlab.com')
  assert.equal(result.fallback, false)
  assert.deepEqual(asked.map(([url]) => url), [COM])
  assert.ok(asked.every(([, credentials, referrer, cache]) => credentials === 'omit' && referrer === 'no-referrer' && cache === 'default'))
  assert.equal(result.metadata.latest.version, 'v2026.1031.121458.杂鱼')
  assert.deepEqual(metadataUrlsFor('zh'), [CN, COM])
})

test('when the .com host fails the .cn mirror answers, after it, and the result says so', async () => {
  const cases = [
    async () => answer('', { status: 503 }),
    async () => { throw new TypeError('network') },
    async () => answer('{not json'),
    async () => answer({ schema: 1, kind: 'release-metadata', product: 'foundation-sunshine', channels: {} }),
    async () => answer(LIVE, { length: 5 * 1024 * 1024 }),
    async () => answer('x'.repeat(1024 * 1024 + 1)),
    async () => null,
  ]
  for (const failing of cases) {
    const order = []
    const result = await fetchMeta({ fetch: async (url) => { order.push(url); return url === COM ? failing() : answer(LIVE) } })
    assert.equal(result.ok, true)
    assert.equal(result.host, 'www.alkaidlab.cn')
    assert.equal(result.fallback, true)
    assert.equal(result.failed.length, 1)
    assert.equal(result.failed[0].host, 'www.alkaidlab.com')
    assert.deepEqual(order, [COM, CN])
  }
})

test('a host that never answers times out and then the mirror is used', async () => {
  const started = Date.now()
  const result = await fetchMeta({
    timeoutMs: 60,
    fetch: (url, init) => (url === COM ? new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))) : later(10, answer(LIVE))),
  })
  assert.equal(result.ok, true)
  assert.equal(result.host, 'www.alkaidlab.cn')
  assert.ok(Date.now() - started < 1000)
  const hung = await fetchMeta({ timeoutMs: 40, fetch: () => new Promise(() => {}) })
  assert.equal(hung.ok, false)
  assert.equal(hung.reason, 'offline')
  assert.equal(hung.failed.length, 2)
})

test('an answer is kept for 30 minutes and a running check is joined; only force asks again', async () => {
  clearMetadataCache()
  let calls = 0
  let clock = 1000
  const f = async () => { calls += 1; await later(5); return answer(LIVE) }
  const get = (extra = {}) => fetchReleaseMetadata({ fetch: f, now: () => clock, ...extra })
  await Promise.all([get(), get(), get()])
  assert.equal(calls, 1, 'three callers, one request')
  clock += 29 * 60 * 1000
  await get()
  assert.equal(calls, 1)
  await get({ force: true })
  assert.equal(calls, 2)
  clock += 31 * 60 * 1000
  await get()
  assert.equal(calls, 3)
  clearMetadataCache()
})

test('failure reasons', async () => {
  const missing = []
  const gone = await fetchMeta({ fetch: async (url) => { missing.push(url); return answer('', { status: 404 }) } })
  assert.deepEqual(missing, [COM], 'a missing file is an answer: the mirror holds the same files')
  assert.deepEqual([gone.ok, gone.reason], [false, 'absent'])
  const down = await fetchMeta({ fetch: async () => { throw new TypeError('x') } })
  assert.deepEqual([down.ok, down.reason], [false, 'offline'])
  const junk = await fetchMeta({ fetch: async () => answer('<html>') })
  assert.deepEqual([junk.ok, junk.reason], [false, 'malformed'])
  const server = await fetchMeta({ fetch: async () => answer('', { status: 500 }) })
  assert.deepEqual([server.ok, server.reason], [false, 'unavailable'])
  const none = await fetchMeta({ fetch: null, urls: [] })
  assert.deepEqual([none.ok, none.reason], [false, 'unavailable'])
})

test('urls that could carry an identifier are not requested', async () => {
  const asked = []
  const result = await fetchMeta({
    urls: ['http://www.alkaidlab.com/x.json', `${COM}?id=1`, `${COM}#x`, 'https://u:p@www.alkaidlab.com/x.json', 'nope', CN],
    fetch: async (url) => { asked.push(url); return answer(LIVE) },
  })
  assert.deepEqual(asked, [CN])
  assert.equal(result.ok, true)
})

// ---- adapters and the sheet model ---------------------------------------------------------------------------------------

test('the panel update info becomes the sheet data', () => {
  const release = normalizeMetadata(LIVE).latest
  const info = {
    version: release.version,
    release_notes: release.notes,
    download_url: release.installer.url,
    download_fallback_url: release.installer.fallbackUrl,
    download_name: release.installer.name,
    download_size: release.installer.size,
    download_sha256: release.installer.sha256,
    download_type: release.installer.type,
    release_page: release.releasePage,
    is_latest: false,
  }
  const sheet = sheetFromPanelInfo(info, { current: 'v2026.1020.23431.杂鱼', channel: 'stable' })
  assert.equal(sheet.next, release.version)
  assert.equal(sheet.channel, 'stable')
  assert.equal(sheet.latest, false)
  assert.equal(sheet.releasePage, release.releasePage)
  assert.equal(sheet.installer.name, release.installer.name)
  assert.equal(sheet.drivers.found, true)
  assert.equal(sheet.notes.title, '杂鱼更新：1020 → 1031')
  assert.equal(sheetFromPanelInfo({ ...info, release_page: 'https://evil.example/x' }).releasePage, '')
  assert.equal(sheetFromPanelInfo({ ...info, download_url: null }).installer, null)
  assert.equal(sheetFromPanelInfo({ ...info, is_latest: true }).latest, true)
  assert.equal(sheetFromPanelInfo({ ...info }, { channel: 'weird' }).channel, '')
  assert.equal(sheetFromPanelInfo(null), null)
  assert.equal(sheetFromPanelInfo('x'), null)
  assert.equal(sheetFromPanelInfo({}).next, '')
})

test('a GitHub release becomes the sheet data for the Web UI', () => {
  const sheet = sheetFromGithubRelease({ tag_name: 'v2.0.0', body: '## 🎉 Two\n* a by @b in #3', html_url: 'https://github.com/AlkaidLab/foundation-sunshine/releases/tag/v2.0.0', prerelease: true }, { current: 'v1.0.0' })
  assert.equal(sheet.channel, 'prerelease')
  assert.equal(sheet.next, 'v2.0.0')
  assert.equal(sheet.notes.title, 'Two')
  assert.equal(sheet.installer, null)
  assert.equal(sheet.releasePage, 'https://github.com/AlkaidLab/foundation-sunshine/releases/tag/v2.0.0')
  assert.equal(sheetFromGithubRelease({ tag_name: 'v1', html_url: 'javascript:alert(1)' }).releasePage, '')
  assert.equal(sheetFromGithubRelease({ tag_name: 'v1' }).channel, 'stable')
  assert.equal(sheetFromGithubRelease(undefined), null)
  assert.equal(releaseLink('https://cnb.cool/a/b'), 'https://cnb.cool/a/b')
  assert.equal(releaseLink('http://github.com/a'), '')
  assert.equal(releaseLink('https://github.com.evil.example/a'), '')
  assert.equal(releaseLink(5), '')
})

test('the download event becomes progress for the wave', () => {
  assert.deepEqual(downloadView({ progress: 0, total: 0, downloaded: 0, phase: 'connecting', source: null }), { downloadPhase: 'connecting', progress: null, downloaded: 0, total: 0, source: '' })
  assert.deepEqual(downloadView({ progress: 42, total: 1000, downloaded: 420, phase: 'downloading', source: 'CNB' }), { downloadPhase: 'downloading', progress: 0.42, downloaded: 420, total: 1000, source: 'CNB' })
  assert.equal(downloadView({ progress: 10, total: 0, downloaded: 5, phase: 'downloading' }).progress, null)
  assert.equal(downloadView({ progress: 0, total: 9, phase: 'retrying' }).progress, null)
  assert.equal(downloadView({ progress: 99, total: 9, phase: 'verifying' }).progress, 0.99)
  assert.equal(downloadView({ progress: 100, total: 9, phase: 'complete' }).progress, 1)
  assert.equal(downloadView({ progress: 900, total: 9, phase: 'downloading' }).progress, 1)
  assert.equal(downloadView(null).downloadPhase, 'connecting')
  assert.equal(downloadView({ phase: 'odd' }).downloadPhase, 'connecting')
})

test('steps follow the phase and the installer stage', () => {
  const status = (phase, options) => stepsFor(phase, options).map((step) => step.status).join(',')
  assert.equal(status('available'), 'pending,pending,pending')
  assert.equal(status('downloading'), 'active,pending,pending')
  assert.equal(status('ready'), 'done,pending,pending')
  assert.equal(status('installing', { installStage: 'preparing' }), 'done,active,pending')
  assert.equal(status('installing', { installStage: 'installer-started' }), 'done,active,pending')
  assert.equal(status('installing', { installStage: 'app-exiting' }), 'done,done,active')
  assert.equal(status('installing', { installStage: 'failed' }), 'done,failed,pending')
  assert.equal(status('error', { failedStep: 'download' }), 'failed,pending,pending')
  assert.equal(status('error', { failedStep: 'install' }), 'done,failed,pending')
  assert.equal(status('error'), 'failed,pending,pending')
  assert.deepEqual(stepsFor('ready').map((step) => step.key), ['download', 'install', 'restart'])
})

test('every phase has a shape, an icon and a tone; the shapes morph (same number of points)', () => {
  const css = readFileSync(new URL('../src/css/shapes.css', import.meta.url), 'utf8')
  const points = {}
  for (const match of css.matchAll(/--m-shape-(\w+): polygon\(([^;]*)\);/g)) points[match[1]] = match[2].split(',').length
  const used = new Set()
  for (const phase of UPDATE_PHASES) {
    const view = phaseShape(phase)
    assert.ok(points[view.shape], `${phase} -> ${view.shape}`)
    assert.ok(view.icon && view.tone)
    used.add(points[view.shape])
  }
  assert.equal(used.size, 1)
  assert.equal(new Set(UPDATE_PHASES.map((phase) => phaseShape(phase).shape)).size, UPDATE_PHASES.length)
  assert.equal(phaseShape('nope').shape, phaseShape('available').shape)
})

test('sizes and text templates', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(1023), '1023 B')
  assert.equal(formatBytes(1536), '1.5 KB')
  assert.equal(formatBytes(38630470), '36.8 MB')
  assert.equal(formatBytes(93403215), '89.1 MB')
  assert.equal(formatBytes(5 * 1024 ** 3), '5.0 GB')
  assert.equal(formatBytes(1024 ** 4 * 3), '3072 GB')
  assert.equal(formatBytes(-1), '')
  assert.equal(formatBytes(NaN), '')
  assert.equal(formatText('{a} of {b} {c}', { a: 1, b: 'x' }), '1 of x {c}')
  assert.equal(formatText(null), '')
})

test('texts: Chinese and English have the same keys; other and odd locales fall back to English', () => {
  const en = updateTexts('en')
  const zh = updateTexts('zh')
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  for (const key of Object.keys(en)) {
    assert.equal(typeof en[key], 'string', key)
    assert.ok(en[key] && zh[key], key)
    const holes = (text) => (text.match(/\{\w+\}/g) || []).sort().join()
    assert.equal(holes(zh[key]), holes(en[key]), key)
  }
  for (const locale of ['zh-CN', 'zh_TW', 'ZH-hans', ' zh ']) assert.equal(updateTexts(locale).updateNow, zh.updateNow, locale)
  for (const locale of ['de', 'ja-JP', 'pt_BR', '', 'x', undefined, null, 5, {}, 'en-US', 'EN']) assert.equal(updateTexts(locale).updateNow, en.updateNow, String(locale))
  assert.equal(updateTexts('zh', { updateNow: 'Go' }).updateNow, 'Go')
  assert.equal(updateTexts('zh', null).updateNow, zh.updateNow)
  assert.equal(updateTexts('en', 'x').updateNow, en.updateNow)
})

test('the helpers are reachable through the package export', () => {
  assert.equal(viaExports.parseReleaseNotes, parseReleaseNotes)
  assert.equal(viaExports.pickRelease, pickRelease)
})

// A download is a native task: closing the sheet must not stop it, and the
// sheet must offer the way to the background. Only an install holds the sheet,
// because the installer is about to close the panel itself.
test('the update sheet leaves a running download to the background', () => {
  const sheet = readFileSync(new URL('../src/vue/MUpdateSheet.vue', import.meta.url), 'utf8')
  assert.match(sheet, /const busy = computed\(\(\) => props\.phase === 'installing'\)/)
  assert.match(sheet, /v-else-if="phase === 'downloading'"[\s\S]*?@click="later"/)
  assert.match(updateTexts('zh').backgroundHint, /托盘/)
  assert.match(updateTexts('en').backgroundHint, /tray/)
})
