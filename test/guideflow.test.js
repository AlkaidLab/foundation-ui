import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CONNECT_CHECKS, buildGuideSteps, readProgress, writeProgress } from '../src/vue/guideModel.js'
import { addressKind, guideEntry, upgradeSkips } from '../src/vue/guideEntry.js'
import { guideTexts } from '../src/vue/guideTexts.js'

const read = (f) => readFileSync(new URL(`../src/vue/${f}`, import.meta.url), 'utf8')
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }

test('an upgrade starts with what is new and has no language screen; a first install has the intro and no what-is-new', () => {
  assert.equal(buildGuideSteps({ mode: 'upgrade' })[0].id, 'whatsnew')
  assert.ok(!buildGuideSteps({ mode: 'upgrade' }).some((s) => s.id === 'intro'))
  assert.equal(buildGuideSteps()[0].id, 'intro')
  assert.ok(!buildGuideSteps().some((s) => s.id === 'whatsnew'))
})

test('progress keeps the version the flow was shown for, and how', () => {
  const storage = memory()
  writeProgress(storage, 'k', { step: 'pair', finished: true, device: null, visited: ['intro'], version: '2.4.0', mode: 'upgrade' })
  const back = readProgress(storage, 'k')
  assert.equal(back.version, '2.4.0'); assert.equal(back.mode, 'upgrade')
  storage.setItem('old', JSON.stringify({ v: 1, step: 'intro', finished: true, visited: [] }))
  assert.equal(readProgress(storage, 'old').version, '')
})

test('guideEntry: a first install gets the whole flow, an existing install the upgrade flow once per version', () => {
  const fresh = { version: '2.4.0', setupCompleted: false, pairedCount: 0, progress: null }
  assert.deepEqual(guideEntry(fresh), { mode: 'fresh' })
  // a first install that was left half way opens again where it was, whatever the version
  assert.deepEqual(guideEntry({ ...fresh, progress: { finished: false, visited: ['intro'], version: '2.4.0', mode: 'fresh' } }), { mode: 'fresh' })
  // an install that exists (setup done) and that has not seen this version
  assert.deepEqual(guideEntry({ version: '2.4.0', setupCompleted: true, pairedCount: 2, progress: null }), { mode: 'upgrade' })
  assert.deepEqual(guideEntry({ version: '2.4.0', setupCompleted: true, pairedCount: 2, progress: { finished: true, visited: [], version: '2.3.0', mode: 'fresh' } }), { mode: 'upgrade' })
  // paired clients with the setup flag never set (an older install) is an existing install too
  assert.deepEqual(guideEntry({ version: '2.4.0', setupCompleted: false, pairedCount: 1, progress: null }), { mode: 'upgrade' })
  // shown (closed, skipped or finished) for this version: not again
  assert.equal(guideEntry({ version: '2.4.0', setupCompleted: true, pairedCount: 2, progress: { finished: false, visited: ['whatsnew'], version: '2.4.0', mode: 'upgrade' } }), null)
  assert.equal(guideEntry({ version: '2.4.0', setupCompleted: true, pairedCount: 2, progress: { finished: true, visited: [], version: '2.4.0', mode: 'upgrade' } }), null)
  // a host that could not be read opens nothing
  assert.equal(guideEntry({ version: '2.4.0', setupCompleted: undefined, pairedCount: null, progress: null }), null)
  assert.equal(guideEntry({ version: '2.4.0', setupCompleted: true, pairedCount: 1, configExists: false, progress: null }), null)
  // setup not done, pairing count unknown: not a clear first install
  assert.equal(guideEntry({ version: '2.4.0', setupCompleted: false, pairedCount: null, progress: null }), null)
})

test('guideEntry without a version keeps the first-run rule of before', () => {
  assert.deepEqual(guideEntry({ setupCompleted: false, pairedCount: 0 }), { mode: 'fresh' })
  assert.equal(guideEntry({ setupCompleted: true, pairedCount: 3 }), null)
  assert.equal(guideEntry({ setupCompleted: false, pairedCount: 0, progress: { finished: true, visited: [] } }), null)
})

test('an upgrade leaves out what is done: the password, the setup, and the client steps once a client is paired', () => {
  assert.deepEqual(upgradeSkips({ accountExists: true, setupCompleted: true, pairedCount: 2 }), ['account', 'setup', 'hostdone', 'install', 'address', 'pair'])
  assert.deepEqual(upgradeSkips({ accountExists: false, setupCompleted: false, pairedCount: 0 }), [])
  assert.deepEqual(upgradeSkips({ accountExists: true, setupCompleted: true, pairedCount: null }), ['account', 'setup'])
})

