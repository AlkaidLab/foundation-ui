import test from 'node:test'
import assert from 'node:assert/strict'
import { ANIM_SCALES, DEFAULT_FLAGS, DEV_FLAGS_KEY, anyOverlay, loadFlags, normalizeFlags, saveFlags } from '../src/developer/flags.js'
import { createFrameMeter, createRateWindow, hudLines } from '../src/developer/frameMeter.js'
import { FLASH_CLASS, applyAnimationScale, createFlasher, mutatedElements, overlayCss, playbackRateFor } from '../src/developer/overlays.js'
import { ENDPOINTS, inspect, readablePath, redact } from '../src/developer/apiInspector.js'
import { environmentRows, environmentText, scrubPaths } from '../src/developer/envInfo.js'
import { parseLog, parseLogLine } from '../src/developer/slowLog.js'
import { developerTexts, fill } from '../src/developer/texts.js'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m } }

test('flags: anything stored becomes valid flags, the defaults are not stored, a scale is one of the offered ones', () => {
  assert.deepEqual(normalizeFlags(null), DEFAULT_FLAGS)
  assert.deepEqual(normalizeFlags({ hud: 'yes', animScale: 3, extra: 1, outlines: true }), { ...DEFAULT_FLAGS, outlines: true })
  const store = memory()
  assert.equal(saveFlags({ hud: true, animScale: 5 }, store).animScale, 5)
  assert.deepEqual(loadFlags(store), { ...DEFAULT_FLAGS, hud: true, animScale: 5 })
  saveFlags({}, store)
  assert.equal(store.getItem(DEV_FLAGS_KEY), null, 'all defaults: nothing is kept')
  store.setItem(DEV_FLAGS_KEY, '{broken')
  assert.deepEqual(loadFlags(store), DEFAULT_FLAGS)
  assert.deepEqual([...ANIM_SCALES], [0.5, 1, 2, 5])
  assert.equal(anyOverlay(DEFAULT_FLAGS), false)
  assert.equal(anyOverlay({ ...DEFAULT_FLAGS, animScale: 2 }), true)
})

test('frame meter: fps, mean, p95, worst and the frames that missed, over a sliding window', () => {
  const meter = createFrameMeter({ windowMs: 1000 })
  for (let i = 0; i <= 60; i += 1) meter.push(i * (1000 / 60))
  let s = meter.stats()
  assert.ok(Math.abs(s.fps - 60) < 0.5 && Math.abs(s.avgMs - 16.67) < 0.1 && s.dropped === 0, JSON.stringify(s))
  meter.push(1000 + 90) // a frame of 90 ms
  s = meter.stats()
  assert.equal(s.dropped, 1)
  assert.ok(s.worstMs > 80)
  meter.reset()
  assert.equal(meter.stats().frames, 0)
  assert.equal(createFrameMeter().stats().fps, 0, 'no frames, no numbers')
})

test('rate window: counts in the window, the rate per second, the largest value and the total since the start', () => {
  const w = createRateWindow({ windowMs: 10_000 })
  w.add(0, 5); w.add(4000, 3, 120); w.add(12_000, 2, 60)
  const s = w.snapshot(12_000)
  assert.deepEqual([s.count, s.perSecond, s.max, s.total], [5, 0.5, 120, 10])
})

test('the HUD shows only the lines of the flags that are on', () => {
  const frame = { fps: 118.4, avgMs: 8.46, p95Ms: 11.2, worstMs: 24.8, dropped: 3 }
  const lt = { count: 2, max: 94.2 }
  const mu = { perSecond: 4.6, count: 46, total: 412 }
  assert.deepEqual(hudLines({ hud: true }, frame, lt, mu), ['118 fps  8.5 ms  p95 11.2  worst 24.8  missed 3'])
  assert.equal(hudLines({ longTasks: true, mutations: true }, frame, lt, mu).length, 2)
  assert.match(hudLines({ longTasks: true }, frame, { count: 0, max: 0 }, mu)[0], /long tasks 0  \(10 s\)/)
  assert.deepEqual(hudLines({}, frame, lt, mu), [])
})

