import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { CLIENTS, CLIENT_OS, CLIENT_TYPES, clientSections, clientsForOs, clientsForType, clientTexts, osName } from '../src/clients/catalogue.js'
import { GUIDE_CLIENTS, GUIDE_DEVICES, clientFor } from '../src/vue/guideModel.js'

test('three clients are the team\'s works and they come first, everything else is a partner\'s', () => {
  const { first, partner } = clientSections()
  assert.deepEqual(first.map((c) => c.id), ['vplus-desktop', 'vplus-android', 'macos-enhanced', 'vplus-harmony']) // official: macOS Enhanced is the team's third in the full list
  for (const id of ['voidlink', 'crown', 'baozi']) assert.ok(partner.some((c) => c.id === id), id)
  assert.equal(first.length + partner.length, CLIENTS.length)
  assert.deepEqual(CLIENTS.slice(0, 4).map((c) => c.group), ['first', 'first', 'first', 'first'])
  assert.notEqual(CLIENTS[0].id, 'macos-enhanced')
  assert.ok(CLIENTS.slice(4).every((c) => c.group === 'partner'))
})

test('filtered by an operating system there is one list: the team\'s clients first, then the others', () => {
  for (const os of CLIENT_OS) {
    const list = clientsForOs(os)
    assert.ok(list.length > 0, os)
    const firstPartner = list.findIndex((x) => x.client.group === 'partner')
    if (firstPartner >= 0) assert.ok(list.slice(firstPartner).every((x) => x.client.group === 'partner'), `${os}: a team client after a partner`)
  }
  assert.deepEqual(clientsForOs('macos').map((x) => x.client.id), ['macos-enhanced', 'vplus-desktop']) // on macOS its own client leads
  assert.deepEqual(clientsForOs('windows').map((x) => x.client.id), ['vplus-desktop'])
  assert.deepEqual(clientsForOs('android').map((x) => x.client.id), ['vplus-android', 'vplus-android', 'crown'])
  assert.deepEqual(clientsForOs('ios').map((x) => x.client.id), ['voidlink'])
  assert.deepEqual(clientsForOs('harmony').map((x) => x.client.id), ['vplus-harmony', 'baozi'])
})

test('the order is the one of ProjectCompute\'s CEND page, adjusted by the team\'s rules (team first, macOS Enhanced third)', () => {
  const file = `${process.env.HOME}/Projects/ProjectCompute/frontend/soybean-admin/src/projectcompute/views/cend/machines/FoundationSunshineClients.vue`
  const ours = ['vplus-desktop', 'vplus-android', 'macos-enhanced', 'vplus-harmony', 'voidlink']
  assert.deepEqual(CLIENTS.slice(0, 5).map((c) => c.id), ours)
  if (!existsSync(file)) return
  const order = [...readFileSync(file, 'utf8').match(/CLIENT_ORDER = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  const MAP = { 'moonlight-macos-enhanced': 'macos-enhanced', 'moonlight-vplus-desktop': 'vplus-desktop', 'moonlight-vplus-android': 'vplus-android', 'moonlight-vplus-harmony': 'vplus-harmony', 'voidlink-ios-cn': 'voidlink', 'voidlink-extreme-ios': 'voidlink' }
  const mapped = [...new Set(order.map((k) => MAP[k]))]
  // the CEND page without macOS Enhanced is our order without it
  assert.deepEqual(mapped.filter((id) => id !== 'macos-enhanced'), ours.filter((id) => id !== 'macos-enhanced'))
})

test('the home card, the guide and the list agree', () => {
  // the guide recommends, for each system, the first client of that system's list
  for (const device of GUIDE_DEVICES) {
    const wanted = clientsForOs(device.id)[0].client
    assert.equal(clientFor(device.id, 'en').id, wanted.guide, device.id)
    assert.equal(GUIDE_CLIENTS[wanted.guide].url, wanted.url)
  }
})

test('the section and system names exist in both languages', () => {
  for (const locale of ['en', 'zh']) {
    const t = clientTexts(locale)
    for (const key of ['all', 'first', 'partner', 'partnerBadge', 'tv', 'os']) assert.ok(t[key], `${locale} ${key}`)
    for (const os of CLIENT_OS) assert.ok(osName(os, locale))
  }
  assert.equal(clientTexts('zh-CN').first, '官方推荐')
})

test('every client has its project and releases link; only the Gitee one is not GitHub', () => {
  for (const c of CLIENTS) {
    assert.ok(/^https:\/\/(github|gitee)\.com\//.test(c.links.project) && c.links.releases.startsWith(c.links.project), c.id)
    assert.equal(c.links.host, c.links.project.includes('gitee.com') ? 'gitee' : 'github', c.id)
  }
  assert.equal(CLIENTS.filter((c) => c.links.host === 'gitee').map((c) => c.id).join(), 'baozi')
})
