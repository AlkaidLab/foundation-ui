import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AWAKE_OPTIONS, BARS, LAYOUTS, awakeLeft, canPlayLayout, channelIndex, createKeyTracker, hdrSteps, nearBlack, nearWhite, paceStats, panOf, pollingRate, rampSteps, syncTicks } from '../src/testtools/logic.js'
import { TEST_TOOL_TEXTS, testToolTexts } from '../src/testtools/texts.js'
import { MUSIC_TRACKS, alternatePans, channelModes, loopSeconds, midiToHz, routeOf, sweepPan, trackById, trackEvents } from '../src/testtools/music.js'

// ui-toolbox-expand: the streaming test tools
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the patterns: eight bars, a ramp from code 0 to the top of its depth, the squares around black and white, the PQ codes of the HDR steps', () => {
  assert.equal(BARS.length, 8); assert.deepEqual(BARS[0], [255, 255, 255]); assert.deepEqual(BARS.at(-1), [0, 0, 0])
  const r8 = rampSteps(64, 8); assert.deepEqual([r8[0].code, r8.at(-1).code, r8.length], [0, 255, 64]); assert.equal(rampSteps(64, 10).at(-1).code, 1023)
  assert.ok(r8.every((s, i) => i === 0 || s.code > r8[i - 1].code), 'every band is lighter than the one before')
  const b = nearBlack(); assert.deepEqual([b[0].code, b.at(-1).code, b.find((s) => s.video).code], [0, 24, 16])
  const w = nearWhite(); assert.deepEqual([w[0].code, w.at(-1).code, w.find((s) => s.video).code], [230, 255, 235])
  const h = hdrSteps(1000); assert.deepEqual(h.map((s) => s.nits), [10, 50, 100, 250, 500, 750, 1000]); assert.ok(Math.abs(h.at(-1).pq - 769) <= 2, `1000 nits is PQ 769: ${h.at(-1).pq}`); assert.ok(h.every((s, i) => i === 0 || s.pq > h[i - 1].pq))
})

test('the frame statistics: a steady 60 Hz shows 60 and no judder; one late frame shows as judder, a low 1 % and the longest gap; too few frames give nothing', () => {
  const steady = Array.from({ length: 121 }, (_, i) => i * (1000 / 60))
  const s = paceStats(steady); assert.ok(Math.abs(s.refreshHz - 60) < 0.1 && Math.abs(s.avgFps - 60) < 0.1); assert.equal(s.janks, 0); assert.equal(s.frames, 121)
  const hitch = [...steady.slice(0, 60), ...steady.slice(60).map((t) => t + 50)]
  const j = paceStats(hitch); assert.equal(j.janks, 1); assert.ok(j.longestMs > 60 && j.lowFps < 20 && j.avgFps < 60, JSON.stringify(j)); assert.ok(Math.abs(j.refreshHz - 60) < 0.5, 'the usual rate is the median, not the average')
  assert.equal(paceStats([0, 16]), null); assert.equal(paceStats(null), null)
})

test('the beeps are a second apart, after a lead; the channels follow the order of Web Audio; two channels play left and right by pan', () => {
  assert.deepEqual(syncTicks(10, 3), [10.3, 11.3, 12.3])
  assert.deepEqual(LAYOUTS['surround5.1'], ['L', 'R', 'C', 'LFE', 'SL', 'SR']); assert.equal(channelIndex('surround7.1', 'SL'), 6); assert.equal(channelIndex('stereo', 'C'), -1)
  assert.equal(canPlayLayout('stereo', 2), true); assert.equal(canPlayLayout('surround5.1', 2), false); assert.equal(canPlayLayout('surround5.1', 6), true); assert.equal(canPlayLayout('surround7.1', 6), false)
  assert.deepEqual(['L', 'R', 'C'].map(panOf), [-1, 1, 0])
})

