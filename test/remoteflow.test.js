import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeReport } from '../src/settings/reachability.js'
import { endpointFor, failureOf, portResults, portRun, testOutcome, upnpOutcome, watchRestart } from '../src/settings/remoteFlow.js'
import { failureWords, reachTexts } from '../src/settings/reachTexts.js'
import { remoteTexts } from '../src/vue/remoteTexts.js'
import { pickLanAddresses } from '../src/vue/guideModel.js'
import { createReachability } from '../src/vue/useReachability.js'

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/reachability-public-verified.json', import.meta.url), 'utf8'))

// a fake clock: sleep advances it, so a 90 s wait takes no time
const clock = () => { let t = 0; return { now: () => t, sleep: async (ms) => { t += ms } } }

test('restart: a new start time is the proof, with or without the host going away', async () => {
  const c = clock(); const seen = []
  const answers = [{ ok: true, startedAt: 'A' }, { ok: true, startedAt: 'A' }, { ok: true, startedAt: 'B' }]
  const out = await watchRestart({ ...c, before: 'A', probe: async () => answers.shift(), onPhase: (p) => seen.push(p) })
  assert.equal(out.phase, 'back'); assert.equal(out.proof, 'start-time'); assert.equal(out.startedAt, 'B'); assert.deepEqual(seen, [])
})

test('restart: without a start time the host must be seen to go away and come back', async () => {
  const c = clock(); const seen = []
  const answers = [{ ok: true }, { ok: false }, { ok: false }, { ok: true }]
  const out = await watchRestart({ ...c, before: '', probe: async () => { const a = answers.shift(); if (!a.ok) throw new Error('down'); return a }, onPhase: (p) => seen.push(p) })
  assert.equal(out.phase, 'back'); assert.equal(out.proof, 'went-away'); assert.equal(out.sawDown, true); assert.deepEqual(seen, ['away'])
})

test('restart: a host that answers all the time with the same start time did not restart, and a blip does not count', async () => {
  const c = clock()
  let n = 0
  const out = await watchRestart({ ...c, before: 'A', timeoutMs: 20000, probe: async () => (++n === 3 ? { ok: false } : { ok: true, startedAt: 'A' }) })
  assert.equal(out.phase, 'timeout'); assert.equal(out.reason, 'same-process'); assert.equal(out.sawDown, true)
})

test('restart: gone and never back is "not-back"; never gone with no start time cannot be confirmed', async () => {
  const a = await watchRestart({ ...clock(), before: 'A', timeoutMs: 10000, probe: async () => ({ ok: false }) })
  assert.deepEqual([a.phase, a.reason], ['timeout', 'not-back'])
  const b = await watchRestart({ ...clock(), before: '', timeoutMs: 10000, probe: async () => ({ ok: true }) })
  assert.deepEqual([b.phase, b.reason], ['timeout', 'never-left'])
})

test('restart: it stops when the screen goes away', async () => {
  const out = await watchRestart({ ...clock(), probe: async () => ({ ok: false }), cancelled: () => true })
  assert.equal(out.phase, 'cancelled')
})

const withRouter = (router, reasons = [], ports) => normalizeReport({
  ...fixture, ports: ports || fixture.ports,
  public: { ...fixture.public, reasons, router: { ...fixture.public.router, ...router } },
})
const PORTS = [
  { proto: 'tcp', port: 57984, role: 'https', listening: true, firewall: 'allowed' }, { proto: 'tcp', port: 57989, role: 'http', listening: true, firewall: 'allowed' },
  { proto: 'tcp', port: 57990, role: 'web', listening: true, firewall: 'allowed' }, { proto: 'udp', port: 57998, role: 'video', listening: false, on_demand: true, firewall: 'allowed' },
  { proto: 'udp', port: 57999, role: 'control', listening: false, on_demand: true, firewall: 'allowed' },
]
const maps = (...present) => [['tcp', 57984], ['tcp', 57989], ['udp', 57998], ['udp', 57999]].map(([proto, port], i) => ({ proto, port, present: present[i] !== false, internal: '192.168.1.5' }))

