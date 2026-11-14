import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GUIDE_CLIENTS, GUIDE_DEVICES, GUIDE_STEP_IDS, buildGuideSteps, canPair, clearProgress, clientFor, findNewClient, isLast, isLoopbackHost, isSetupCompleted,
  lanRank, nextIndex, normalizeClients, normalizeSessions, pickLanAddresses, pickSession, prevIndex, qrPath, readProgress, scallopPoints, sessionLine,
  SKIP_DELAY_S, skipSecondsLeft, shouldAutoOpen, startIndex, remotePorts, portText, upnpState, validateAccount, writeProgress, setupStateFromConfig, mergeSetupConfig,
} from '../src/vue/guideModel.js'
import { fillText, guideTexts } from '../src/vue/guideTexts.js'

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m } }

test('the flow has the fourteen steps in order: the host first (intro and language, account, look, graphics and display, web access, remote access, the update method), the host-done page with the client downloads, then the client (install, address, pairing, the first stream, the games)', () => {
  const steps = buildGuideSteps()
  assert.deepEqual(steps.map((s) => s.id), ['intro', 'account', 'appearance', 'motion', 'setup', 'webaccess', 'remote', 'update', 'hostdone', 'install', 'address', 'pair', 'connect', 'apps'])
  assert.ok(!GUIDE_STEP_IDS.includes('consent'), 'nothing about what is sent is asked in the guide')
  assert.ok(steps.every((s) => s.skippable && s.icon))
  assert.deepEqual(GUIDE_STEP_IDS.filter((id) => id !== 'whatsnew'), steps.map((s) => s.id))
})

test('a host that already has credentials drops the account step', () => {
  const steps = buildGuideSteps({ skip: ['account'] })
  assert.equal(steps.length, 13)
  assert.equal(steps[0].id, 'intro')
  assert.equal(steps[1].id, 'appearance')
  assert.equal(steps[2].id, 'motion')
  assert.equal(steps[3].id, 'setup')
})

test('the host part comes before the client part, and the host-done page sits between them', () => {
  const ids = buildGuideSteps().map((s) => s.id)
  const at = (id) => ids.indexOf(id)
  for (const host of ['intro', 'appearance', 'setup', 'webaccess', 'remote', 'update']) assert.ok(at(host) < at('hostdone'), host)
  for (const client of ['install', 'address', 'pair', 'connect']) assert.ok(at(client) > at('hostdone'), client)
  assert.ok(at('intro') < at('appearance') && at('appearance') < at('setup'), 'language and look come before the graphics setup')
  assert.ok(guideTexts('zh').titles.hostdone && guideTexts('en').titles.hostdone && guideTexts('zh').hostdone.download)
})

test('a product without an update source skips the update step and ends on the games', () => {
  const steps = buildGuideSteps({ skip: ['account', 'update'] })
  assert.equal(steps.at(-1).id, 'apps')
  assert.equal(steps.length, 12)
})

test('step indexes stay inside the flow', () => {
  const steps = buildGuideSteps()
  assert.equal(nextIndex(steps, 13), 13)
  assert.equal(nextIndex(steps, 2), 3)
  assert.equal(prevIndex(0), 0)
  assert.equal(prevIndex(3), 2)
  assert.ok(isLast(steps, 13))
  assert.ok(!isLast(steps, 12))
})

test('progress survives a restart', () => {
  const storage = memory()
  assert.deepEqual(readProgress(storage, 'k'), { step: null, finished: false, device: null, visited: [], done: [], closed: '', version: '', mode: '' })
  assert.ok(writeProgress(storage, 'k', { step: 'pair', finished: false, device: 'ios', visited: ['intro', 'account', 'pair'] }))
  const back = readProgress(storage, 'k')
  assert.equal(back.step, 'pair')
  assert.equal(back.device, 'ios')
  assert.deepEqual(back.visited, ['intro', 'account', 'pair'])
  assert.equal(startIndex(buildGuideSteps(), back), 11)
  assert.equal(startIndex(buildGuideSteps({ skip: ['account'] }), back), 10)
})

test('progress is kept per key, so each product has its own', () => {
  const storage = memory()
  writeProgress(storage, 'web', { step: 'pair' })
  writeProgress(storage, 'panel', { step: 'install' })
  assert.equal(readProgress(storage, 'web').step, 'pair')
  assert.equal(readProgress(storage, 'panel').step, 'install')
  clearProgress(storage, 'web')
  assert.equal(readProgress(storage, 'web').step, null)
})