test('the channel music: four 10 to 20 second loops of valid notes, stereo left, right and both, a channel of a discrete output, and the sweep and alternate pans', () => {
  assert.ok(MUSIC_TRACKS.length >= 4); assert.equal(new Set(MUSIC_TRACKS.map((t) => t.id)).size, MUSIC_TRACKS.length)
  for (const t of MUSIC_TRACKS) {
    const seconds = loopSeconds(t); assert.ok(seconds >= 10 && seconds <= 20, `${t.id}: ${seconds}`)
    const events = trackEvents(t)
    assert.ok(events.length >= 24, `${t.id}: ${events.length} notes`)
    assert.ok(events.every((n) => Number.isFinite(n.midi) && n.midi >= 24 && n.midi <= 100), t.id)
    assert.ok(events.every((n) => Number.isFinite(n.beat) && n.beat >= 0 && n.beat < t.beats), t.id)
    assert.ok(events.every((n) => n.beats > 0 && n.gain > 0 && n.gain <= 1), t.id)
    assert.ok(events.some((n) => n.beat < 0.001), `${t.id} starts on the first beat`)
    assert.deepEqual(trackEvents(t), events) // the same score every time
  }
  assert.equal(midiToHz(69), 440); assert.ok(Math.abs(midiToHz(60) - 261.626) < 0.01); assert.equal(trackById('nope').id, MUSIC_TRACKS[0].id)
  assert.deepEqual(channelModes('stereo'), ['L', 'R', 'both']); assert.deepEqual(channelModes('surround5.1'), ['L', 'R', 'C', 'LFE', 'SL', 'SR'])
  assert.deepEqual(routeOf('stereo', 'L', 2), { kind: 'pan', pan: -1 }); assert.deepEqual(routeOf('stereo', 'R', 2), { kind: 'pan', pan: 1 }); assert.deepEqual(routeOf('stereo', 'both', 2), { kind: 'pan', pan: 0 })
  assert.deepEqual(routeOf('surround5.1', 'SL', 6), { kind: 'channel', channel: 4, channels: 6 }); assert.deepEqual(routeOf('surround5.1', 'SL', 2), { kind: 'pan', pan: 0 })
  assert.equal(sweepPan(0, 20), -1); assert.equal(sweepPan(10, 20), 0); assert.equal(sweepPan(20, 20), 1); assert.equal(sweepPan(99, 20), 1); assert.equal(sweepPan(1, 0), 0)
  const pans = alternatePans(trackById('marimba'), 2); assert.ok(pans.length >= 8); assert.ok(pans.every((c, i) => c.pan === (i % 2 ? 1 : -1)))
})

test('the channel music is original to the repository: each track has a source-index record and a licence note', () => {
  const index = src('../docs/authority/source-index.tsv'), note = src('../LICENSES/ORIGINAL-MUSIC.md')
  assert.ok(index.includes('m3e-webaudio-20261109'), 'the Web Audio spec is recorded')
  for (const t of MUSIC_TRACKS) { assert.ok(index.includes(`m3e-music-${t.id}-20261109`), t.id); assert.ok(note.includes(t.id), t.id) }
})

test('the keyboard keeps the most keys that were down at once; the mouse rate comes from the gaps between its moves; the hold counts down and ends', () => {
  const k = createKeyTracker(); k.down('KeyA'); k.down('KeyS'); k.down('KeyD'); assert.equal(k.max, 3); k.up('KeyS'); assert.deepEqual(k.keys(), ['KeyA', 'KeyD']); assert.equal(k.max, 3); k.reset(); assert.deepEqual([k.keys().length, k.max], [0, 0])
  assert.equal(pollingRate(Array.from({ length: 30 }, (_, i) => i * 1)), 1000); assert.equal(pollingRate(Array.from({ length: 30 }, (_, i) => i * 8)), 125); assert.equal(pollingRate([0, 1, 2]), 0)
  assert.equal(pollingRate([0, 1, 2, 3, 4, 5, 500, 501, 502, 503, 504]), 1000, 'a pause between two movements is not a gap')
  assert.deepEqual(AWAKE_OPTIONS.map((o) => o.minutes), [30, 60, 180, 0])
  assert.equal(awakeLeft(0, 30, 10 * 60000), 20 * 60); assert.equal(awakeLeft(0, 30, 99 * 60000), 0); assert.equal(awakeLeft(0, 0, 5), null)
})

