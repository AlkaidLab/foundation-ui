import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CLIENTS, clientTexts, isOfficial } from '../src/clients/catalogue.js'
import { starClientFor, starTargets } from '../src/vue/starCard.js'

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')

test('AB2: the official clients are V+ Desktop, V+ Android, V+ HarmonyOS and macOS Enhanced; the others are partners', () => {
  assert.deepEqual(CLIENTS.filter(isOfficial).map((c) => c.id).sort(), ['macos-enhanced', 'vplus-android', 'vplus-desktop', 'vplus-harmony'])
  assert.deepEqual(CLIENTS.filter((c) => !isOfficial(c)).map((c) => c.id).sort(), ['baozi', 'crown', 'voidlink'])
  assert.match(read('../src/clients/catalogue.js'), /Four clients are works of the Foundation team and official/)
})

test('AB1: the star rows are Foundation Sunshine and the four official clients, nothing of a partner', () => {
  const repos = starTargets().map((t) => t.repo)
  assert.deepEqual(repos, ['AlkaidLab/foundation-sunshine', 'qiin2333/moonlight-qt', 'qiin2333/moonlight-vplus', 'skyhua0224/moonlight-macos-enhanced', 'AlkaidLab/moonlight-harmony'])
  assert.ok(!repos.some((r) => /VoidLink|WACrown|smdsbz|Fried-Fish/i.test(r)))
})

test('AB1: the star prompt of the overview never asks for a partner client (no VoidLink on an iPhone); HarmonyOS asks for V+', () => {
  assert.equal(starClientFor({ names: ['iPhone 15'] }), null)
  assert.equal(starClientFor({ names: ['iPad Air'] }), null)
  assert.equal(starClientFor({ names: ['MatePad'] }).name, 'Moonlight V+')
  assert.equal(starClientFor({ names: ['Pixel 9'] }).name, 'Moonlight V+')
})

test('AB1: 关于 has no partner section: the data of the page has no partner list', () => {
  assert.ok(!/PARTNER_CLIENTS/.test(read('../src/about/data.js') + read('../src/about/index.js')))
  assert.ok(!/VoidLink/.test(read('../src/about/data.js')))
})

test('AB3: the tag is the plain word, 官方 or 合作 (Official or Partner), the same component everywhere a client is listed', () => {
  assert.equal(clientTexts('zh').tagOfficial, '官方'); assert.equal(clientTexts('zh').tagPartner, '合作')
  assert.equal(clientTexts('en').tagOfficial, 'Official'); assert.equal(clientTexts('en').tagPartner, 'Partner')
  const tag = read('../src/vue/MClientTag.vue')
  assert.match(tag, /official \? T\.tagOfficial : T\.tagPartner/)
  for (const f of ['../src/vue/MDashDownload.vue', '../src/vue/MConnectPanel.vue']) {
    const src = read(f)
    assert.match(src, /import MClientTag from '\.\/MClientTag\.vue'/, f)
    assert.ok((src.match(/<MClientTag /g) || []).length >= 2, `${f}: the lead and the other clients carry the tag`)
    assert.ok(!/m-conn__badge/.test(src), `${f}: the old badge is gone`)
  }
  const css = read('../src/css/connect.css')
  assert.match(css, /\.m-ctag--official \{ background: var\(--md-sys-color-primary-container\)/)
  assert.match(css, /\.m-ctag--partner \{ background: transparent; [^}]*outline\)/)
})

test('follow-up: the partner section is named 合作客户端 after its tag; the others list of a system takes that name when all of them are partners', async () => {
  const { othersTitle, connectTexts } = await import('../src/clients/recommend.js')
  assert.equal(clientTexts('zh').partner, '合作客户端'); assert.equal(clientTexts('zh').first, '官方推荐')
  assert.equal(clientTexts('en').partner, 'Partner clients'); assert.equal(clientTexts('en').first, 'Recommended')
  const T = connectTexts('zh')
  const partner = { client: { group: 'partner' } }, official = { client: { group: 'first' } }
  assert.equal(othersTitle([partner, partner], T), '合作客户端')
  assert.equal(othersTitle([official, partner], T), '其他客户端', 'a mixed list is not called the partners\'')
  assert.equal(othersTitle([], T), '其他客户端')
  for (const f of ['../src/vue/MConnectPanel.vue', '../src/vue/MDashDownload.vue']) assert.match(read(f), /othersTitle\(rec\.others, T\)/, f)
})

test('follow-up: 关于 puts the two privacy rows (error reports, usage statistics) under 隐私, not under a header that repeats its title', () => {
  const about = read('../src/vue/MAbout.vue')
  assert.match(about, /<MSection v-if="consent \|\| errors" :title="E\.consentSection">/)
  assert.match(about, /data-privacy="errors"[^>]*@update:model-value="\(v\) => emit\('errors'/); assert.match(about, /data-privacy="usage"[^>]*@update:model-value="\(v\) => emit\('consent'/)
  const texts = read('../src/vue/errorTexts.js')
  assert.match(texts, /consentSection: '隐私'/); assert.match(texts, /consentSection: 'Privacy'/)
})

test('follow-up: the other clients of a system never repeat the lead, each client once', async () => {
  const { recommendForOs } = await import('../src/clients/recommend.js')
  for (const os of ['windows', 'macos', 'linux', 'android', 'ios', 'harmony', 'tv']) {
    const r = recommendForOs(os)
    const ids = r.others.map((x) => x.client.id)
    assert.ok(!ids.includes(r.client.id), `${os}: the lead is not among the others`)
    assert.equal(new Set(ids).size, ids.length, `${os}: each client once`)
  }
  assert.deepEqual(recommendForOs('android').others.map((x) => x.client.id), ['crown'], 'Android: the partner edition is what is left')
})
