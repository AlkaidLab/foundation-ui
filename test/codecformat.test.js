import test from 'node:test'
import assert from 'node:assert/strict'
import { FORMATS, formatOf, hdrOf, modesFor } from '../src/settings/index.js'

test('the video format is the two codec modes seen as one choice: every pair of modes is one format, and a format writes a pair that reads back as itself', () => {
  assert.deepEqual(FORMATS, ['auto', 'h264', 'hevc', 'av1'])
  for (const hevc of [0, 1, 2, 3]) for (const av1 of [0, 1, 2, 3]) assert.ok(FORMATS.includes(formatOf({ hevc_mode: hevc, av1_mode: av1 })), `${hevc}/${av1}`)
  for (const format of FORMATS) for (const hdr of [false, true]) {
    const modes = modesFor(format, hdr)
    assert.equal(formatOf(modes), format, `${format} reads back`)
    assert.equal(hdrOf(modes), format === 'h264' ? false : hdr, `${format} keeps the HDR flag ${hdr}`)
  }
  assert.deepEqual(modesFor('auto', false), { hevc_mode: 0, av1_mode: 0 })
  assert.deepEqual(modesFor('h264', true), { hevc_mode: 1, av1_mode: 1 })
  assert.equal(formatOf({ hevc_mode: 2, av1_mode: 3 }), 'auto')
  assert.equal(formatOf({}), 'auto')
})