test('the words are in both languages with the same keys; the tools are on the page and in the products\' lists', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(TEST_TOOL_TEXTS.zh), keys(TEST_TOOL_TEXTS.en)); assert.equal(testToolTexts('fr'), TEST_TOOL_TEXTS.en)
  const page = src('../src/vue/testtools/MTestTools.vue')
  for (const part of ['TestPatterns', 'TestPacing', 'TestSync', 'TestChannels', 'TestInput', 'TestAwake']) assert.ok(page.includes(`import ${part} from './${part}.vue'`), part)
  assert.ok(src('../src/vue/index.js').includes("export { default as MTestTools } from './testtools/MTestTools.vue'") && src('../src/css/all.css').includes("@import './testtools.css';"))
})

test('the patterns tool takes its document and window listeners with it when it goes', () => {
  const p = src('../src/vue/testtools/TestPatterns.vue')
  assert.ok(p.includes("document.addEventListener('fullscreenchange', redraw)") && p.includes("document.removeEventListener('fullscreenchange', redraw)"), 'the fullscreen listener is named and removed')
  assert.ok(p.includes("window.addEventListener('resize', draw)") && p.includes("window.removeEventListener('resize', draw)"), 'the resize listener is removed')
  assert.ok(p.includes('onBeforeUnmount'), 'the removal runs when the tool is not shown any more')
})

// md-tools: the four tools added to the toolbox (input latency, microphone level, gamepad, display information)
import { rumbleLines, aspectOf, createPeakHold, cueDelay, delayStats, levelDb, meterShare, padButtonName, padIds, padRate, peakDb, physicalSize, stickOf, widestGamut, withDeadzone } from '../src/testtools/logic.js'

test('the press delays: last, mean, best, worst and spread; nothing before the first press; the cue comes later than the minimum and never later than the span', () => {
  assert.equal(delayStats([]), null)
  const s = delayStats([10, 20, 30]); assert.deepEqual([s.count, s.last, s.mean, s.best, s.worst, s.spread], [3, 30, 20, 10, 30, 20])
  assert.equal(cueDelay(0), 800); assert.equal(cueDelay(1), 3000); assert.ok(cueDelay(0.5) > 800 && cueDelay(0.5) < 3000); assert.equal(cueDelay(-3), 800)
})

test('the microphone level: a full-scale sine is -3 dB rms and 0 dB peak, silence sits on the floor, half the amplitude is 6 dB less; the meter and the peak hold', () => {
  const sine = Float32Array.from({ length: 2048 }, (_, i) => Math.sin((2 * Math.PI * i) / 64))
  assert.ok(Math.abs(levelDb(sine) + 3.01) < 0.05, String(levelDb(sine))); assert.ok(Math.abs(peakDb(sine)) < 0.05)
  assert.ok(Math.abs(levelDb(sine.map((v) => v / 2)) - (levelDb(sine) - 6.02)) < 0.05)
  assert.equal(levelDb(new Float32Array(64)), -90); assert.equal(levelDb([]), -90); assert.equal(peakDb(null), -90)
  assert.deepEqual([meterShare(-60), meterShare(-30), meterShare(0), meterShare(12), meterShare(-90)], [0, 0.5, 1, 1, 0])
  const h = createPeakHold(1000, 20); assert.equal(h.push(-10, 0), -10); assert.equal(h.push(-40, 500), -10, 'held'); assert.equal(h.push(-40, 3000), -50, 'falls 20 dB/s after the hold (2 s)'); assert.equal(h.push(-5, 3100), -5)
})

