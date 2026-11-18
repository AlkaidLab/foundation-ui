import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { checkProgress, normalizeRun, stepTitle } from '../src/settings/networkCheck.js'
import { endpointRow, normalizeReport, reachOverview, reachView } from '../src/settings/reachability.js'
import { reachTexts } from '../src/settings/reachTexts.js'
import { failureOf } from '../src/settings/remoteFlow.js'
import { createReachability } from '../src/vue/useReachability.js'
import { createNetworkCheck, timedCall } from '../src/vue/useNetworkCheck.js'
import { failureWords } from '../src/settings/reachTexts.js'

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'))
const report = (fn = () => {}) => { const r = fixture('reachability-public-verified'); fn(r); return r }
const run = (state, steps) => ({ version: 1, id: 'r1', state, timed_out: false, steps: steps.map(([id, st, checked = false, subject = null]) => ({ id, subject, state: st, checked })) })
const STEPS_GOING = [['listening', 'ok'], ['firewall', 'running', true], ['addresses', 'running'], ['cgnat', 'pending'], ['router', 'pending'], ['endpoint', 'pending', false, '203.0.113.9:60000']]
const STEPS_DONE = STEPS_GOING.map(([id, , , subject]) => [id, 'ok', true, subject])
const ok = (json, status = 200) => ({ ok: true, status, json })
const bad = (status) => ({ ok: false, status, json: null })
const instant = () => Promise.resolve()

// a host: the start and the polls of the run, and the report
function host({ start = ok(run('running', STEPS_GOING)), polls = [ok(run('done', STEPS_DONE))], rep = ok(report()) } = {}) {
  const calls = []
  let at = 0
  const request = async (path, init) => {
    calls.push(`${init?.method || 'GET'} ${path}`)
    if (path.startsWith('/api/network/reachability')) return typeof rep === 'function' ? rep(path) : rep
    if (init?.method === 'POST') return start
    const next = polls[Math.min(at, polls.length - 1)]
    at += 1
    return next
  }
  return { request, calls }
}
const make = (h, extra = {}) => createReachability({ request: h.request, sleep: instant, intervalMs: 1, ...extra })

// ---- the host's run as progress

test('a run is shown as the steps it has and how far each is', () => {
  const p = checkProgress(normalizeRun(run('running', STEPS_GOING)))
  assert.deepEqual(p.steps.map((s) => [stepTitle(s, 'zh'), s.phase]), [['本机端口', 'done'], ['防火墙', 'done'], ['公网地址（STUN）', 'running'], ['共享地址（CGNAT）', 'pending'], ['路由器（UPnP）', 'pending'], ['公网地址 203.0.113.9:60000', 'pending']])
  assert.equal(p.text, '2/6')
  assert.equal(checkProgress(normalizeRun(run('done', STEPS_DONE))).text, '6/6')
  assert.equal(stepTitle({ id: 'router', subject: '' }, 'en'), 'Router (UPnP)')
  assert.equal(checkProgress(null), null)
  for (const raw of [null, {}, { version: 2, id: 'a', steps: [] }, { version: 1, id: 'a' }, { version: 1, steps: [] }]) assert.equal(normalizeRun(raw), null)
})

// ---- the flow: progress, the report, failures that are shown

test('a check shows its steps as they go and reads the report when it is done', async () => {
  const h = host({ polls: [ok(run('running', STEPS_GOING)), ok(run('done', STEPS_DONE))] })
  const r = make(h)
  const seen = []
  const watch = setInterval(() => { if (r.view.progress) seen.push(r.view.progress.text) }, 0)
  const done = r.refresh(true)
  assert.equal(r.view.status, 'loading')
  await done
  clearInterval(watch)
  assert.equal(r.view.status, 'ready')
  assert.equal(r.view.progress, null)
  assert.ok(r.view.report)
  assert.deepEqual(h.calls, ['POST /api/network/check', 'GET /api/network/check?id=r1', 'GET /api/network/check?id=r1', 'GET /api/network/reachability'])
})

