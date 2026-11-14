import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { endpointsOfConfig, firewallCommand, meshAddress, normalizeReport, parseEndpoints, parseReason, publicAddress, reachSummary, reachView, serializeEndpoints, validateEndpoint } from '../src/settings/reachability.js'
import { reachTexts } from '../src/settings/reachTexts.js'

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'))

test('a report that is not v1 is no report: the screens say the check is not available', () => {
  for (const bad of [null, undefined, {}, [], { version: 2, public: {} }, { version: 1 }, 'x']) assert.equal(normalizeReport(bad), null)
  assert.equal(reachView(null, 'en'), null)
})

test('the verdicts are the host\'s: verified is shown only where the host says verified', () => {
  const verified = reachView(normalizeReport(fixture('reachability-public-verified')), 'zh')
  assert.deepEqual(verified.paths.map((p) => [p.id, p.verdict, p.word, p.tone]), [['public', 'verified', '已验证', 'ok'], ['mesh', 'likely', '很可能可连', 'info']])
  const likely = fixture('reachability-public-verified'); likely.public.verdict = 'likely'; likely.public.evidence = []; likely.public.hairpin = { tried: false, ok: false }
  const v = reachView(normalizeReport(likely), 'en')
  assert.equal(v.paths[0].word, 'Likely')
  assert.ok(!/verified|works/i.test(v.paths[0].headline.replace('It is not verified.', '')), 'a likely path never claims it works')
  assert.equal(v.paths[0].evidence.length, 0, 'no evidence is made up')
  const odd = normalizeReport({ version: 1, public: { verdict: 'great' }, mesh: { verdict: 'none' } })
  assert.equal(odd.public.verdict, 'unknown', 'an unknown verdict word is not "verified"')
})

test('evidence reads as a sentence with the time, and the address a client should enter is the public WAN address or the mesh address', () => {
  const report = normalizeReport(fixture('reachability-public-verified'))
  const v = reachView(report, 'zh')
  assert.match(v.paths[0].evidence[0], /^最近一次从公网连接成功 · 2026-11-03 \d\d:\d\d · 198\.51\.100\.0\/24$/)
  assert.ok(v.paths[0].evidence.some((e) => e.includes('回环测试通过')), 'the own-certificate test is listed as evidence only when it matched')
  assert.equal(publicAddress(report), 'home.example.net', 'the address the person set is the one to enter when it checks out')
  const mismatch = fixture('reachability-public-verified'); mismatch.public.configured_address = { value: 'home.example.net', kind: 'hostname', resolved: ['198.51.100.7'], matches_wan: false, reasons: ['address_mismatch'] }
  assert.equal(publicAddress(normalizeReport(mismatch)), '203.0.113.45', 'a mismatch falls back to the router\'s outside address')
  const unset = fixture('reachability-public-verified'); unset.public.configured_address = { value: '', kind: 'empty', resolved: [], matches_wan: null, reasons: ['unset'] }
  assert.equal(publicAddress(normalizeReport(unset)), '203.0.113.45')
  const older = fixture('reachability-public-verified'); delete older.public.configured_address
  assert.equal(publicAddress(normalizeReport(older)), '203.0.113.45', 'a host without the field still works')
  assert.equal(meshAddress(report), '100.92.14.7')
  assert.equal(publicAddress(normalizeReport(fixture('reachability-cgnat'))), '', 'a CGNAT address is not an address to enter')
})

test('each reason is a sentence with its fix action; an unknown code has none and shows its code', () => {
  assert.deepEqual(parseReason('mapping_missing:udp/47998'), { code: 'mapping_missing', arg: 'udp/47998', proto: 'udp', port: 47998 })
  const v = reachView(normalizeReport(fixture('reachability-cgnat')), 'zh')
  const by = Object.fromEntries(v.paths[0].reasons.map((r) => [r.code, r]))
  assert.equal(by.cgnat.action, 'mesh'); assert.equal(by.cgnat.actionLabel, '改用组网')
  assert.equal(by['mapping_missing:udp/47998'].action, 'upnp'); assert.match(by['mapping_missing:udp/47998'].text, /UDP 47998/); assert.equal(by['mapping_missing:udp/47998'].actionLabel, '开启 UPnP')
  assert.equal(by['firewall_blocked:tcp/47989'].actionLabel, '添加防火墙规则')
  assert.equal(by.hairpin_unsupported.action, 'outside')
  assert.equal(by['future_code:x'].action, ''); assert.match(by['future_code:x'].text, /future_code:x/)
  assert.equal(v.paths[1].reasons[0].actionLabel, '调整 Web UI 访问来源')
})