test('UPnP outcome: mapped, partial, none, no answer; the management port is not asked of it', () => {
  const base = { protocol: 'upnp-igd', wan_ip: '203.0.113.7', wan_ip_class: 'public' }
  assert.equal(upnpOutcome(withRouter({ ...base, mappings: maps() }, [], PORTS)).kind, 'mapped')
  const partial = upnpOutcome(withRouter({ ...base, mappings: maps(true, true, false, false) }, ['mapping_missing:udp/57998'], PORTS))
  assert.equal(partial.kind, 'partial'); assert.deepEqual(partial.missing.map((m) => m.port), [57998, 57999])
  assert.equal(upnpOutcome(withRouter({ ...base, mappings: maps(false, false, false, false) }, [], PORTS)).kind, 'none')
  assert.equal(upnpOutcome(withRouter({ protocol: 'none', mappings: [] }, ['no_igd'], PORTS)).kind, 'no-answer')
  assert.equal(upnpOutcome(null).kind, 'unknown')
  assert.equal(upnpOutcome(withRouter({ ...base, wan_ip_class: 'cgnat', mappings: maps() }, [], PORTS)).wanClass, 'cgnat')
})

test('port runs read as ranges', () => { assert.equal(portRun([47999, 47998, 48000, 48002, 48010]), '47998-48000, 48002, 48010'); assert.equal(portRun([]), '') })

const ep = (over) => ({ input: 'home.example.net', host: 'home.example.net', kind: 'hostname', port: 57989, portExplicit: false, httpsPort: 57984, resolved: ['203.0.113.7'], scope: 'public', matchesWan: true, reached: false, error: '', tested: null, attempts: [], reasons: [], ...over })

test('address test: what each result proves, and the hairpin limit only where it can apply', () => {
  const ok = testOutcome(ep({ reached: true, tested: { address: '203.0.113.7', port: 57984, latencyMs: 31 } }))
  assert.equal(ok.kind, 'reached'); assert.equal(ok.port, 57984); assert.equal(ok.latencyMs, 31)
  assert.equal(testOutcome(ep({ reached: true, scope: 'lan', tested: { address: '192.168.1.5', port: 57984, latencyMs: 2 } })).kind, 'reached-inside')
  const slow = testOutcome(ep({ error: 'timeout' })); assert.equal(slow.kind, 'failed'); assert.equal(slow.hairpinLimit, true)
  assert.equal(testOutcome(ep({ error: 'tls_failed' })).hairpinLimit, false)
  assert.equal(testOutcome(ep({ error: 'timeout', scope: 'lan' })).hairpinLimit, false)
  assert.equal(testOutcome(ep({ error: 'dns_failed' })).kind, 'unresolved'); assert.equal(testOutcome(ep({ error: 'identity_mismatch' })).kind, 'other-device')
  assert.equal(testOutcome(null).kind, 'not-run'); assert.equal(testOutcome(ep({ error: 'not_tried' })).kind, 'not-run')
})

test('endpointFor finds the result of what was typed, and null when the host ignored the test', () => {
  const r = normalizeReport({ ...fixture, public: { ...fixture.public, endpoints: [{ input: 'Home.Example.net', host: 'home.example.net', state: 'reached', scope: 'public', https_port: 57984, port: 57989 }] } })
  assert.equal(endpointFor(r, 'home.example.net').host, 'home.example.net')
  assert.equal(endpointFor(r, 'other.example.net'), null); assert.equal(endpointFor(r, ''), null)
})

