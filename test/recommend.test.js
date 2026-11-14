import test from 'node:test'
import assert from 'node:assert/strict'
import { CONNECT_OS, QR_PAIRING, clientUrl, connectTexts, readsPairQr, recommendForOs } from '../src/clients/recommend.js'
import { RECOMMENDED_TYPE, assetOsOf, copyChoices, mirrorName, releaseRows } from '../src/clients/assets.js'
import { readOs, writeOs } from '../src/clients/osChoice.js'
import { CLIENTS } from '../src/clients/catalogue.js'
import { JOURNEY_STEPS, journeyActive, journeyAfterCount, readJourney, writeJourney } from '../src/vue/journey.js'

test('one client is recommended per operating system, the rest are behind it, the team first', () => {
  const pick = (os) => { const r = recommendForOs(os); return `${r.client.id}/${r.target.platform}` }
  assert.equal(pick('windows'), 'vplus-desktop/windows')
  assert.equal(pick('macos'), 'macos-enhanced/macos')
  assert.equal(pick('linux'), 'vplus-desktop/linux')
  assert.equal(pick('android'), 'vplus-android/android')
  assert.equal(pick('tv'), 'vplus-android/android-tv')
  assert.equal(pick('ios'), 'voidlink/ios')
  assert.equal(pick('harmony'), 'vplus-harmony/harmony')
  for (const os of CONNECT_OS) {
    const r = recommendForOs(os)
    assert.equal(r.official, r.client.group === 'first', os)
    assert.ok(!r.others.some((x) => x.client.id === r.client.id && x.target.platform === r.target.platform))
    // the team's clients come before the partners' in every system
    const at = r.others.findIndex((x) => x.client.group === 'partner')
    if (r.official && at >= 0) assert.ok(r.others.slice(at).every((x) => x.client.group === 'partner'), os)
  }
  assert.deepEqual([...CONNECT_OS], ['windows', 'macos', 'linux', 'android', 'ios', 'harmony', 'tv'])
  // a HarmonyOS user finds a client: the system has its own chip and its clients
  assert.ok(recommendForOs('harmony').others.some((x) => x.client.id === 'baozi'))
  assert.equal(recommendForOs('nothing').client.id, 'vplus-android') // an unknown system falls back to Android
})

test('the system the person chose is remembered, Android the first time', () => {
  const store = new Map(); const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  assert.equal(readOs(storage), 'android')
  writeOs('harmony', storage); assert.equal(readOs(storage), 'harmony')
  writeOs('plan9', storage); assert.equal(readOs(storage), 'harmony')
})

test('release files: every architecture of a system, best first, CNB or GitHub first by language, nothing that is not for people', () => {
  const asset = (type, size = 1e7) => ({ type, name: `${type}.bin`, size, sha256: 'a'.repeat(64), url: `https://cnb.cool/x/${type}`, fallbackUrl: `https://github.com/x/${type}` })
  const assets = ['linux-arm64-appimage', 'linux-arm64-appimage-zsync', 'macos-arm64-dmg', 'linux-x64-appimage', 'linux-x64-appimage-zsync', 'windows-arm64-portable', 'windows-x64-portable', 'windows-x64-installer', 'steam-link-zip', 'windows-x64-installer-alias', 'macos-universal-dmg', 'macos-x64-dmg', 'file-other', 'android-apk'].map((t) => asset(t))
  assert.deepEqual(releaseRows(assets, 'windows', 'zh').map((r) => r.type), ['windows-x64-installer', 'windows-x64-portable', 'windows-arm64-portable'])
  assert.deepEqual(releaseRows(assets, 'macos', 'zh').map((r) => r.type), ['macos-universal-dmg', 'macos-arm64-dmg', 'macos-x64-dmg'])
  assert.deepEqual(releaseRows(assets, 'linux', 'en').map((r) => r.type), ['linux-x64-appimage', 'linux-arm64-appimage'])
  assert.deepEqual(releaseRows(assets, 'android', 'en').map((r) => r.type), ['android-apk'])
  assert.deepEqual(releaseRows(assets, 'tv', 'en').map((r) => r.type), ['steam-link-zip'])
  assert.deepEqual(releaseRows(assets, 'ios', 'en'), [])
  for (const [os, best] of Object.entries(RECOMMENDED_TYPE)) { const rows = releaseRows(assets, os, 'zh'); assert.equal(rows.filter((r) => r.recommended).map((r) => r.type)[0], best, os); assert.equal(rows.filter((r) => r.recommended).length, 1) }
  const zh = releaseRows(assets, 'windows', 'zh')[0], en = releaseRows(assets, 'windows', 'en')[0]
  assert.equal(zh.url, zh.cnbUrl); assert.equal(zh.mirrorUrl, zh.githubUrl)
  assert.equal(en.url, en.githubUrl); assert.equal(en.mirrorUrl, en.cnbUrl)
  assert.equal(zh.sha256.length, 64); assert.equal(zh.sizeLabel, '10.0 MB')
  assert.equal(releaseRows(assets, 'macos', 'zh')[1].archLabel, 'Apple 芯片')
  assert.equal(assetOsOf({ platform: 'android-tv', os: 'tv' }), 'android'); assert.equal(assetOsOf({ platform: 'steam', os: 'tv' }), 'tv'); assert.equal(assetOsOf({ platform: 'macos', os: 'macos' }), 'macos')
  assert.equal(mirrorName('zh'), 'GitHub'); assert.equal(mirrorName('en'), 'CNB')
})