test('the gamepad: standard names, a dead zone that starts the range at zero, sticks cut to the unit circle, the report rate from the changes of the time stamp, the ids out of the id string', () => {
  assert.deepEqual([0, 7, 16].map((i) => padButtonName(i)), ['A', 'RT', 'Guide']); assert.equal(padButtonName(3, false), '#3'); assert.equal(padButtonName(40), '#40')
  assert.equal(withDeadzone(0.05), 0); assert.equal(withDeadzone(-1), -1); assert.ok(Math.abs(withDeadzone(0.54) - 0.5) < 1e-9)
  const s = stickOf([1, 1, 0, 0], 0); assert.ok(Math.abs(Math.hypot(s.x, s.y) - 1) < 1e-9 && s.r === 1); assert.equal(stickOf([0.03, 0.02], 0).r, 0); assert.deepEqual(stickOf(undefined, 1), { x: 0, y: 0, r: 0 })
  const polled = Array.from({ length: 120 }, (_, i) => Math.floor(i / 4) * 8) // 125 Hz seen at 500 frames a second
  assert.equal(padRate(polled), 125); assert.equal(padRate([1, 2, 3]), 0); assert.equal(padRate(null), 0)
  assert.deepEqual(padIds('Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)'), { vendor: '045e', product: '028e' }); assert.deepEqual(padIds('054c-09cc-Wireless Controller'), { vendor: '054c', product: '09cc' }); assert.equal(padIds('x'), null)
})

test('the display: the real pixels, the widest colour space, the aspect names', () => {
  assert.deepEqual(physicalSize(1536, 864, 1.25), { width: 1920, height: 1080 })
  assert.equal(widestGamut((g) => g === 'srgb' || g === 'p3'), 'p3'); assert.equal(widestGamut(() => false), ''); assert.equal(widestGamut(() => true), 'rec2020')
  assert.deepEqual([[1920, 1080], [2560, 1600], [3440, 1440], [1366, 768], [1024, 768], [1000, 700], [0, 5]].map(([w, h]) => aspectOf(w, h)), ['16:9', '16:10', '21:9', '16:9', '4:3', '10:7', ''])
})

