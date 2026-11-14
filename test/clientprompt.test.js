import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { OPTIONS_BY_OS, clientInUse, clientRecommendation, isRecommended, markClientRec, readClientRec } from '../src/vue/clientPrompt.js'
import { readDash } from './dashSource.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }
// the documented answer of GET /api/clients/list (host docs/api/client-family.md): the example entry, and one of each family
const DOC = { status: 'true', named_certs: [{ name: 'Living room', uuid: '4A9023F3-9957-7F20-0302-CF638C7DFC2C', enabled: true, streaming: false, family: 'moonlight-macos-enhanced', official: true, version: '1.3.9', os: 'macos', family_source: 'moonlight-macos-enhanced-user-agent:header.user-agent,header.user-agent(version)', last_seen: 1762243200 }] }
const dev = (family, os, extra = {}) => ({ name: `${family}/${os}`, uuid: `${family}-${os}`, enabled: true, streaming: false, family, official: { 'moonlight-vplus-android': true, 'moonlight-vplus-desktop': true, 'moonlight-macos-enhanced': true, voidlink: false, 'moonlight-upstream': false, unknown: null }[family], version: null, os, family_source: null, last_seen: 1762243200, ...extra })
const rec = (c, done = []) => clientRecommendation({ use: c, done, locale: 'zh' })
const ids = (r) => r.options.map((o) => o.id)

test('the documented example (a macOS Enhanced client, official) is a recommended client: the star prompt stays', () => {
  const c = DOC.named_certs[0]
  assert.equal(isRecommended(c), true); assert.equal(rec(c), null)
  assert.equal(clientInUse({ clients: DOC.named_certs }), c)
})

test('recommended: official true, or VoidLink on iOS or tvOS', () => {
  for (const f of ['moonlight-vplus-android', 'moonlight-vplus-desktop', 'moonlight-macos-enhanced']) for (const os of ['android', 'windows', 'macos', null]) assert.equal(isRecommended(dev(f, os)), true, `${f}/${os}`)
  assert.equal(isRecommended(dev('voidlink', 'ios')), true); assert.equal(isRecommended(dev('voidlink', 'tvos')), true)
  assert.equal(isRecommended(dev('voidlink', 'android')), false); assert.equal(isRecommended(dev('voidlink', null)), false)
  assert.equal(isRecommended(dev('moonlight-upstream', 'macos')), false); assert.equal(isRecommended(dev('unknown', null)), false)
})