test('the QR is for the clients verified to read it', () => {
  assert.deepEqual([...QR_PAIRING], ['vplus-android'])
  assert.ok(readsPairQr(CLIENTS.find((c) => c.id === 'vplus-android')))
  assert.ok(!readsPairQr(CLIENTS.find((c) => c.id === 'macos-enhanced')) && !readsPairQr(CLIENTS.find((c) => c.id === 'vplus-desktop')) && !readsPairQr(null))
})

test('the links follow the language and the texts exist in both', () => {
  assert.equal(clientUrl(CLIENTS.find((c) => c.id === 'voidlink'), 'zh-CN'), 'https://apps.apple.com/cn/app/voidlink/id6747717070')
  assert.equal(clientUrl(CLIENTS.find((c) => c.id === 'voidlink'), 'en'), 'https://apps.apple.com/us/app/voidlink-extreme/id6755103808')
  assert.deepEqual(Object.keys(connectTexts('zh')).sort(), Object.keys(connectTexts('en')).sort())
  assert.equal(connectTexts('zh').official, '官方推荐')
  assert.equal(connectTexts('zh').others, '其他客户端')
})

test('the journey: shown with no client, moves on by itself when one pairs, remembers where it was', () => {
  const store = new Map()
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  const fresh = readJourney('t', storage)
  assert.deepEqual([fresh.step, fresh.os, fresh.dismissed], [0, '', false])
  assert.ok(journeyActive(0, fresh) && !journeyActive(1, fresh) && !journeyActive(0, { ...fresh, dismissed: true }))
  let s = journeyAfterCount({ ...fresh, step: 2 }, 0)
  assert.equal(s.started, 0); assert.equal(s.step, 2)
  s = journeyAfterCount(s, 1) // a client paired
  assert.equal(s.step, JOURNEY_STEPS - 1)
  writeJourney('t', { ...s, os: 'harmony' }, storage)
  assert.equal(readJourney('t', storage).os, 'harmony')
  assert.deepEqual(readJourney('none', { getItem: () => '{bad' }).step, 0)
})

test('copy and share use exactly the link the download button uses, for every file, in both languages', () => {
  const types = ['windows-x64-installer', 'windows-x64-portable', 'windows-arm64-portable', 'macos-universal-dmg', 'macos-arm64-dmg', 'macos-x64-dmg', 'linux-x64-appimage', 'linux-arm64-appimage', 'android-apk', 'steam-link-zip']
  const assets = types.map((type) => ({ type, name: `${type}.bin`, size: 1e7, sha256: 'b'.repeat(64), url: `https://cnb.cool/AlkaidLab/x/-/releases/download/v1/${type}`, fallbackUrl: `https://github.com/x/x/releases/download/v1/${type}` }))
  for (const locale of ['zh', 'en']) {
    const T = connectTexts(locale)
    for (const os of ['windows', 'macos', 'linux', 'android', 'tv']) {
      for (const row of releaseRows(assets, os, locale)) {
        const choices = copyChoices(row, T)
        assert.equal(choices[0].url, row.url, `${row.type} ${locale}: the first choice is the download link`)
        assert.deepEqual(new Set(choices.map((c) => c.url)), new Set([row.cnbUrl, row.githubUrl]), `${row.type}: the menu has the CNB and the GitHub link`)
        assert.equal(choices.find((c) => c.url === row.cnbUrl).label, T.copyCnb); assert.equal(choices.find((c) => c.url === row.githubUrl).label, T.copyGithub)
        assert.ok(row.url.startsWith(locale === 'zh' ? 'https://cnb.cool/' : 'https://github.com/'))
      }
    }
  }
  assert.deepEqual(copyChoices({ url: 'https://x/y', cnbUrl: '', githubUrl: 'https://x/y' }, connectTexts('en')).map((c) => c.url), ['https://x/y'], 'one host, one choice, no menu')
})
