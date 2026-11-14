import test from 'node:test'
import assert from 'node:assert/strict'
import { avatarState, pixelSize } from '../src/vue/captionAvatar.js'

test('a sprite is drawn at a whole number of device pixels per source pixel', () => {
  assert.deepEqual(pixelSize(16, 30, 1), { scale: 1, css: 16 })
  assert.deepEqual(pixelSize(16, 32, 1), { scale: 2, css: 32 })
  assert.deepEqual(pixelSize(16, 30, 2), { scale: 3, css: 24 }, 'two device pixels per CSS pixel: 48 device pixels, three per source pixel')
  assert.deepEqual(pixelSize(16, 30, 1.25), { scale: 2, css: 25.6 })
  assert.deepEqual(pixelSize(16, 30, 1.5), { scale: 2, css: 21.333 })
  for (const dpr of [1, 1.25, 1.5, 1.75, 2, 2.5, 3]) { const { scale, css } = pixelSize(16, 30, dpr); assert.equal(Number.isInteger(scale), true); assert.ok(Math.abs(css * dpr - 16 * scale) < 0.01, `dpr ${dpr}`) }
  assert.equal(pixelSize(16, 4, 1).scale, 1, 'never below one device pixel')
  assert.deepEqual(pixelSize(16, 30, 0), { scale: 1, css: 16 }); assert.deepEqual(pixelSize(16, 30, NaN), { scale: 1, css: 16 })
})
test('the avatar shows thinking before an unread answer, and nothing otherwise', () => {
  assert.equal(avatarState({ thinking: true, unread: true }), 'thinking'); assert.equal(avatarState({ unread: true }), 'answer'); assert.equal(avatarState({}), 'idle'); assert.equal(avatarState(), 'idle')
})
