import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_TEXTS, TEXTS_ZH, buildStartSteps, guidePlatforms, BUILTIN_APPS, buildHomeModel, parseSessionLog, parseErrorLog, formatDuration } from '../src/vue/homeModel.js'

const base = { host: { name: 'PC', version: '1.0', uptimeMs: 3 * 3600000, running: true }, clients: [{ name: 'Phone', uuid: 'a', enabled: true }, { name: 'TV', uuid: 'b', enabled: false }], apps: [{ name: 'Desktop' }], sys: { cpu: 12, gpu: 30, gpuName: 'RTX', memTotal: 32 * 1024 ** 3, memAvail: 20 * 1024 ** 3 }, series: { cpu: [1, 5, 9], gpu: [3, 4] }, encoder: 'nvenc' }
test('idle shows cpu and gpu curves and a restart action', () => {
  const m = buildHomeModel(base)
  assert.deepEqual(m.curves.map((c) => c.id), ['cpu', 'gpu'])
  assert.equal(m.hero.action.kind, 'restart')
  assert.equal(m.hero.statusTone, 'ok')
  assert.equal(m.table.tabs[0].rows[1].cells.state, 'Blocked')
})
test('streaming shows bitrate and fps and a stop action', () => {
  const m = buildHomeModel({ ...base, session: { client_name: 'Phone', width: 1920, height: 1080, fps: 60, bitrate: 20000, codec: 'hevc' }, series: { bitrate: [18000, 20000], fps: [59, 60] } })
  assert.deepEqual(m.curves.map((c) => c.id), ['bitrate', 'fps'])
  assert.equal(m.curves[0].value, '20.0')
  assert.equal(m.hero.action.kind, 'stop')
  assert.equal(m.hero.statusTone, 'live')
})
test('no system data leaves cpu gpu and memory out', () => {
  const m = buildHomeModel({ ...base, sys: null })
  assert.equal(m.curves.length, 0)
  assert.equal(m.info.find((i) => i.id === 'memory'), undefined)
})
test('session log pairs connects with disconnects', () => {
  const rows = parseSessionLog('[2026-11-02 10:00:00.100]: Info: CLIENT CONNECTED\n[2026-11-02 10:30:05.000]: Info: CLIENT DISCONNECTED\n[2026-11-02 11:00:00.000]: Info: CLIENT CONNECTED\nnoise')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].live, true)
  assert.equal(rows[1].length, '30m 5s')
  assert.equal(parseSessionLog(null), null)
})
test('error log keeps errors, counts warnings', () => {
  const r = parseErrorLog('[2026-11-02 10:00:00.1]: Warning: w\n[2026-11-02 10:00:01.1]: Error: boom\n[2026-11-02 10:00:02.1]: Info: ok')
  assert.equal(r.errors, 1); assert.equal(r.warnings, 1); assert.equal(r.rows[0].text, 'boom')
})
test('duration', () => { assert.equal(formatDuration(90 * 60000), '1h 30m') })
test('display card draws the real aspect ratio; encoder gets ring and sparkline while streaming', () => {
  const m = buildHomeModel({ ...base, series: { latency: [3, 4, 5] }, session: { client_name: 'P', width: 2560, height: 1440, fps: 120, bitrate: 20000, latencyMs: 4, codec: 'hevc' } })
  assert.deepEqual(m.info.find((i) => i.id === 'display').screen, { w: 2560, h: 1440, hdr: false })
  const enc = m.info.find((i) => i.id === 'encoder')
  assert.ok(enc.ring.value > 0.4 && enc.ring.value < 0.5)
  assert.deepEqual(enc.spark, [3, 4, 5])
})
test('idle encoder card lists the codecs the settings advertise', () => {
  const m = buildHomeModel({ ...base, codecModes: { hevc: 0, av1: 1 } })
  assert.deepEqual(m.info.find((i) => i.id === 'encoder').chips.map((c) => c.label), ['H.264', 'HEVC · auto', 'AV1 · off'])
})
test('no encoder and no session leaves the encoder card out', () => {
  assert.equal(buildHomeModel({ ...base, encoder: '' }).info.find((i) => i.id === 'encoder'), undefined)
})

test('guide steps tick from real data', () => {
  const T = {}
  const none = buildStartSteps(T, { paired: 0, sessionSeen: false, apps: [{ name: 'Desktop' }, { name: 'Steam Big Picture' }] })
  assert.deepEqual(none.map((s) => s.auto), [false, false, false, false, false])
  assert.deepEqual(buildStartSteps(T, { paired: 1, sessionSeen: false, apps: [] }).map((s) => s.auto), [true, true, false, false, false])
  const done = buildStartSteps(T, { paired: 2, sessionSeen: true, apps: [{ name: 'Desktop' }, { name: 'Elden Ring' }] })
  assert.deepEqual(done.map((s) => s.auto), [true, true, true, true, true])
  assert.deepEqual(buildStartSteps(T, { paired: 0, sessionSeen: true, apps: [] }).map((s) => s.auto), [true, true, true, true, false])
  assert.deepEqual(buildStartSteps(T, {}).map((s) => s.auto), [false, false, false, false, false])
  assert.ok(BUILTIN_APPS.includes('Xbox Game'))
})
test('promo platforms use the ids of the downloads page', () => {
  assert.deepEqual(guidePlatforms({}).map((p) => p.id), ['windows', 'macos', 'linux', 'android', 'ios', 'harmony', 'android-tv'])
})

