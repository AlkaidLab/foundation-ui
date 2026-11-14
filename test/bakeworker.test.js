import { test } from 'node:test'
import assert from 'node:assert/strict'

// a worker that answers like the real one, in the same thread
class FakeWorker {
  constructor() { FakeWorker.made += 1; this.pictures = new Map() }
  postMessage(m) {
    if (m.t === 'image') { this.pictures.set(m.key, m.bitmap); FakeWorker.pictureMessages += 1; return }
    setImmediate(() => this.onmessage({ data: this.pictures.has(m.key) ? { id: m.id, blob: { size: m.w * m.h } } : { id: m.id, error: 'picture not handed over' } }))
  }
}
FakeWorker.made = 0; FakeWorker.pictureMessages = 0
globalThis.Worker = FakeWorker
globalThis.createImageBitmap = async (image) => ({ image, close() {} })
const { bakeInWorker } = await import('../src/appearance/bakeWorker.js')

test('a picture goes to the worker once, every bake after it only sends the numbers; one worker serves all', async () => {
  const image = {}
  const a = await bakeInWorker({ key: 'p1', image, w: 10, h: 5, dx: 0, dy: 0, dw: 10, dh: 5, blur: 4 })
  const b = await bakeInWorker({ key: 'p1', image, w: 20, h: 5, dx: 0, dy: 0, dw: 20, dh: 5, blur: 4 })
  assert.deepEqual([a.size, b.size], [50, 100])
  assert.equal(FakeWorker.pictureMessages, 1)
  assert.equal(FakeWorker.made, 1)
  await bakeInWorker({ key: 'p2', image, w: 1, h: 1, dx: 0, dy: 0, dw: 1, dh: 1, blur: 1 })
  assert.equal(FakeWorker.pictureMessages, 2)
})