test('upstream Moonlight gets the recommendation for its os: macOS two, Windows and Linux V+ Desktop, Android V+ Android, iOS and tvOS VoidLink', () => {
  assert.deepEqual(OPTIONS_BY_OS.macos, ['macos-enhanced', 'vplus-desktop'])
  const expect = { macos: ['macos-enhanced', 'vplus-desktop'], windows: ['vplus-desktop'], linux: ['vplus-desktop'], android: ['vplus-android'], ios: ['voidlink'], tvos: ['voidlink'] }
  for (const [os, want] of Object.entries(expect)) assert.deepEqual(ids(rec(dev('moonlight-upstream', os))), want, os)
  const r = rec(dev('moonlight-upstream', 'macos', { version: '6.1.0' }))
  assert.deepEqual(r.options.map((o) => o.label), ['Moonlight macOS Enhanced', 'Moonlight V+ Desktop'])
  assert.ok(r.options.every((o) => /^https:\/\//.test(o.url)))
  assert.equal(r.osWord, 'macOS'); assert.equal(r.app, 'Moonlight 6.1.0'); assert.equal(rec(dev('moonlight-upstream', 'ios')).osWord, 'iPhone / iPad'); assert.equal(rec(dev('moonlight-upstream', 'tvos')).osWord, 'Apple TV')
})

test('no answer keeps the star card: unknown, VoidLink elsewhere, a null family, nothing at all', () => {
  assert.equal(rec(dev('unknown', null)), null); assert.equal(rec(dev('unknown', 'android')), null)
  assert.equal(rec(dev('voidlink', 'android')), null)
  assert.equal(rec({ name: 'x', uuid: 'u', family: null, official: null, os: 'android', last_seen: null }), null)
  assert.equal(rec(null), null); assert.equal(rec(undefined), null)
})

test('the system of the recommendation: the host\'s os, then what the name of the device says, then none (the card still comes, naming no system)', () => {
  const up = (os, name) => rec({ name, uuid: `u-${name}`, family: 'moonlight-upstream', official: false, os, last_seen: 1 })
  const withOs = up('macos', 'Pixel 9')
  assert.equal(withOs.os, 'macos', 'the host\'s os wins over the name'); assert.equal(withOs.platform, 'macos'); assert.ok(withOs.options.length)
  const byName = up(null, 'Pixel 9')
  assert.equal(byName.os, 'android', 'os null: Pixel 9 is Android'); assert.equal(byName.platform, 'android'); assert.deepEqual(byName.options.map((o) => o.id), ['vplus-android'])
  assert.equal(up(null, 'Studio MacBook').os, 'macos')
  const none = up(null, 'My device')
  assert.ok(none, 'upstream Moonlight with no system still gets the card'); assert.equal(none.os, null); assert.equal(none.osWord, ''); assert.deepEqual(none.options, []); assert.equal(none.platform, '')
  assert.equal(up('linux-arm', 'My device').os, null, 'an os this table does not know is no system')
  assert.equal(up('tvos', 'x').os, 'tvos')
  assert.equal(rec({ name: 'Pixel 9', uuid: 'u', family: 'unknown', official: null, os: null, last_seen: 1 }), null, 'unknown never gets a verdict, whatever its name says')
})

test('the client in use: the session\'s device (by uuid, else by name), else the latest last_seen; never seen is the last choice', () => {
  const a = dev('moonlight-upstream', 'android', { name: 'Pixel 9', uuid: 'U-A', last_seen: 100 })
  const b = dev('moonlight-vplus-desktop', 'windows', { name: 'Desk', uuid: 'U-B', last_seen: 300 })
  const c = dev('moonlight-upstream', 'macos', { name: 'Mac', uuid: 'U-C', last_seen: 200 })
  const never = dev('unknown', null, { name: 'Old', uuid: 'U-D', last_seen: null })
  assert.equal(clientInUse({ clients: [a, b, c] }), b)
  assert.equal(clientInUse({ clients: [a, b, c], session: { uuid: 'u-c' } }), c) // uuid, case-insensitive
  assert.equal(clientInUse({ clients: [a, b, c], session: { uuid: '', name: 'Pixel 9' } }), a) // by name when the session has no uuid
  assert.equal(clientInUse({ clients: [a, b, c], session: { uuid: 'nobody', name: 'nobody' } }), b) // a session of no listed device: the latest seen
  assert.equal(clientInUse({ clients: [never, a] }), a); assert.equal(clientInUse({ clients: [never] }), never)
  assert.equal(clientInUse({ clients: [] }), null); assert.equal(clientInUse({}), null)
  // an upstream client that is the one in use gets the prompt; once the V+ one was seen after it, the star prompt stays
  assert.ok(rec(clientInUse({ clients: [a, c] })))
  assert.equal(rec(clientInUse({ clients: [a, c, b] })), null)
})

test('once per device: handled, it does not come back for that device (by uuid), another device is offered', () => {
  const storage = mem()
  const a = dev('moonlight-upstream', 'android', { uuid: 'U-A' }), b = dev('moonlight-upstream', 'ios', { uuid: 'U-B' })
  const first = rec(a); assert.ok(first)
  const done = markClientRec('web-home', first.key, storage)
  assert.deepEqual(readClientRec('web-home', storage), done)
  assert.equal(rec(a, done), null); assert.ok(rec(b, done))
  assert.deepEqual(readClientRec('other-home', storage), []); assert.deepEqual(readClientRec('web-home', { getItem: () => 'not json' }), [])
})

test('the overview and the products read the documented fields (no invented one); the prompt is neutral', () => {
  const d = readDash()
  assert.match(d, /const clientRec = computed\(\(\) => \{\s*if \(!props\.ctx\.star\) return null/)
  assert.match(d, /clientInUse\(\{ clients: props\.ctx\.clientList \|\| \[\], session: props\.ctx\.sessionClient \|\| null \}\)/)
  assert.match(d, /<MClientPrompt v-if="clientRec && !edit && !pending"/); assert.match(d, /<MStarPrompt v-else-if="ctx\.star && !edit && !pending"/)
  assert.ok(!/client_app|clientApp|\.app\b/.test(read('src/vue/clientPrompt.js').replace(/use\.app|`app`/g, '')))
  const t = read('src/vue/homeEditTexts.js')
  assert.match(t, /crTitle: '推荐更换客户端'/); assert.match(t, /crLater: '以后再说'/)
  assert.ok(!/(bad|worse|inferior|outdated|不好|差|劣)/i.test(t.match(/crTitle[^\n]*/)[0] + t.match(/crLine[^\n]*/)[0]))
})
