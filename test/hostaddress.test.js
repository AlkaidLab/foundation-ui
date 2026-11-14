import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BASE_PORT_MAX, BASE_PORT_MIN, derivedPorts, formatHostAddress, parseHostPort, portRunText, validateBasePort, webPort } from '../src/vue/hostAddress.js'
import { addressPlan } from '../src/vue/guideEntry.js'
import { createPairQr } from '../src/vue/usePairQr.js'
import { guideTexts } from '../src/vue/guideTexts.js'
import { validateEndpoint } from '../src/settings/reachability.js'

const read = (f) => readFileSync(new URL(`../src/vue/${f}`, import.meta.url), 'utf8')

test('the address a client types: bare for the default port, with the port otherwise, IPv6 in brackets', () => {
  assert.equal(formatHostAddress('192.168.1.5', 47989), '192.168.1.5')
  assert.equal(formatHostAddress('192.168.1.5'), '192.168.1.5')
  assert.equal(formatHostAddress('192.168.1.5', 48989), '192.168.1.5:48989')
  assert.equal(formatHostAddress('fe80::1', 47989), 'fe80::1')
  assert.equal(formatHostAddress('fe80::1', 48989), '[fe80::1]:48989')
  assert.equal(formatHostAddress('[2001:db8::7]', 48989), '[2001:db8::7]:48989')
  assert.equal(formatHostAddress('example.com', 50000), 'example.com:50000')
  assert.equal(formatHostAddress('', 48989), '')
  // a port the text carries is kept, and a port that is not usable is left out
  assert.equal(formatHostAddress('203.0.113.9:50000', 48989), '203.0.113.9:50000')
  assert.equal(formatHostAddress('192.168.1.5', 0), '192.168.1.5')
  assert.equal(formatHostAddress('192.168.1.5', 'nope'), '192.168.1.5')
})

test('host:port typed by a person is read with the same rules as the host check of a public address', () => {
  assert.equal(parseHostPort, validateEndpoint)
  assert.deepEqual([parseHostPort('192.168.1.5:48989').ok, parseHostPort('192.168.1.5:48989').port, parseHostPort('192.168.1.5:48989').host], [true, 48989, '192.168.1.5'])
  const v6 = parseHostPort('[fe80::1]:48989')
  assert.deepEqual([v6.ok, v6.host, v6.port, v6.text], [true, 'fe80::1', 48989, '[fe80::1]:48989'])
  assert.equal(parseHostPort('fe80::1').port, 0)
  assert.equal(parseHostPort('host.example').port, 0)
  assert.equal(parseHostPort('192.168.1.5:99999').error, 'port')
  assert.equal(parseHostPort('192.168.1.5:abc').error, 'port')
  assert.equal(parseHostPort('http://192.168.1.5').error, 'scheme')
})

test('the ports of a base port follow the host mapping (net::map_port offsets)', () => {
  const rows = derivedPorts(47989)
  const by = Object.fromEntries(rows.map((r) => [r.role, r.port]))
  assert.deepEqual(by, { https: 47984, http: 47989, web: 47990, rtsp: 48010, video: 47998, control: 47999, audio: 48000, microphone: 48001 })
  assert.equal(rows.find((r) => r.role === 'web').needed, false)
  assert.deepEqual(rows.filter((r) => r.proto === 'tcp').map((r) => r.role), ['https', 'http', 'web', 'rtsp'])
  assert.equal(derivedPorts(48989).find((r) => r.role === 'video').port, 48998)
  assert.equal(derivedPorts('nope')[1].port, 47989, 'an unusable base gives the defaults')
  assert.equal(webPort(48989), 48990)
  assert.equal(portRunText(rows.filter((r) => r.proto === 'udp').map((r) => r.port)), '47998-48001')
})

test('a base port the host takes: digits, and every derived port inside 1024..65535', () => {
  assert.deepEqual(validateBasePort('48989'), { ok: true, port: 48989, error: '' })
  assert.equal(validateBasePort(' 47989 ').ok, true)
  assert.equal(validateBasePort('').error, 'format')
  assert.equal(validateBasePort('47989.5').error, 'format')
  assert.equal(validateBasePort('abc').error, 'format')
  assert.equal(validateBasePort(String(BASE_PORT_MIN - 1)).error, 'range')
  assert.equal(validateBasePort(String(BASE_PORT_MAX + 1)).error, 'range')
  assert.equal(validateBasePort(String(BASE_PORT_MIN)).ok, true)
  assert.equal(validateBasePort(String(BASE_PORT_MAX)).ok, true)
  assert.equal(BASE_PORT_MAX + 21, 65535)
  assert.equal(BASE_PORT_MIN - 5, 1024)
})