test('a finished guide starts at the top again when reopened', () => {
  const storage = memory()
  writeProgress(storage, 'k', { step: 'apps', finished: true, visited: ['apps'] })
  const progress = readProgress(storage, 'k')
  assert.equal(progress.finished, true)
  assert.equal(startIndex(buildGuideSteps(), progress), 0)
})

test('malformed saved progress gives the empty progress', () => {
  for (const raw of ['not json', '{"v":2,"step":"pair"}', '[]', 'null', '{"v":1,"step":"nonsense","visited":"x","device":5}']) {
    const storage = memory()
    storage.setItem('k', raw)
    const got = readProgress(storage, 'k')
    assert.equal(got.step, null)
    assert.equal(got.finished, false)
    assert.deepEqual(got.visited, [])
  }
  const refusing = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') }, removeItem() { throw new Error('denied') } }
  assert.equal(readProgress(refusing, 'k').step, null)
  assert.equal(writeProgress(refusing, 'k', { step: 'pair' }), false)
  assert.equal(startIndex(buildGuideSteps(), { step: 'gone', finished: false }), 0)
})

test('the guide opens on its own only on a first run', () => {
  assert.equal(shouldAutoOpen({ setupCompleted: false, pairedCount: 0 }), true)
  assert.equal(shouldAutoOpen({ setupCompleted: true, pairedCount: 0 }), false)
  assert.equal(shouldAutoOpen({ setupCompleted: false, pairedCount: 1 }), false)
  assert.equal(shouldAutoOpen({ setupCompleted: false, pairedCount: 0, finished: true }), false)
})

test('an unknown answer never opens the guide', () => {
  assert.equal(shouldAutoOpen({}), false)
  assert.equal(shouldAutoOpen({ setupCompleted: undefined, pairedCount: 0 }), false)
  assert.equal(shouldAutoOpen({ setupCompleted: false, pairedCount: null }), false)
  assert.equal(shouldAutoOpen({ setupCompleted: false, pairedCount: undefined }), false)
  assert.equal(shouldAutoOpen(), false)
})

test('setup completed follows the host flag', () => {
  assert.equal(isSetupCompleted({ setup_wizard_completed: true }), true)
  assert.equal(isSetupCompleted({ setup_wizard_completed: 'true' }), true)
  assert.equal(isSetupCompleted({ setup_wizard_completed: 'false' }), false)
  assert.equal(isSetupCompleted({}), false)
  assert.equal(isSetupCompleted(null), false)
})

test('the account needs a name and the same password twice', () => {
  assert.equal(validateAccount({ username: 'sunshine', password: 'a', confirm: 'a' }), '')
  assert.equal(validateAccount({ username: '', password: 'a', confirm: 'a' }), 'accountMissing')
  assert.equal(validateAccount({ username: 'x', password: '', confirm: '' }), 'accountMissing')
  assert.equal(validateAccount({ username: 'x', password: 'a', confirm: 'b' }), 'accountMismatch')
  assert.equal(validateAccount(), 'accountMissing')
})