test('the port table: a UDP port is never tested, only the HTTPS port carries the test', () => {
  const r = withRouter({ protocol: 'upnp-igd', mappings: maps(true, true, false, true) }, [], PORTS)
  const rows = portResults(r, testOutcome(ep({ reached: true, tested: { address: 'a', port: 57984, latencyMs: 5 } })))
  assert.deepEqual(rows.map((x) => x.role), ['https', 'http', 'video', 'control', 'web'])
  assert.deepEqual(rows.filter((x) => x.testable).map((x) => x.role), ['https']); assert.equal(rows[0].test.kind, 'reached'); assert.equal(rows[2].test, null)
  assert.equal(rows[2].mapped, false); assert.equal(rows[4].mapped, null)
})

test('a check that did not run says why: an older host (444, 404) is not a failed run', () => {
  assert.deepEqual(failureOf({ status: 'unavailable', http: 444 }), { kind: 'old-host', http: 444, reason: '' })
  assert.equal(failureOf({ status: 'error', http: 500 }).reason, 'server'); assert.equal(failureOf({ status: 'error', http: 401 }).reason, 'auth')
  assert.equal(failureOf({ status: 'error', http: 0, cause: 'offline' }).reason, 'offline'); assert.equal(failureOf({ status: 'ready' }).kind, 'ok')
  for (const locale of ['zh', 'en']) {
    const old = failureWords({ kind: 'old-host', http: 444 }, locale)
    assert.ok(old.why); assert.doesNotMatch(old.why, /444|404|HTTP/, 'a person is told the host is old, not which status code it sent')
    const run = failureWords({ kind: 'failed-run', http: 0, reason: 'offline' }, locale)
    assert.ok(run.why && run.next); assert.notEqual(run.why, old.why)
  }
})

test('useReachability: the status code of a failure is kept, and an unsaved address goes in the query', async () => {
  const paths = []
  const r = createReachability({ request: async (p) => { paths.push(p); return { ok: false, status: 500, json: null } } })
  await r.refresh(true); assert.equal(r.view.status, 'error'); assert.equal(r.view.http, 500)
  await r.refresh(true, { test: 'home.example.net:57989' })
  assert.equal(paths[1], '/api/network/reachability?refresh=1&test=home.example.net%3A57989')
  const old = createReachability({ request: async () => ({ ok: false, status: 444, json: null }) })
  await old.refresh(); assert.equal(old.view.status, 'unavailable'); assert.equal(old.view.http, 444)
  const gone = createReachability({ request: async () => { throw new Error('x') } })
  await gone.refresh(); assert.equal(gone.view.status, 'error'); assert.equal(gone.view.cause, 'offline')
})

test('the target address of a port forward is a LAN address, never a mesh one', () => {
  const list = [{ name: 'ZeroTier One [abcd]', address: '10.99.8.70' }, { name: 'Ethernet', address: '192.168.1.20' }]
  assert.equal(pickLanAddresses(list, { lanOnly: true })[0].address, '192.168.1.20')
  assert.equal(pickLanAddresses(list).length, 2) // a phone on the mesh may use the mesh address: only the port-forward target is LAN only
  assert.equal(pickLanAddresses([{ name: 'Ethernet 2', address: '10.99.8.70' }, { name: 'Ethernet', address: '192.168.1.20' }], { exclude: ['10.99.8.70'], lanOnly: true })[0].address, '192.168.1.20')
  assert.equal(pickLanAddresses([{ name: 'ZeroTier One', address: '10.99.8.70' }], { lanOnly: true })[0].address, '10.99.8.70') // nothing else: it is still better than none
})

test('the words: 注意 for the heads-up, both languages carry the same keys', () => {
  assert.equal(remoteTexts('zh').risksTitle, '注意'); assert.doesNotMatch(remoteTexts('zh').risksTitle, /风险/)
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]))
  assert.deepEqual(keys(remoteTexts('zh')).sort(), keys(remoteTexts('en')).sort())
  assert.deepEqual(keys(reachTexts('zh')).sort(), keys(reachTexts('en')).sort())
})