test('animation scale: 5x is five times slower, 0.5x twice as fast; only animations that need it are touched', () => {
  assert.equal(playbackRateFor(5), 0.2)
  assert.equal(playbackRateFor(0.5), 2)
  const touched = []
  const anim = (rate) => ({ playbackRate: rate, updatePlaybackRate(r) { this.playbackRate = r; touched.push(r) } })
  const list = [anim(1), anim(0.2), { playbackRate: 1 }, null]
  assert.equal(applyAnimationScale(list, 5), 1)
  assert.deepEqual(touched, [0.2])
  assert.equal(applyAnimationScale(list, 5), 0, 'applied once')
  assert.equal(applyAnimationScale(list, 1), 2, 'back to normal')
})

test('flashes: a burst flashes an element once, at most `limit` elements, and the class goes after the time', () => {
  const timers = []
  const el = () => { const classes = new Set(); return { offsetWidth: 1, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) }, classes } }
  const flasher = createFlasher({ later: (fn, ms) => timers.push([fn, ms]), ms: 480, limit: 2 })
  const [a, b, c] = [el(), el(), el()]
  assert.equal(flasher.flash([a, b, c]), 2)
  assert.equal(flasher.flash([a]), 0, 'already flashing')
  assert.ok(a.classes.has(FLASH_CLASS))
  assert.equal(timers[0][1], 480)
  timers.forEach(([fn]) => fn())
  assert.ok(!a.classes.has(FLASH_CLASS))
  assert.equal(flasher.live, 0)
})

test('mutated elements: the target element (a text node counts for its parent); the HUD and the flash class do not count', () => {
  const hud = { nodeType: 1, id: 'm-dev-hud', closest: () => hud }
  const plain = { nodeType: 1, id: 'x', closest: () => null, classList: { contains: () => false } }
  const text = { nodeType: 3, parentElement: plain }
  const flashing = { nodeType: 1, id: 'y', closest: () => null, classList: { contains: (c) => c === FLASH_CLASS } }
  const found = mutatedElements([{ target: hud, type: 'childList' }, { target: text, type: 'characterData' }, { target: flashing, type: 'attributes', attributeName: 'class' }, { target: plain, type: 'attributes', attributeName: 'style' }])
  assert.deepEqual([...found], [plain])
  assert.match(overlayCss(), /m-dev-outline/)
})

test('API inspector: only a GET of a path under /api/, none of the words of a state-changing endpoint', () => {
  for (const e of ENDPOINTS) assert.equal(readablePath(e.path), e.path, e.path)
  assert.equal(readablePath('/api/logs?offset=10'), '/api/logs?offset=10')
  for (const bad of ['', 'api/config', '/config', '/api/../etc', '//evil/api/x', '/api/restart', '/api/pairing/pending?wait=25', '/api/password', '/api/config#x', '/api/x y', 'https://x/api/config', '/api/apps/delete/3', '/api/clear']) assert.equal(readablePath(bad), null, bad)
})

test('API inspector: secrets are hidden, the shape stays, numbers and plain fields are untouched', () => {
  const out = redact({ sunshine_name: 'PC', password: 'x', nested: { api_token: 't', ok: 1, list: [{ credentials: 'c', n: 2 }] }, named_certs: [{ cert: 'PEM' }], keys: ['a'], empty_password: '' })
  assert.equal(out.password, '«hidden»')
  assert.equal(out.nested.api_token, '«hidden»')
  assert.equal(out.nested.list[0].credentials, '«hidden»')
  assert.equal(out.named_certs, '«hidden»')
  assert.deepEqual([out.sunshine_name, out.nested.ok, out.nested.list[0].n, out.keys, out.empty_password], ['PC', 1, 2, ['a'], ''])
})

test('API inspector: reads once with GET and no body, lays the JSON out hidden, reports status and time; a refused path never reaches the network', async () => {
  const calls = []
  let t = 100
  const fetchImpl = async (url, init) => { calls.push([url, init.method]); t += 42; return { ok: true, status: 200, headers: new Map([['content-type', 'application/json']]), text: async () => '{"a":1,"password":"p"}' } }
  const r = await inspect({ fetchImpl, base: 'http://127.0.0.1:48081/', path: '/api/config', now: () => t })
  assert.deepEqual(calls, [['http://127.0.0.1:48081/api/config', 'GET']])
  assert.deepEqual([r.ok, r.status, r.ms, r.json, r.bytes], [true, 200, 42, true, 22])
  assert.match(r.body, /"password": "«hidden»"/)
  const refused = await inspect({ fetchImpl, base: '', path: '/api/restart' })
  assert.deepEqual([refused.ok, refused.error], [false, 'not-readable'])
  assert.equal(calls.length, 1)
  const text = await inspect({ fetchImpl: async () => ({ ok: false, status: 502, headers: new Map(), text: async () => 'bad gateway' }), path: '/api/apps' })
  assert.deepEqual([text.ok, text.status, text.json, text.body], [false, 502, false, 'bad gateway'])
  const failing = await inspect({ fetchImpl: async () => { throw new Error('refused') }, path: '/api/apps' })
  assert.deepEqual([failing.ok, failing.error], [false, 'refused'])
})