test('the mesh origin warning shows even when the host sent no code for it', () => {
  const r = fixture('reachability-cgnat'); r.mesh.reasons = []
  const v = reachView(normalizeReport(r), 'en')
  assert.equal(v.paths[1].reasons[0].action, 'origin')
})

test('the firewall command opens exactly the ports the report says are blocked', () => {
  const report = normalizeReport(fixture('reachability-cgnat'))
  assert.equal(firewallCommand(report, 'windows'), 'netsh advfirewall firewall add rule name="Foundation Sunshine TCP" dir=in action=allow protocol=TCP localport=47989\nnetsh advfirewall firewall add rule name="Foundation Sunshine UDP" dir=in action=allow protocol=UDP localport=47998')
  assert.equal(firewallCommand(report, 'linux'), 'sudo ufw allow 47989/tcp\nsudo ufw allow 47998/udp')
  assert.equal(firewallCommand(normalizeReport(fixture('reachability-public-verified')), 'windows'), '')
})

test('one summary line and both languages carry the same keys', () => {
  assert.equal(reachSummary(normalizeReport(fixture('reachability-public-verified')), 'zh'), '公网 已验证 · 组网 很可能可连')
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(reachTexts('zh')), keys(reachTexts('en')))
})

test('the address reasons are plain sentences with their fix; good news and notes are not warnings', () => {
  const r = fixture('reachability-public-verified')
  r.public.configured_address = { value: 'x.example', kind: 'hostname', resolved: [], matches_wan: null, reasons: ['dns_failed'] }
  r.public.reasons = ['mappings_complete', 'hairpin_not_tried', 'address_private']
  const rows = Object.fromEntries(reachView(normalizeReport(r), 'zh').paths[0].reasons.map((x) => [x.code, x]))
  assert.equal(rows.mappings_complete.kind, 'good'); assert.equal(rows.hairpin_not_tried.kind, 'note')
  assert.equal(rows.dns_failed.kind, 'problem'); assert.equal(rows.dns_failed.action, 'address'); assert.match(rows.dns_failed.text, /DDNS/)
  assert.equal(rows.address_private.actionLabel, '设置公网地址')
  const un = fixture('reachability-cgnat')
  const unset = reachView(normalizeReport(un), 'zh').paths[0].reasons.find((x) => x.code === 'unset')
  assert.equal(unset.text, '没有设置公网地址：客户端使用主机自己发现的地址。'); assert.equal(unset.kind, 'note')
  const mm = fixture('reachability-public-verified'); mm.public.configured_address = { value: '9.9.9.9', kind: 'ip', resolved: [], matches_wan: false, reasons: ['address_mismatch'] }
  assert.equal(reachView(normalizeReport(mm), 'zh').paths[0].reasons.find((x) => x.code === 'address_mismatch').actionLabel, '改用路由器的外网地址')
})