test('every device has a recommended client, with the store of its region', () => {
  assert.deepEqual(GUIDE_DEVICES.map((d) => d.id), ['windows', 'macos', 'linux', 'android', 'ios', 'harmony', 'tv'])
  for (const device of GUIDE_DEVICES) assert.ok(clientFor(device.id), device.id)
  assert.equal(clientFor('android').name, 'Moonlight V+')
  assert.equal(clientFor('tv').name, 'Moonlight V+')
  assert.equal(clientFor('macos').name, 'Moonlight macOS Enhanced')
  assert.match(clientFor('ios', 'zh').url, /apps\.apple\.com\/cn\//)
  assert.match(clientFor('ios', 'en').url, /apps\.apple\.com\/us\//)
  assert.equal(clientFor('nope'), null)
  for (const client of Object.values(GUIDE_CLIENTS)) assert.match(client.url, /^https:\/\//)
})

test('the local network note belongs to iOS, macOS, Android and TV', () => {
  const noted = GUIDE_DEVICES.filter((d) => d.lanNote).map((d) => d.id)
  assert.deepEqual(noted, ['macos', 'android', 'ios', 'tv'])
})

test('LAN addresses: private first, loopback and link-local never, IPv6 left out', () => {
  assert.equal(lanRank('192.168.1.20'), 0)
  assert.equal(lanRank('10.0.0.5'), 0)
  assert.equal(lanRank('172.16.0.1'), 0)
  assert.equal(lanRank('172.32.0.1'), 2)
  assert.equal(lanRank('100.100.1.1'), 1)
  assert.equal(lanRank('8.8.8.8'), 2)
  for (const bad of ['127.0.0.1', '0.0.0.0', '169.254.3.4', '::1', 'fe80::1', '256.1.1.1', '1.2.3', 'localhost', '', null, undefined]) assert.equal(lanRank(bad), null, String(bad))
  const picked = pickLanAddresses([
    { name: 'lo', address: '127.0.0.1' }, { name: 'tun', address: '100.64.0.9' }, { name: 'eth0', address: '192.168.1.20' },
    { name: 'v6', address: 'fe80::1' }, { name: 'dup', address: '192.168.1.20' }, { name: 'wifi', address: '10.1.2.3' }, { address: '169.254.1.1' },
  ])
  assert.deepEqual(picked.map((a) => a.address), ['192.168.1.20', '10.1.2.3', '100.64.0.9'])
  assert.equal(picked[0].name, 'eth0')
})

test('no address list is an empty list, not an error', () => {
  assert.deepEqual(pickLanAddresses(null), [])
  assert.deepEqual(pickLanAddresses('x'), [])
  assert.deepEqual(pickLanAddresses([]), [])
})

test('loopback and localhost are recognised as wrong answers', () => {
  for (const bad of ['localhost', 'LOCALHOST:47990', '127.0.0.1', ' 127.1.2.3', '0.0.0.0', '::1']) assert.ok(isLoopbackHost(bad), bad)
  for (const ok of ['192.168.1.5', 'pc.lan']) assert.ok(!isLoopbackHost(ok), ok)
})

test('pairing needs a four digit PIN and a name', () => {
  assert.ok(canPair('1234', 'Pixel'))
  assert.ok(!canPair('123', 'Pixel'))
  assert.ok(!canPair('12345', 'Pixel'))
  assert.ok(!canPair('12a4', 'Pixel'))
  assert.ok(!canPair('1234', '   '))
  assert.ok(!canPair('1234', undefined))
})

test('a new client is found by comparing with the list taken at the start', () => {
  const before = normalizeClients({ status: true, named_certs: [{ name: 'Old', uuid: 'a' }] })
  const after = normalizeClients({ status: true, named_certs: [{ name: 'Old', uuid: 'a' }, { name: 'Pixel 9', uuid: 'b', enabled: true }] })
  assert.equal(findNewClient(before, before), null)
  assert.equal(findNewClient(before, after).name, 'Pixel 9')
  assert.equal(findNewClient([], after).name, 'Old')
})

test('no new client without both lists', () => {
  const list = [{ name: 'A', uuid: 'a' }]
  assert.equal(findNewClient(null, list), null)
  assert.equal(findNewClient(list, null), null)
  assert.equal(findNewClient(undefined, undefined), null)
  assert.equal(findNewClient([], [{ name: 'no uuid' }]), null)
})

test('malformed client list answers are not a list', () => {
  for (const bad of [null, undefined, 'x', 5, [], {}, { named_certs: 'x' }, { named_certs: null }, { status: false, named_certs: [] }, { status: 'false', named_certs: [] }, { status: '0', named_certs: [] }]) assert.equal(normalizeClients(bad), null, JSON.stringify(bad))
  assert.deepEqual(normalizeClients({ named_certs: [] }), [])
  assert.deepEqual(normalizeClients({ status: 'true', named_certs: [null, 'x', { name: 'N', uuid: 'u', enabled: false, streaming: true }] }), [{ name: 'N', uuid: 'u', enabled: false, streaming: true }])
})

test('sessions: malformed answers are unavailable, the desktop session is preferred', () => {
  for (const bad of [null, undefined, 'x', {}, { sessions: 'x' }, { success: false }]) assert.equal(normalizeSessions(bad), null)
  assert.deepEqual(normalizeSessions({ sessions: [] }), [])
  const list = normalizeSessions({ sessions: [{ client_name: 'Pixel 9', app_name: 'Elden Ring', width: 2560, height: 1440, fps: 120 }, { client_name: 'iPad', app_name: 'Desktop', width: 1920, height: 1080, fps: 60 }, null] })
  assert.equal(list.length, 2)
  assert.equal(pickSession(list).client_name, 'iPad')
  assert.equal(pickSession([list[0]]).client_name, 'Pixel 9')
  assert.equal(pickSession([]), null)
  assert.equal(pickSession(null), null)
  assert.equal(sessionLine(list[0]), 'Pixel 9 · 2560×1440 @ 120')
  assert.equal(sessionLine({ client_name: 'X', width: 0, height: 0, fps: 0 }), 'X')
  assert.equal(sessionLine(null), '')
})

test('the QR path draws exactly the dark modules, merged into runs', () => {
  const rows = [[1, 1, 0], [0, 1, 0], [1, 0, 1]]
  const { size, d } = qrPath(rows, 1)
  assert.equal(size, 5)
  assert.equal(d, 'M1 1h2v1h-2zM2 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1z')
  const viaObject = qrPath({ size: 3, get: (r, c) => rows[r][c] === 1 }, 1)
  assert.deepEqual(viaObject, { size, d })
})

test('the QR path of nothing is empty', () => {
  for (const bad of [null, undefined, [], {}, { size: 0, get: () => true }, 'x']) assert.deepEqual(qrPath(bad), { size: 0, d: '' })
  assert.equal(qrPath([[0, 0], [0, 0]]).d, '')
})

test('the mascot outline has the requested number of samples inside the box', () => {
  const points = scallopPoints(9, 4, 40, 90).split(' ').map((p) => p.split(',').map(Number))
  assert.equal(points.length, 90)
  assert.ok(points.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100))
})

test('texts: Chinese for zh, English for everything else, overrides on top', () => {
  assert.equal(guideTexts('zh_TW').titles.pair, '首次配對')
  assert.equal(guideTexts('zh').next, '下一步')
  assert.equal(guideTexts('en').titles.pair, 'Pair a device'); assert.equal(guideTexts(undefined).titles.pair, 'Pair a device'); assert.notEqual(guideTexts('de').titles.pair, guideTexts('en').titles.pair); assert.notEqual(guideTexts('ja').titles.pair, guideTexts('en').titles.pair)
  assert.equal(guideTexts('de', { account: { create: 'Anlegen' } }).account.create, 'Anlegen')
  assert.equal(guideTexts('de', { account: { create: '' } }).account.create, 'Konto speichern')
  assert.equal(guideTexts('de', { account: { create: 'Anlegen' } }).account.username, 'Benutzername')
  assert.equal(fillText('{name} ok', { name: 'Pixel' }), 'Pixel ok')
  assert.equal(fillText('{x}', {}), '{x}')
})

test('both languages carry the same keys', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(guideTexts('zh')), keys(guideTexts('en')))
  // a step has a title; it has a second line only when that line says something the title does not (most steps have none)
  for (const step of GUIDE_STEP_IDS) { assert.ok(guideTexts('zh').titles[step]); assert.equal(typeof guideTexts('en').leads[step], 'string'); assert.equal(guideTexts('zh').leads[step] === '', guideTexts('en').leads[step] === '', step) }
  for (const device of GUIDE_DEVICES) assert.ok(typeof guideTexts('zh').install.notes[device.id] === 'string' && guideTexts('en').install.devices[device.id])
})