test('a host without the run falls back to the one blocking request', async () => {
  for (const status of [404, 444, 501]) {
    const h = host({ start: bad(status) })
    const r = make(h)
    await r.refresh(true)
    assert.equal(r.view.status, 'ready', String(status))
    assert.deepEqual(h.calls, ['POST /api/network/check', 'GET /api/network/reachability?refresh=1'])
  }
  const old = host({ start: bad(404), rep: bad(404) })
  const r = make(old)
  await r.refresh(true)
  assert.equal(r.view.status, 'unavailable')
})

test('reading what the host has is one request; a test address uses the blocking request', async () => {
  const h = host()
  const r = make(h)
  await r.refresh()
  await r.refresh(true, { test: 'a.example.net:60000' })
  assert.deepEqual(h.calls, ['GET /api/network/reachability', 'GET /api/network/reachability?refresh=1&test=a.example.net%3A60000'])
})

test('a failure is shown even when an earlier report is still there: the button never just goes back to 检测', async () => {
  const r = make(host())
  await r.refresh(true)
  const kept = r.view.report
  assert.equal(r.view.status, 'ready')
  const failing = [[bad(500), 'server', 500], [bad(403), 'auth', 403]]
  for (const [answer, reason, http] of failing) {
    const f = make(host({ start: answer }))
    f.view.report = kept
    await f.refresh(true)
    assert.equal(f.view.status, 'error', reason)
    assert.equal(f.view.report, kept, 'the last report stays beside the reason')
    assert.deepEqual([failureOf(f.view).kind, failureOf(f.view).reason, failureOf(f.view).http], ['failed-run', reason, http])
  }
  const down = createReachability({ request: async () => { throw new Error('offline') }, sleep: instant })
  down.view.report = kept
  await down.refresh(true)
  assert.equal(down.view.status, 'error')
  assert.equal(failureOf(down.view).reason, 'offline')
  const plain = make(host({ rep: bad(502) }))
  plain.view.report = kept
  await plain.refresh()
  assert.equal(plain.view.status, 'error', 'a plain read that fails is shown too')
})

test('a request that never answers ends at its timeout and says so', async () => {
  const hang = createReachability({ request: () => new Promise(() => {}), timeoutMs: 30, startTimeoutMs: 30, sleep: instant })
  await hang.refresh(true)
  assert.equal(hang.view.status, 'error')
  assert.equal(hang.view.cause, 'timeout')
  assert.equal(failureOf(hang.view).reason, 'timeout')
  assert.match(failureWords(failureOf(hang.view), 'zh').why, /没有在限定时间内答复/)
  const plain = createReachability({ request: () => new Promise(() => {}), timeoutMs: 30, sleep: instant })
  await plain.refresh()
  assert.equal(plain.view.cause, 'timeout')
  // the next click starts again: nothing stays stuck in "loading"
  await plain.refresh()
  assert.equal(plain.view.status, 'error')
})

test('the signal of the timeout reaches the product\'s request', async () => {
  let seen = null
  await timedCall(async (path, init) => { seen = init.signal; return ok({}) }, '/x', { method: 'GET' }, 1000)
  assert.ok(seen && typeof seen.aborted === 'boolean')
})

test('a second click joins the check that is going', async () => {
  const h = host()
  const r = make(h)
  const first = r.refresh(true)
  assert.equal(r.refresh(true), first)
  await first
  assert.equal(h.calls.filter((c) => c.startsWith('POST')).length, 1)
})

test('one poll that fails does not end the run, a few in a row do, and a run the host forgot ends at once', async () => {
  const flaky = make(host({ polls: [bad(502), ok(run('done', STEPS_DONE))] }))
  await flaky.refresh(true)
  assert.equal(flaky.view.status, 'ready')
  const dead = make(host({ polls: [bad(502)] }))
  await dead.refresh(true)
  assert.equal(dead.view.status, 'error')
  assert.equal(dead.view.http, 502)
  const gone = make(host({ polls: [bad(404)] }))
  await gone.refresh(true)
  assert.equal(gone.view.cause, 'offline')
})