test('an endpoint is checked as it is typed, the way a host is added in Moonlight', () => {
  const v = validateEndpoint
  assert.deepEqual(v('home.example.net'), { ok: true, host: 'home.example.net', port: 0, kind: 'hostname', error: '', warn: '', text: 'home.example.net' })
  assert.equal(v(' Home.Example.NET:60000 ').text, 'home.example.net:60000')
  assert.deepEqual(v('203.0.113.45:57989'), { ok: true, host: '203.0.113.45', port: 57989, kind: 'ip', error: '', warn: '', text: '203.0.113.45:57989' })
  assert.equal(v('[2001:DB8::1]:57989').text, '[2001:db8::1]:57989')
  assert.equal(v('2001:db8::1').text, '[2001:db8::1]', 'a bare IPv6 address gets its brackets')
  assert.equal(v('[2001:db8::1]').port, 0)
  assert.equal(v('nas').kind, 'hostname')
  assert.equal(v('192.168.1.5').warn, 'private'); assert.equal(v('192.168.1.5').ok, true, 'a private address is a warning, the host reports it')
  assert.equal(v('fd00::1').warn, 'private')
  assert.equal(v('100.72.3.9').warn, '', 'a mesh address is a legitimate endpoint')
  assert.equal(v('fd7a:115c:a1e0::2').warn, '')
  const error = (text) => v(text).error
  assert.equal(error(''), 'empty'); assert.equal(error('https://home.example.net'), 'scheme')
  for (const bad of ['home.example.net/path', 'a@b.example', 'two words']) assert.equal(error(bad), 'format', bad)
  for (const bad of ['home.example.net:', 'home.example.net:abc', 'home.example.net:0', 'home.example.net:5', 'home.example.net:65536', '203.0.113.9:99999', '[2001:db8::1]:']) assert.equal(error(bad), 'port', bad)
  for (const bad of ['999.1.1.1', '123.456.789.12:57989', '-bad.example', 'bad_name.example', '[example.com]:57989', '[203.0.113.9]:57989', '2001:db8::zz', 'a.b:1:2']) assert.equal(error(bad), 'host', bad)
  assert.equal(error('[2001:db8::1'), 'format'); assert.equal(error('[2001:db8::1]57989'), 'format')
})

test('the list in the configuration: separators, one bracketed list, duplicates, at most eight, and the legacy single value', () => {
  assert.deepEqual(parseEndpoints('home.example.net:57989, [2001:db8::1]:57989;203.0.113.9\n100.101.102.103 '), ['home.example.net:57989', '[2001:db8::1]:57989', '203.0.113.9', '100.101.102.103'])
  assert.deepEqual(parseEndpoints('[a.example.net, [2001:db8::1]:57989]'), ['a.example.net', '[2001:db8::1]:57989'])
  assert.deepEqual(parseEndpoints('[2001:db8::1]'), ['[2001:db8::1]'], 'one IPv6 address in brackets is an endpoint, not a list')
  assert.deepEqual(parseEndpoints('a.example.net, A.EXAMPLE.NET, bad:port, a.example.net:57989'), ['a.example.net', 'a.example.net:57989'])
  assert.equal(parseEndpoints(Array.from({ length: 12 }, (_, i) => `h${i}.example.net`).join(',')).length, 8)
  assert.deepEqual(parseEndpoints(''), [])
  assert.deepEqual(endpointsOfConfig({ external_endpoints: '', external_ip: 'home.example.net' }), ['home.example.net'], 'the old single key is read when the list is empty')
  assert.deepEqual(endpointsOfConfig({ external_endpoints: 'a.example.net:60000', external_ip: 'home.example.net' }), ['a.example.net:60000'], 'the list wins')
  assert.deepEqual(endpointsOfConfig({}), [])
  assert.equal(serializeEndpoints(['a.example.net:60000', '', ' [2001:DB8::1]:57989 ', 'a.example.net:60000']), 'a.example.net:60000, [2001:db8::1]:57989')
  assert.equal(serializeEndpoints([]), '')
})

test('every endpoint is a row: its state, the HTTPS port that was tested, the time; a failure says why', () => {
  const report = normalizeReport(fixture('reachability-endpoints'))
  const rows = reachView(report, 'en').paths[0].endpoints
  assert.deepEqual(rows.map((r) => [r.input, r.word, r.portText, r.latencyText, r.scope]), [
    ['home.example.net:60000', 'Reached', 'HTTPS 59995', '14 ms', 'public'],
    ['203.0.113.45', 'No answer', 'HTTPS 57984', '2501 ms', 'public'],
    ['[2001:db8::1]:57989', 'Port refused', 'HTTPS 57984', '4 ms', 'public'],
    ['100.92.14.7', 'Reached', 'HTTPS 57984', '2 ms', 'mesh'],
    ['gone.example.net', 'Does not resolve', '', '', 'unknown'],
  ])
  assert.deepEqual(rows.map((r) => r.tone), ['ok', 'error', 'error', 'ok', 'neutral'])
  const zh = reachView(report, 'zh').paths[0].endpoints
  assert.equal(zh[0].word, '已连通'); assert.equal(zh[4].word, '域名无法解析'); assert.equal(zh[3].scopeWord, '组网')
  assert.equal(normalizeReport(fixture('reachability-cgnat')).public.endpoints.length, 0, 'a host that sends none has none')
  assert.equal(normalizeReport({ ...fixture('reachability-endpoints'), public: { ...fixture('reachability-endpoints').public, endpoints: [{ input: 'x.example.net', state: 'reached', error: 'brand_new_error' }, 'junk', null] } }).public.endpoints[0].error, 'failed', 'an error word the UI does not know reads as a plain failure')
})