test('an address is named by how a client reaches it', () => {
  assert.equal(addressKind({ name: 'ZeroTier One [154a350c867ec550]', address: '10.99.8.70', rank: 0 }), 'zerotier')
  assert.equal(addressKind({ name: 'Tailscale', address: '100.101.1.2', rank: 1 }), 'tailscale')
  assert.equal(addressKind({ name: '以太网 11', address: '192.168.7.133', rank: 0 }), 'lan')
  assert.equal(addressKind({ name: '', address: '8.8.8.8' }), 'public')
})

test('the address step: the new title, no yellow localhost warning, the ways of connecting named in the text', () => {
  for (const locale of ['zh', 'en']) {
    const a = guideTexts(locale).address
    assert.ok(!('lan' in a), 'the localhost banner text is gone')
    assert.ok(a.kinds.lan && a.kinds.zerotier)
  }
  assert.equal(guideTexts('zh').titles.address, '在已安装的客户端与此设备配对')
  const flow = read('MGuideFlow.vue'); const address = read('MGuideAddress.vue')
  assert.ok(!flow.includes("tone=\"warn\" icon=\"warning\">{{ T.address.lan"))
  assert.match(address, /data-layer="listed"/); assert.match(address, /data-layer="address"/)
})

test('the install step is the 连接设备 view, one column for every system, and does not leave the guide', () => {
  const flow = read('MGuideFlow.vue')
  assert.match(flow, /<MConnectPanel[^>]*no-downloads-link/)
  assert.ok(!flow.includes('m-guide__client'))
  assert.match(read('MConnectPanel.vue'), /v-if="!noDownloadsLink"/)
})

test('the first stream check has sound, mouse, keyboard and picture checks and the test tools in place', () => {
  assert.deepEqual(CONNECT_CHECKS.map((c) => c.id), ['picture', 'mouse', 'keyboard', 'sound'])
  for (const locale of ['zh', 'en']) { const c = guideTexts(locale).connect; for (const check of CONNECT_CHECKS) { assert.ok(c.checks[check.id]); assert.ok(c.hints[check.id]) } }
  const tools = read('MGuideTry.vue')
  for (const part of ['TestChannels', 'TestInput', 'TestPatterns', 'TestPacing', 'TestSync', 'MLatencyClock']) assert.ok(tools.includes(part), part)
  assert.match(read('MGuideFlow.vue'), /<MGuideTry/)
})

test('pairing and the setup offer 跳到下一页 beside skipping the guide; the guide ends with an offer to open the test tools', () => {
  const flow = read('MGuideFlow.vue')
  assert.match(flow, /showSkipStep = computed\(\(\) => [^\n]*\['setup', 'pair'\]/)
  assert.match(flow, /@click="skipStep"/)
  assert.match(flow, /function openTools\(\) \{ finish\('tools'\)/)
  assert.equal(guideTexts('zh').skipStep, '跳到下一页')
})

test('scanning the game libraries and adding by hand stay in the guide: a sheet, and back to the guide', () => {
  const flow = read('MGuideFlow.vue'); const sheet = read('MGuideAppsSheet.vue')
  assert.match(flow, /<MGuideAppsSheet/)
  assert.match(flow, /appsSheet\.value = mode; return/)
  assert.match(sheet, /scanGames/); assert.match(sheet, /addGames/)
  assert.ok(sheet.includes("open = ''"), 'a button returns to the guide')
})

test('closing, skipping or finishing stores the version of the flow; an upgrade starts at the top and does not wait to skip', () => {
  const flow = read('MGuideFlow.vue')
  assert.match(flow, /progress\.version = props\.version/)
  assert.match(flow, /function close\(\) \{ save\(\{ closed: props\.version \|\| '-' \}\); emit\('close'\) \}/, 'the X stores that this version was closed, which stops the guide from opening on its own again')
  assert.match(flow, /props\.mode === 'upgrade' \? 0 : props\.skipDelay/)
})

test('every first-run step has the same window: no rule sets the window width by step (the remote access and pairing steps were wider on a desktop and not full screen on a phone)', () => {
  const css = readFileSync(new URL('../src/css/onboard.css', import.meta.url), 'utf8')
  assert.ok(!/data-step[^{]*\{[^}]*--m-onboard-w/.test(css), 'no selector on data-step sets --m-onboard-w')
  assert.match(css, /@media \(max-width: 599\.98px\) \{ \.m-onboard \{ --m-onboard-w: 100vw;/)
  assert.match(css, /\.m-onboard \{[^}]*--m-onboard-w: min\(92vw, 880px\)/)
})