test('a run that goes on and on is ended by its own limit', async () => {
  let clock = 0
  const h = host({ polls: [ok(run('running', STEPS_GOING))] })
  const c = createNetworkCheck({ request: h.request, sleep: async () => { clock += 20000 }, now: () => clock, maxMs: 45000 })
  await c.start()
  assert.deepEqual([c.view.status, c.view.error.kind], ['error', 'timeout'])
})

// ---- the verdicts a person reads

test('a public address this computer cannot reach itself is neutral and says why in the words of the host check', () => {
  const r = report((x) => {
    x.public.verdict = 'unknown'; x.public.reasons = ['mappings_complete']; x.public.evidence = []
    x.public.endpoints = [{ input: '203.0.113.9:60000', host: '203.0.113.9', kind: 'ip', port: 60000, port_explicit: true, https_port: 59995, resolved: ['203.0.113.9'], scope: 'public', matches_wan: true, state: 'failed', error: 'timeout', inconclusive: true, tested: { address: '203.0.113.9', port: 59995, latency_ms: 2500 }, attempts: [{ address: '203.0.113.9', port: 59995, connected: false, identity_match: false, error: 'timeout', latency_ms: 2500 }], reasons: [] }]
  })
  const v = reachView(normalizeReport(r), 'zh')
  const e = v.paths[0].endpoints[0]
  assert.deepEqual([e.tone, e.icon, e.word, e.inconclusive], ['neutral', 'help', '本机无法验证', true])
  const text = v.paths[0].reasons.find((x) => x.code === 'loopback_unverifiable')
  assert.equal(text.text, '这台电脑连不上自己的公网地址，很多路由器不支持回环，这不说明外面连不上，请用手机流量从外面试一次。')
  assert.equal(text.kind, 'note')
  assert.equal(text.action, 'outside')
  assert.notEqual(v.paths[0].verdict, 'unreachable')
  // a failure that is the host's own finding stays red
  const dns = endpointRow({ ...normalizeReport(r).public.endpoints[0], inconclusive: false, error: 'identity_mismatch' }, reachTexts('zh'))
  assert.equal(dns.tone, 'error')
})

test('UDP is a note that nothing has tried it from outside, and not red', () => {
  const unverified = reachView(normalizeReport(report((x) => { x.public.evidence = []; x.public.reasons = ['mappings_complete', 'hairpin_verified'] })), 'zh')
  const note = unverified.paths[0].reasons.find((x) => x.code === 'udp_unverified')
  assert.equal(note.text, 'UDP（画面、声音）还没有从外面验证。')
  assert.equal(note.kind, 'note')
  const notes = reachOverview(normalizeReport(report((x) => { x.public.evidence = []; x.public.reasons = ['mappings_complete'] })), 'zh').find((p) => p.id === 'public').notes
  assert.ok(notes.some((n) => n.code === 'udp_unverified' && n.kind === 'note'))
  // a session from the internet carried UDP: no note; an unreachable path has bigger things to say
  const proven = reachView(normalizeReport(report()), 'zh')
  assert.ok(!proven.paths[0].reasons.some((x) => x.code === 'udp_unverified'))
  const down = reachView(normalizeReport(report((x) => { x.public.verdict = 'unreachable'; x.public.evidence = []; x.public.reasons = ['not_listening:tcp/47989'] })), 'zh')
  assert.ok(!down.paths[0].reasons.some((x) => x.code === 'udp_unverified'))
})

test('the sentences exist in English too', () => {
  const T = reachTexts('en')
  assert.match(T.reasons.loopback_unverifiable, /cannot connect to its own public address/)
  assert.match(T.reasons.udp_unverified, /not been verified from outside/)
  assert.match(failureWords({ kind: 'failed-run', reason: 'timeout', http: 0 }, 'en').why, /did not answer in time/)
})