test('the four tools are on the page, ask for nothing before a press, and let go of their devices and listeners when they go', () => {
  const page = src('../src/vue/testtools/MTestTools.vue')
  for (const part of ['TestLatency', 'TestMic', 'TestPad', 'TestDisplay']) assert.ok(page.includes(`import ${part} from './${part}.vue'`) && page.includes(`: ${part}`), part)
  const mic = src('../src/vue/testtools/TestMic.vue'), pad = src('../src/vue/testtools/TestPad.vue'), disp = src('../src/vue/testtools/TestDisplay.vue'), lat = src('../src/vue/testtools/TestLatency.vue')
  assert.ok(!/onMounted\([^)]*getUserMedia/.test(mic) && mic.includes('@click="start()"') && mic.includes('t.stop()') && mic.includes('onBeforeUnmount(() => {') && mic.includes('halt()'), 'the microphone starts on a press and stops on leaving')
  assert.ok(mic.includes('echoCancellation: false') && mic.includes("'devicechange'") && mic.includes('removeEventListener'), 'raw level; the device list follows the devices')
  assert.ok(pad.includes("window.addEventListener('gamepadconnected', wake)") && pad.includes("window.removeEventListener('gamepadconnected', wake)") && pad.includes('cancelAnimationFrame(raf)'), 'the pad loop and its listener end with the tool')
  assert.ok(disp.includes('@click="detect"') && !/onMounted\([\s\S]*getScreenDetails\(\)/.test(disp) && disp.includes("window.removeEventListener('resize', read)"), 'all displays are asked for on a press; the resize listener ends with the tool')
  assert.ok(lat.includes('@click="begin"') && lat.includes('clearTimeout(cue)') && lat.includes('cancelAnimationFrame(raf)'), 'the reaction round starts on a press and its timers end with the tool')
  assert.ok(!/<(button|input|select|textarea)\b/.test(mic + pad + disp + lat), 'no raw control')
})

test('the four tools compile as single-file components', async () => {
  const { parse, compileScript, compileTemplate } = await import('@vue/compiler-sfc')
  for (const f of ['TestLatency', 'TestMic', 'TestPad', 'TestDisplay']) {
    const { descriptor, errors } = parse(src(`../src/vue/testtools/${f}.vue`), { filename: `${f}.vue` }); assert.equal(errors.length, 0, f)
    const script = compileScript(descriptor, { id: f }); const tpl = compileTemplate({ source: descriptor.template.content, filename: `${f}.vue`, id: f, compilerOptions: { bindingMetadata: script.bindings } })
    assert.equal(tpl.errors.length, 0, `${f}: ${tpl.errors.join()}`)
  }
})

test('the clock dial and the multi-line field: the dial is exported, draws its hands from the time it is given and hides itself from assistive technology; MField takes rows', async () => {
  const dial = src('../src/vue/MClockDial.vue')
  assert.ok(src('../src/vue/index.js').includes("export { default as MClockDial } from './MClockDial.vue'"))
  assert.ok(dial.includes('aria-hidden="true"') && dial.includes('props.at') && dial.includes('m-dial__hand--h') && dial.includes('m-dial__sec'))
  assert.ok(!/<(button|input|select)\b/.test(dial))
  const { parse, compileScript, compileTemplate } = await import('@vue/compiler-sfc')
  const { descriptor } = parse(dial, { filename: 'MClockDial.vue' }); const script = compileScript(descriptor, { id: 'dial' })
  assert.equal(compileTemplate({ source: descriptor.template.content, filename: 'MClockDial.vue', id: 'dial', compilerOptions: { bindingMetadata: script.bindings } }).errors.length, 0)
  const field = src('../src/vue/MField.vue'); assert.ok(field.includes("rows: { type: Number, default: 0 }") && field.includes(':rows="rows || undefined"'))
})

// fs52-gamepad-test-rumble: the rumble test says what happened, and never "felt"
test('the rumble test: a pulse that left the host is "sent" (the host cannot know the far end), a missing pad or a refusal says why, an old host falls back to the pad', () => {
  const k = (x) => rumbleLines(x).map((l) => `${l.tone}:${l.key}`)
  assert.deepEqual(k({ host: { result: 'sent', pads: 1, duration_ms: 400 } }), ['ok:hostSent'])
  assert.deepEqual(rumbleLines({ host: { result: 'sent', pads: 2, duration_ms: 400 } })[0], { tone: 'ok', key: 'hostSent', n: 2, ms: 400 })
  assert.deepEqual(k({ host: { result: 'no_pad' }, browser: { state: 'none' } }), ['warn:hostNoPad', 'warn:browserNone'])
  assert.deepEqual(k({ host: { result: 'busy' } }), ['warn:hostBusy'])
  assert.deepEqual(k({ host: { result: 'unsupported' } }), ['warn:hostUnsupported'])
  assert.deepEqual(k({ hostError: { status: 404 }, browser: { state: 'complete' } }), ['warn:hostOld', 'ok:browserDone'])
  assert.deepEqual(rumbleLines({ hostError: { status: 500, message: 'boom' } }), [{ tone: 'err', key: 'hostFailed', why: 'boom' }])
  assert.deepEqual(rumbleLines({ browser: { state: 'error', message: 'NotAllowed' } }), [{ tone: 'err', key: 'browserError', why: 'NotAllowed' }])
  assert.deepEqual(k({ browser: { state: 'preempted' } }), ['warn:browserPreempted']); assert.deepEqual(rumbleLines({}), [])
  for (const l of ['zh', 'en']) { const r = testToolTexts(l).pad.rumbleResult; for (const key of ['hostSent', 'hostNoPad', 'hostBusy', 'hostUnsupported', 'hostOld', 'hostFailed', 'browserDone', 'browserPreempted', 'browserError', 'browserNone']) assert.ok(r[key], `${l} ${key}`) }
})

test('the gamepad tool: the button asks the host for a stream pad, falls back to the pad actuator, shows the result, and a pad-less window can still ask', () => {
  const pad = src('../src/vue/testtools/TestPad.vue'), page = src('../src/vue/testtools/MTestTools.vue')
  assert.ok(pad.includes('hostRumble') && pad.includes("ids.value?.vendor === '054c'") && pad.includes('rumbleLines('), 'host first for a DualSense, the actuator after')
  assert.ok(pad.includes("host.result !== 'sent'") && pad.includes("playEffect('dual-rumble'"), 'the actuator runs when the host did not send')
  assert.ok(/v-if="!pad && hostRumble"/.test(pad), 'no pad seen by the window: the host can still be asked')
  assert.ok(page.includes("tool === 'pad' ? hostRumble : null"), 'only the pad tool gets the host call')
})