test('the address to give a client is an endpoint with its port, never a stream port', () => {
  const report = normalizeReport(fixture('reachability-endpoints'))
  assert.equal(publicAddress(report), 'home.example.net:60000', 'the first public endpoint the host reached')
  const none = fixture('reachability-endpoints'); none.public.endpoints[0].state = 'failed'; none.public.endpoints[0].error = 'timeout'
  assert.equal(publicAddress(normalizeReport(none)), 'home.example.net:60000', 'with none reached, the first public endpoint without a known fault')
  const faulty = fixture('reachability-endpoints'); for (const e of faulty.public.endpoints) { e.state = 'failed'; e.error = e.scope === 'public' ? 'identity_mismatch' : 'dns_failed' }
  assert.equal(publicAddress(normalizeReport(faulty)), '203.0.113.45', 'endpoints that are known wrong fall back to the router address')
  const idle = reachView(normalizeReport(fixture('reachability-video-port')), 'en')
  assert.equal(idle.paths[0].address, 'home.example.net', 'a host without endpoints still gives the configured address')
  for (const status of [fixture('reachability-endpoints'), fixture('reachability-video-port')]) {
    for (const path of reachView(normalizeReport(status), 'en').paths) assert.ok(!/57998/.test(path.address), 'the video port is never the address')
  }
})

test('a reason names the port by its role; the ports table lists the internal ports by role with the video port as a stream port', () => {
  const view = reachView(normalizeReport(fixture('reachability-video-port')), 'en')
  assert.equal(view.paths[0].reasons[0].text, 'The router has no port mapping for Video UDP 57998.')
  assert.equal(reachView(normalizeReport(fixture('reachability-video-port')), 'zh').paths[0].reasons[0].text, '路由器上缺少 视频 UDP 57998 的端口映射。')
  assert.deepEqual(view.portRows.map((r) => [r.name, r.proto, r.port, r.state]), [
    ['HTTP', 'TCP', 57989, 'listening'], ['HTTPS', 'TCP', 57984, 'listening'], ['Web UI', 'TCP', 57990, 'listening'], ['RTSP', 'TCP', 58010, 'listening'],
    ['Video', 'UDP', 57998, 'on-session'], ['Control', 'UDP', 57999, 'on-session'], ['Audio', 'UDP', 58000, 'on-session'], ['Microphone', 'UDP', 58001, 'on-session'],
  ])
  assert.equal(view.portRows[0].note, 'Client address'); assert.equal(view.portRows[1].note, 'Pairing')
  assert.equal(view.portRows.filter((r) => r.note === 'Client address').length, 1, 'only the HTTP port is the client address')
})

test('a fault the person can fix in the endpoints is reported by the home tile', async () => {
  const { reachProblemOf } = await import('../src/vue/homeSystemTiles.js')
  assert.equal(reachProblemOf(normalizeReport(fixture('reachability-endpoints'))), true, 'one name does not resolve')
  const fine = fixture('reachability-endpoints'); fine.public.endpoints = fine.public.endpoints.slice(0, 1)
  assert.equal(reachProblemOf(normalizeReport(fine)), false)
  const lan = fixture('reachability-endpoints'); lan.public.endpoints = [{ ...lan.public.endpoints[0], scope: 'lan' }]
  assert.equal(reachProblemOf(normalizeReport(lan)), true, 'only private addresses cannot serve the internet')
})
