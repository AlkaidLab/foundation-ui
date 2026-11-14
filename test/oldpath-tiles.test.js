// Round 44: the tiles that were drawn by the old widget (MDashWidget) have designs of their own; so have the pinned settings.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

const dir = new URL('../src/vue/tiles/', import.meta.url)
const designed = new Set()
for (const f of readdirSync(dir).filter((n) => /^Tile.*\.vue$/.test(n))) {
  const m = /export const tileIds = \[([^\]]*)\]/.exec(readFileSync(new URL(f, dir), 'utf8'))
  if (m) for (const id of m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)) designed.add(id)
}

test('latency, session-time, budget, audio-out, reach, ctl-bitrate, stream-vdd and display have a design', () => {
  for (const id of ['latency', 'session-time', 'budget', 'audio-out', 'reach', 'ctl-bitrate', 'stream-vdd', 'display']) assert.ok(designed.has(id), `${id} has a design`)
})

test('the pinned settings (pin:*) have a design for all four kinds', () => {
  assert.ok(designed.has('pin:*'))
  const pin = readFileSync(new URL('TilePin.vue', dir), 'utf8')
  for (const kind of ["'pin-switch'", "'pin-slider'", "'control'"]) assert.ok(pin.includes(kind), kind)
  // a risky pin asks first, and a failed save puts the value back
  assert.match(pin, /d\.confirm/); assert.match(pin, /failed: \(\)/)
})