test('the account step says it is the WebUI panel account', () => {
  assert.equal(guideTexts('zh').titles.account, '设置 WebUI 面板账号')
  assert.equal(guideTexts('zh').leads.account, '用于在浏览器中登录 WebUI 面板')
  assert.match(guideTexts('en').titles.account, /WebUI panel account/)
  assert.match(guideTexts('en').leads.account, /WebUI panel/)
})

test('the second lines of the first run carry information: none restates its title', () => {
  const banned = ['选择界面语言', '到哪里查找和下载新版本', '在要看画面的那台设备上安装客户端', '用哪块显卡编码画面']
  const all = JSON.stringify(guideTexts('zh'))
  for (const phrase of banned) assert.ok(!all.includes(phrase), phrase)
})

test('跳过 is held back for the first seconds of the flow, 下一步 is not', () => {
  assert.equal(SKIP_DELAY_S, 10)
  assert.equal(skipSecondsLeft(0, 0), 10)
  assert.equal(skipSecondsLeft(0, 1), 10)
  assert.equal(skipSecondsLeft(0, 1000), 9)
  assert.equal(skipSecondsLeft(0, 9001), 1)
  assert.equal(skipSecondsLeft(0, 10000), 0)
  assert.equal(skipSecondsLeft(0, 60000), 0)
  assert.equal(skipSecondsLeft(0, 0, 0), 0) // a product can turn it off
})

