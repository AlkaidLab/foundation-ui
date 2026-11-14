import assert from 'node:assert/strict'
import test from 'node:test'
import { clientFamilyLabel, isPlaceholderName, sessionClientLabel } from '../src/vue/clientLabel.js'
import { buildCatalogue } from '../src/vue/homeCatalogue.js'
import { homeTexts } from '../src/vue/homeModel.js'
import { createHistory } from '../src/vue/homeHistory.js'
import { normalizeSessions, sessionLine } from '../src/vue/guideModel.js'

const T = homeTexts('en')
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }
// what the host answered for the team's session of 2026-11-04 (macOS Enhanced, paired without a name): a placeholder name, the family from the User-Agent
const OWNER = { client_name: 'unknown', client_uuid: 'DF3B4175-1500-4553-807C-59B443B20315', client_family: 'moonlight-macos-enhanced', client_official: true, client_os: 'macos', client_version: '9021', client_address: '192.168.7.220', app_name: 'Desktop', width: 1920, height: 1080, fps: 100 }

test('a name that names a device is shown as it is, whatever the family', () => {
  assert.equal(sessionClientLabel({ ...OWNER, client_name: 'Atlas-Pro.local' }), 'Atlas-Pro.local')
  assert.equal(sessionClientLabel({ client_name: '  Living room  ' }), 'Living room')
})

test('a placeholder name falls back to the family the host derived', () => {
  for (const name of ['unknown', 'UNKNOWN', 'Named Zako', 'roth', '', '  ', undefined, null]) assert.equal(sessionClientLabel({ ...OWNER, client_name: name }), 'Moonlight macOS Enhanced', String(name))
  assert.equal(sessionClientLabel({ client_name: 'unknown', client_family: 'voidlink' }), 'VoidLink')
  assert.equal(sessionClientLabel({ client_name: 'Named Zako', client_family: 'moonlight-vplus-android' }), 'Moonlight V+ Android')
  assert.equal(sessionClientLabel({ client_name: 'unknown', client_family: 'moonlight-vplus-desktop' }), 'Moonlight V+ Desktop')
})

test('upstream Moonlight names its system when the host knows it', () => {
  assert.equal(clientFamilyLabel({ family: 'moonlight-upstream', os: 'windows' }), 'Moonlight · Windows')
  assert.equal(clientFamilyLabel({ family: 'moonlight-upstream', os: 'ios' }), 'Moonlight · iPhone / iPad')
  assert.equal(clientFamilyLabel({ family: 'moonlight-upstream', os: null }), 'Moonlight')
  assert.equal(clientFamilyLabel({ family: 'moonlight-macos-enhanced', os: 'macos' }), 'Moonlight macOS Enhanced')
})

test('no name and no family is an empty label, never the word "unknown" and never a guess', () => {
  assert.equal(sessionClientLabel({ client_name: 'unknown' }), '')
  assert.equal(sessionClientLabel({ client_name: 'unknown', client_family: 'unknown' }), '')
  assert.equal(sessionClientLabel({ client_name: 'unknown', client_family: 'something-new' }), '')
  assert.equal(sessionClientLabel(null), ''); assert.equal(sessionClientLabel(undefined), ''); assert.equal(sessionClientLabel('x'), '')
  assert.equal(isPlaceholderName('Skyward'), false); assert.equal(isPlaceholderName(' Named Zako '), true)
})

test('an older host that sends no family keeps showing a real name and hides a placeholder', () => {
  assert.equal(sessionClientLabel({ client_name: 'Pixel 9' }), 'Pixel 9')
  assert.equal(sessionClientLabel({ client_name: 'unknown' }), '')
})

test('the overview tiles of the team session name the client, not "unknown"', () => {
  const { data } = buildCatalogue({ now: Date.parse('2026-11-04T10:00:00'), session: OWNER }, T)
  assert.equal(data['stream-client'].rows[0].title, 'Moonlight macOS Enhanced'); assert.equal(data['stream-client'].rows[0].value, '192.168.7.220')
  const now = data['current-app'].rows
  assert.equal(now[0].value, 'Moonlight macOS Enhanced'); assert.equal(now[1].value, '1920×1080 · 100 fps') // the frame rate has its unit (「120」 alone)
  assert.ok(!JSON.stringify(data).includes('unknown'))
})

test('a session without a name or a family shows its address instead of "unknown"', () => {
  const { data } = buildCatalogue({ now: Date.parse('2026-11-04T10:00:00'), session: { client_name: 'unknown', client_address: '10.0.0.7', width: 1280, height: 720, fps: 60 } }, T)
  assert.equal(data['stream-client'].rows[0].title, '10.0.0.7'); assert.equal(data['stream-client'].rows[0].value, '')
  assert.equal(data['current-app'].rows.some((r) => r.value === 'unknown'), false)
})

test('the guide line and the history of finished sessions use the same label', () => {
  const sessions = normalizeSessions({ sessions: [OWNER] })
  assert.equal(sessionLine(sessions[0]), 'Moonlight macOS Enhanced · 1920×1080 @ 100')
  const h = createHistory(memory(), 'k')
  h.observe({ ...OWNER, bitrate: 20000 }, 0); h.observe({ ...OWNER, bitrate: 20000 }, 12000); h.observe(null, 20000)
  assert.equal(h.sessions[0].client, 'Moonlight macOS Enhanced')
})