test('every text has a Chinese version', () => {
  const missing = Object.keys(DEFAULT_TEXTS).filter((k) => !(k in TEXTS_ZH))
  assert.deepEqual(missing, [])
})

test('one hero: at most three chips, two pairs; version, platform, codec and microphone are not on it', () => {
  const m = buildHomeModel({ ...base, host: { ...base.host, update: 'New version', platform: 'Windows' }, sessionCount: 2, session: { client_name: 'Phone', app_name: 'Elden Ring', width: 1920, height: 1080, fps: 60, bitrate: 20000, enable_hdr: true, enable_mic: true, codec: 'hevc', uptimeMs: 125000 } })
  assert.deepEqual(m.hero.chips.map((c) => c.label), ['NVENC', 'HDR', 'New version'])
  assert.equal(m.hero.pairs.length, 2)
  assert.equal(m.hero.pairs[0].value, 'Phone +1')
  const idle = buildHomeModel(base)
  assert.equal(idle.hero.pairs.length, 2); assert.ok(idle.hero.chips.length <= 3)
})
test('virtual display card: state, size, hdr, followed client, no drawn display; replaces the display card', () => {
  const idle = buildHomeModel({ ...base, vdd: { state: 'ready', width: 2560, height: 1440, hz: 240, hdr: true } })
  assert.equal(idle.vdd.stateLabel, 'Active'); assert.equal(idle.vdd.value, '1440p'); assert.equal(idle.vdd.screen, null) // no drawn display on this card
  assert.ok(idle.vdd.sub.includes('preset maximum'))
  const live = buildHomeModel({ ...base, vdd: { state: 'ready', width: 1920, height: 1080, hz: 60 }, session: { client_name: 'Deck', width: 3840, height: 2160, fps: 120, bitrate: 20000, enable_hdr: false } })
  assert.equal(live.vdd.value, '2160p'); assert.ok(live.vdd.chips.some((c) => c.label === 'Follows: Deck'))
  assert.equal(buildHomeModel({ ...base, vdd: { state: 'missing' } }).vdd.tone, 'warn')
  assert.equal(buildHomeModel(base).vdd, null)
})
test('display state without a resolution goes to the hero as nothing: no empty display card', () => {
  const m = buildHomeModel({ ...base, display: { hdr: false, vddText: 'Ready' } })
  assert.equal(m.info.find((i) => i.id === 'display'), undefined)
})
test('detail rows keep latency P95, capture and usb (the devices card is three tiles)', () => {
  const m = buildHomeModel({ ...base, usb: 2, session: { client_name: 'Phone', width: 1920, height: 1080, fps: 60, bitrate: 20000, latencyMs: 4, latencyP95Ms: 7, latencyLastMs: 3, capture: 'wgc' } })
  assert.deepEqual(m.details.encoder.sections[0].rows.map((r) => r.title).slice(-3), ['Latency P95', 'Latest latency', 'Capture'])
  const tiles = m.info.find((i) => i.id === 'devices').tiles
  assert.ok(tiles.some((t) => t.icon === 'usb' && t.word === '2' && t.ready === true), 'the USB tile: the count as its one word, ready')
  assert.ok(tiles.every((t) => !('sub' in t)), 'no second line of text')
})

test('device tiles: the dot is for a device that is ready or in use, never for an offline or unknown one', async () => {
  const { micIsReady, padIsReady } = await import('../src/vue/deviceTiles.js')
  // the Web UI's live state
  assert.equal(micIsReady({ online: false, host_streaming: false }), false, 'offline')
  assert.equal(micIsReady({ online: true, host_streaming: false }), true, 'online')
  assert.equal(micIsReady({ online: true, host_streaming: true }), true, 'in use')
  assert.equal(micIsReady({}), false); assert.equal(micIsReady(null), false); assert.equal(micIsReady(undefined), false)
  // the host's answer while idle with the microphone offline (state 'idle', online false): offline, no dot
  assert.equal(micIsReady({ state: 'idle', online: false, host_streaming: false, underruns: 0 }), false)
  assert.equal(micIsReady({ state: 'idle', online: true, host_streaming: false }), true)
  // the control panel's runtime state
  for (const state of ['active', 'streaming', 'capturing', 'idle', 'waiting']) assert.equal(micIsReady({ state }), true, state)
  for (const state of ['offline', 'missing', 'error', '', 'unknown']) assert.equal(micIsReady({ state }), false, state)
  assert.equal(padIsReady('ready'), true); assert.equal(padIsReady('active'), true)
  for (const state of ['missing', 'error', undefined, '']) assert.equal(padIsReady(state), false)
  // the model: a tile only says ready when the product said so
  const m = buildHomeModel({ ...base, pads: { text: 'DualSense', word: 'DualSense', ready: false }, mic: { text: 'Offline' }, usb: 0 })
  const tiles = m.info.find((i) => i.id === 'devices').tiles
  assert.deepEqual(tiles.map((t) => t.ready), [false, false, false])
  const ready = buildHomeModel({ ...base, pads: { text: 'x', ready: true }, mic: { text: 'Ready', ready: true }, usb: 1 }).info.find((i) => i.id === 'devices').tiles
  assert.deepEqual(ready.map((t) => t.ready), [true, true, true])
})
