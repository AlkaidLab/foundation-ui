import assert from 'node:assert/strict'
import test from 'node:test'
import { createHistory, errorsByHour, heatDays, logDays, pushSample, recentApps } from '../src/vue/homeHistory.js'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }

test('samples roll: only the newest are kept, non-numbers are ignored', () => {
  const l = []
  for (let i = 0; i < 200; i++) pushSample(l, i, 180)
  pushSample(l, NaN); pushSample(l, undefined)
  assert.equal(l.length, 180); assert.equal(l[0], 20); assert.equal(l[179], 199)
})

test('a finished session is summarised once, kept locally and counted on its day', () => {
  const storage = memory()
  const h = createHistory(storage, 'k')
  const t0 = Date.parse('2026-11-02T10:00:00')
  assert.equal(h.observe(null, t0), null)
  h.observe({ client_name: 'Pixel 9', app_name: 'Elden Ring', bitrate: 40000, fps: 60, fpsMeasured: 58, latencyP95Ms: 6, dropped_frames: 1, packet_loss: 0.2 }, t0)
  h.observe({ client_name: 'Pixel 9', app_name: 'Elden Ring', bitrate: 50000, fps: 60, fpsMeasured: 60, latencyP95Ms: 9, dropped_frames: 3, packet_loss: 0.1 }, t0 + 60000)
  const row = h.observe(null, t0 + 20 * 60000)
  assert.equal(row.app, 'Elden Ring'); assert.equal(row.bitrate, 45); assert.equal(row.fps, 59); assert.equal(row.p95, 9); assert.equal(row.dropped, 3); assert.equal(Math.round(row.ms / 60000), 20)
  assert.equal(h.days['2026-11-02'], 20)
  // survives a reload
  const again = createHistory(storage, 'k')
  assert.equal(again.last().app, 'Elden Ring')
  // a blip of a few seconds is not a session
  again.observe({ client_name: 'x', bitrate: 1000 }, t0 + 30 * 60000); assert.equal(again.observe(null, t0 + 30 * 60000 + 3000), null)
  assert.equal(again.sessions.length, 1)
  assert.deepEqual(createHistory({ getItem: () => '{nope' }).sessions, [])
})

test('heat days cover the last 30 days oldest first and take the larger of local and log minutes', () => {
  const now = Date.parse('2026-11-02T12:00:00')
  const days = heatDays({ '2026-11-02': 20, '2026-10-30': 5 }, now, 30, { '2026-10-30': 12, '2026-10-01': 7 })
  assert.equal(days.length, 30); assert.equal(days[29].label, '2026-11-02'); assert.equal(days[29].value, 20)
  assert.equal(days.find((d) => d.label === '2026-10-30').value, 12); assert.equal(days[0].label, '2026-10-04')
})

test('minutes per day and errors per hour come from the host log lines', () => {
  const log = ['[2026-11-02 09:00:00.000]: Info: CLIENT CONNECTED', '[2026-11-02 09:30:00.000]: Info: CLIENT DISCONNECTED', '[2026-11-02 11:10:00.000]: Error: Failed to encode', '[2026-11-02 11:20:00.000]: Warning: slow', '[2026-11-02 12:05:00.000]: Error: again', '[2026-10-20 12:05:00.000]: Error: old'].join('\n')
  assert.equal(logDays(log)['2026-11-02'], 30)
  const e = errorsByHour(log, Date.parse('2026-11-02T12:30:00'), 24)
  assert.equal(e.labels.length, 24); assert.equal(e.errors[23], 1); assert.equal(e.errors[22], 1); assert.equal(e.warnings[22], 1); assert.equal(e.total, 2)
  assert.equal(errorsByHour(null), null); assert.deepEqual(logDays(null), {})
})

test('recent applications: newest first, each once', () => {
  assert.deepEqual(recentApps([{ app: 'A', end: 1 }, { app: 'B', end: 2 }, { app: 'A', end: 3 }, { app: '', end: 4 }]).map((r) => r.app), ['A', 'B'])
})