test('environment: rows in a fixed order, empty things left out, user names in paths hidden', () => {
  const info = { product: 'panel', version: '2026.1103.224731', channel: 'stable', builds: [{ name: 'panel', sha: 'cb0bce0' }, { name: 'm3e', sha: '13c4943' }], os: 'Windows 11 26300', gpu: '', webview: '156.0.4314.58', display: '3840x2160 @200%', userAgent: 'x C:\\Users\\Sky\\AppData' }
  const rows = environmentRows(info)
  assert.deepEqual(rows.map((r) => r[0]), ['product', 'version', 'channel', 'build panel', 'build m3e', 'os', 'webview', 'display', 'user agent'])
  assert.match(environmentText(info), /build m3e: 13c4943/)
  assert.equal(scrubPaths('C:\\Users\\Sky\\x'), 'C:\\Users\\«user»\\x')
  assert.doesNotMatch(environmentText(info), /Sky/)
})

test('slow log: the lines of the panel log that say where time went, newest first, filtered', () => {
  const log = [
    '[2026-11-04 09:50:54.272] [WARN] [src\\logger.rs:270] [renderer] fetch /panel_activity 3621 ms ',
    '[2026-11-04 09:51:39.462] [WARN] [src\\logger.rs:270] [renderer] timer late 2356 ms pending: /frontend_slow 1028ms',
    '[2026-11-04 09:51:42.001] [WARN] [src\\logger.rs:270] [renderer] frame long-animation-frame 1534 ms blocking 1483 ms user-callback:TimerHandler',
    '[2026-11-04 03:11:03.100] [WARN] [src\\stall_watch.rs:41] [stall] watcher woke 0 ms late, main thread answered in 2446 ms: the UI thread was busy',
    '[2026-11-04 06:50:51.590] [INFO] [src\\windows\\lifecycle\\display.rs:471] [dpi-cover] page settled 243 ms after the change, fading',
    '[2026-11-04 09:44:40.187] [INFO] [src\\windows\\lifecycle\\display.rs:548] [warm] capture took 867 ms',
    '[2026-11-04 09:44:37.049] [INFO] [src\\main.rs:188] Sunshine Control Panel starting',
  ].join('\n')
  const rows = parseLog(log)
  assert.equal(rows.length, 6)
  assert.equal(rows[0].kind, 'warm')
  assert.deepEqual(parseLogLine(log.split('\n')[0]), { at: '2026-11-04 09:50:54.272', level: 'WARN', kind: 'fetch', label: '/panel_activity', ms: 3621, text: '' })
  assert.equal(rows.find((r) => r.kind === 'stall').ms, 2446)
  assert.equal(rows.find((r) => r.kind === 'timer').ms, 2356)
  assert.deepEqual(parseLog(log, { kinds: ['frame'] }).map((r) => r.ms), [1534])
  assert.deepEqual(parseLog(log, { minMs: 2000 }).map((r) => r.kind).sort(), ['fetch', 'stall', 'timer'])
  assert.equal(parseLogLine('not a log line'), null)
})

test('texts: every key of the Chinese set exists in English and the other way round, with the same placeholders', () => {
  const zh = developerTexts('zh'); const en = developerTexts('en')
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]))
  assert.deepEqual(keys(zh).sort(), keys(en).sort())
  const holes = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join()
  const flat = (o) => Object.fromEntries(keys(o).map((k) => [k, k.split('.').reduce((x, y) => x[y], o)]))
  const [fz, fe] = [flat(zh), flat(en)]
  for (const k of Object.keys(fz)) assert.equal(holes(fz[k]), holes(fe[k]), k)
  assert.equal(fill('{n} 条', { n: 3 }), '3 条')
})