test('the setup state is read from the host config, with safe defaults', () => {
  const s = setupStateFromConfig({ platform: 'windows', locale: 'en', setup_wizard_completed: 'false', adapters: [{ name: 'A' }], display_devices: [{ device_id: 'D' }], adapter_name: 'A', output_name: 'D', display_device_prep: 'ensure_primary' })
  assert.deepEqual(s, { completed: false, locale: 'en', showLanguage: true, adapters: [{ name: 'A' }], displayDevices: [{ device_id: 'D' }], adapter: 'A', display: 'D', prep: 'ensure_primary', hdr: false, virtual: true })
  const bare = setupStateFromConfig(null)
  assert.equal(bare.completed, false)
  assert.equal(bare.prep, 'ensure_only_display')
  assert.deepEqual(bare.adapters, [])
  assert.equal(setupStateFromConfig({ platform: 'linux', locale: 'de' }).virtual, false)
  assert.equal(setupStateFromConfig({ locale: 'de' }).showLanguage, false)
  assert.equal(setupStateFromConfig({ locale: 'de' }, { showLanguage: true }).showLanguage, true)
  assert.equal(setupStateFromConfig({ adapters: 'x', display_devices: 5 }).adapters.length, 0)
})

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]))
test('merging the setup choices keeps the rest of the configuration', () => {
  const current = { locale: 'de', port: 47989, output_name: 'ZakoHDR', adapter_name: 'Old', setup_wizard_completed: false }
  assert.deepEqual(mergeSetupConfig(current, {}), { ...current, setup_wizard_completed: true })
  assert.deepEqual(mergeSetupConfig(current, { adapter: '', display: 'D1', prep: 'no_operation', locale: 'zh' }), { locale: 'zh', port: 47989, output_name: 'D1', adapter_name: '', setup_wizard_completed: true, display_device_prep: 'no_operation' })
  assert.equal(mergeSetupConfig(current, { completed: false }).setup_wizard_completed, false)
  // allow HDR: the codec modes carry it, the video format stays as it is; H.264 only cannot carry it
  assert.deepEqual(pick(mergeSetupConfig({ ...current, hevc_mode: 0, av1_mode: 0 }, { hdr: true }), ['hevc_mode', 'av1_mode']), { hevc_mode: 3, av1_mode: 3 })
  assert.deepEqual(pick(mergeSetupConfig({ ...current, hevc_mode: 3, av1_mode: 1 }, { hdr: false }), ['hevc_mode', 'av1_mode']), { hevc_mode: 2, av1_mode: 1 })
  assert.deepEqual(pick(mergeSetupConfig({ ...current, hevc_mode: 1, av1_mode: 1 }, { hdr: true }), ['hevc_mode', 'av1_mode']), { hevc_mode: 1, av1_mode: 1 })
  assert.equal(setupStateFromConfig({ hevc_mode: 3, av1_mode: 1 }).hdr, true)
  assert.equal(current.locale, 'de')
  assert.deepEqual(mergeSetupConfig(null), { setup_wizard_completed: true })
})

test('the remote ports follow the base port, the management page is the one a stream does not need', () => {
  const p = remotePorts(47989)
  assert.deepEqual(p.tcp.map((e) => e.port), [47984, 47989, 47990, 48010])
  // the host maps video, control, audio and the microphone to base + 9 .. base + 12 (src/stream.h; docs/api/network-reachability.example.json lists the microphone at 48001)
  assert.deepEqual(p.udp.map(portText), ['47998-48001'])
  assert.equal(p.tcp.find((e) => e.port === 47990).needed, false)
  assert.deepEqual(remotePorts(50000).tcp.map((e) => e.port), [49995, 50000, 50001, 50021])
  assert.equal(remotePorts('nope').base, 47989)
})

test('UPnP: what runs, what is saved and whether a restart applies it', () => {
  assert.deepEqual(upnpState(null), { known: false, on: false, pending: false })
  assert.deepEqual(upnpState({ upnpActive: false, upnpSaved: true }), { known: true, on: true, active: false, pending: true })
  assert.equal(upnpState({ upnpActive: true, upnpSaved: true }).pending, false)
})