const host = [
  { name: '以太网 11', address: '192.168.7.133' },
  { name: 'ZeroTier One [154a350c867ec550]', address: '10.99.8.70' },
  { name: 'Tailscale', address: '100.101.1.2' },
  { name: 'vEthernet (WSL)', address: '172.28.0.1' },
  { name: '', address: '8.8.8.8' },
  { name: 'Loopback', address: '127.0.0.1' },
]

test('the address step recommends ONE address and names the others by their adapter', () => {
  const plan = addressPlan(host, 47989)
  assert.deepEqual([plan.main.address, plan.main.text, plan.main.kind], ['192.168.7.133', '192.168.7.133', 'lan'])
  assert.deepEqual(plan.others.map((a) => [a.address, a.kind]), [['10.99.8.70', 'zerotier'], ['172.28.0.1', 'lan'], ['100.101.1.2', 'tailscale']])
  assert.ok(!plan.others.some((a) => a.address === '8.8.8.8'), 'a public address belongs to the remote access step')
  assert.ok(![plan.main, ...plan.others].some((a) => a.address === '127.0.0.1'))
  assert.equal(plan.none, false)
})

test('a custom port is part of every address of the step', () => {
  const plan = addressPlan(host, 48989)
  assert.equal(plan.main.text, '192.168.7.133:48989')
  assert.ok(plan.others.every((a) => a.text === `${a.address}:48989`))
})

test('only a mesh adapter: it is the recommended address; nothing at all: none', () => {
  const only = addressPlan([{ name: 'Tailscale', address: '100.101.1.2' }], 47989)
  assert.equal(only.main.address, '100.101.1.2'); assert.equal(only.main.kind, 'tailscale'); assert.deepEqual(only.others, [])
  for (const none of [null, [], [{ name: 'lo', address: '127.0.0.1' }]]) { const p = addressPlan(none, 47989); assert.equal(p.main, null); assert.equal(p.none, true) }
})

test('the QR code carries host and port: the view says the address the person would type', async () => {
  const make = (answer) => createPairQr({ start: async () => answer, poll: async () => ({ status: 'waiting' }), cancel: async () => {}, render: async () => ({ size: 21, d: 'M0 0' }) })
  const custom = make({ url: 'moonlight://pair', pin: '1234', expires_in: 120, host: '192.168.1.5', port: 48989 })
  await custom.begin(); assert.equal(custom.view.state, 'ready'); assert.equal(custom.view.address, '192.168.1.5:48989'); custom.stop()
  const plain = make({ url: 'moonlight://pair', pin: '1234', expires_in: 120, host: '192.168.1.5', port: 47989 })
  await plain.begin(); assert.equal(plain.view.address, '192.168.1.5'); plain.stop()
  const old = make({ url: 'moonlight://pair', pin: '1234', expires_in: 120 })
  await old.begin(); assert.equal(old.view.address, ''); old.stop()
})

test('the address step has no command line and no system tabs; the port row is closed by default', () => {
  const address = read('MGuideAddress.vue'); const port = read('MGuidePort.vue')
  for (const gone of ['MSeg', 'ipconfig', 'hostOs', 'radiogroup']) assert.ok(!address.includes(gone), gone)
  for (const locale of ['zh', 'en']) {
    const a = guideTexts(locale).address
    assert.ok(a.listed.includes('{name}') && a.recheck && a.diagnostics && a.others && a.port.title && a.port.restart)
    for (const key of ['windowsHow', 'linuxHow', 'macosHow', 'example', 'manual', 'pick', 'fill', 'find']) assert.ok(!(key in a), key)
    assert.ok(!/ipconfig|cmd|Win \+ R|ip addr/.test(JSON.stringify(a)), 'no command in the texts')
  }
  assert.match(port, /const more = ref\(props\.open\)/); assert.match(port, /:aria-expanded="more"/)
  assert.match(read('MGuideFlow.vue'), /<MGuideAddress[^>]*:network="state\.network/)
  assert.match(read('MRemotePublic.vue'), /formatHostAddress\(/)
})
