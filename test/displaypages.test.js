import test from 'node:test'
import assert from 'node:assert/strict'
import { AUDIO_PLACES, DISPLAY_PLACES, SETTINGS_CATEGORIES, audioPlaces, displayPlaces, rowLine, rowLines } from '../src/settings/index.js'


test('DS1: 显示与视频 has the ordered display, encoder, capture, HDR, virtual display and quality places; 音频 has sound and microphone', () => {
  assert.deepEqual(DISPLAY_PLACES.map((p) => p.id), ['output', 'modes', 'hdr', 'quality', 'encoders', 'virtual', 'advanced'])
  assert.deepEqual(AUDIO_PLACES.map((p) => p.id), ['sound', 'microphone'])
  assert.deepEqual(displayPlaces('windows').map((p) => p.id), ['output', 'modes', 'hdr', 'quality', 'encoders', 'virtual', 'advanced'])
  assert.deepEqual(displayPlaces('linux').map((p) => p.id), ['output', 'modes', 'encoders', 'advanced'])
  assert.equal(audioPlaces('macos').length, 2)
  for (const p of [...DISPLAY_PLACES, ...AUDIO_PLACES]) for (const locale of ['zh', 'en']) assert.ok(rowLine(p.page, {}, locale), `${p.page} has a second line in ${locale}`)
  for (const id of ['rail:audio', 'rail:display', 'display-advanced', 'audio-output']) assert.ok(Object.keys(rowLines({ locale: 'zh' })).includes(id), id)
  assert.ok(!('config:av' in rowLines({ locale: 'zh' })), 'no row for the old tab')
  assert.ok(!('av' in SETTINGS_CATEGORIES))
  const icons = [...DISPLAY_PLACES, ...AUDIO_PLACES].map((p) => p.icon)
  assert.equal(new Set(icons).size, icons.length, 'every page has an icon of its own')
})