// ---- the outside check ----

const endpointWith = (outside) => ({ input: '203.0.113.9:60000', host: '203.0.113.9', kind: 'ip', port: 60000, port_explicit: true, https_port: 59995, ports: [{ role: 'https', port: 59995 }], resolved: ['203.0.113.9'], scope: 'public', matches_wan: true, state: 'failed', error: 'timeout', inconclusive: !outside || outside.state === 'unavailable', outside, tested: { address: '203.0.113.9', port: 59995, latency_ms: 2500 }, attempts: [{ address: '203.0.113.9', port: 59995, connected: false, identity_match: false, error: 'timeout', latency_ms: 2500 }], reasons: [] })
const withOutside = (outside, reasons = ['outside_verified', 'mappings_complete'], verdict = 'verified') => normalizeReport(report((x) => { x.public.verdict = verdict; x.public.reasons = reasons; x.public.evidence = []; x.public.endpoints = [endpointWith(outside)] }))

test('a connection from the internet that reached this host is shown as reached, in green, whatever this computer could see of its own address', () => {
  const v = reachView(withOutside({ state: 'reachable', reason: null }), 'zh')
  const e = v.paths[0].endpoints[0]
  assert.deepEqual([e.tone, e.icon, e.word, e.reached], ['ok', 'check_circle', '已从外部连通', true])
  assert.ok(v.paths[0].reasons.some((r) => r.code === 'outside_verified' && r.kind === 'good'))
  assert.ok(!v.paths[0].reasons.some((r) => r.code === 'loopback_unverifiable'), 'nothing to explain: the address works')
  const udp = v.paths[0].reasons.find((r) => r.code === 'udp_unverified_forwarded')
  assert.equal(udp.text, 'TCP 已从外部验证；UDP 未验证。路由器也转发了 UDP 端口，所以很可能可连。')
  assert.equal(udp.kind, 'note')
})

test('a connection from the internet that found nothing is red with its reason and the fix, and another device answering is named', () => {
  for (const [state, word] of [['closed', '外部连不上：端口关闭'], ['timeout', '外部连不上：没有应答'], ['another_host', '外部连到的是另一台设备']]) {
    const v = reachView(withOutside({ state, reason: null }, ['not_reached_from_outside'], 'unreachable'), 'zh')
    const e = v.paths[0].endpoints[0]
    assert.deepEqual([e.tone, e.word], ['error', word], state)
    const r = v.paths[0].reasons.find((x) => x.code === 'not_reached_from_outside')
    assert.equal(r.action, 'forward')
  }
})

test('an outside check that could not run says what the result rests on and is never red', () => {
  const v = reachView(withOutside({ state: 'unavailable', reason: 'no_answer' }, ['mappings_complete'], 'unknown'), 'zh')
  const e = v.paths[0].endpoints[0]
  assert.equal(e.tone, 'neutral')
  assert.equal(e.word, '本机无法验证')
  const note = v.paths[0].reasons.find((x) => x.code === 'outside_unavailable')
  assert.equal(note.text, '外部验证现在不可用，这个结果只来自这台电脑自己。')
  assert.equal(note.kind, 'note')
  assert.notEqual(v.paths[0].verdict, 'unreachable')
  // when it was not asked there is no note at all
  const off = reachView(withOutside(null, ['mappings_complete'], 'unknown'), 'zh')
  assert.ok(!off.paths[0].reasons.some((x) => x.code === 'outside_unavailable'))
})

test('the outside sentences exist in English', () => {
  const T = reachTexts('en')
  assert.match(T.reasons.outside_unavailable, /not available now/)
  assert.match(T.reasons.udp_unverified_forwarded, /UDP is not/)
  assert.equal(T.endpoint.outsideReached, 'Reached from outside')
})
