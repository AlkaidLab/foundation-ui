import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readPicturePalette, versionOf, shortAddress } from '../src/appearance/pictureRead.js'
import { imageStats } from '../src/appearance/pictureStats.js'

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), raw: m } }
const response = (tag, ok = true) => ({ ok, headers: new Map([['last-modified', tag]]), blob: async () => ({ size: 9 }), body: { cancel() {} } })

test('the version is the address and the modification time', () => {
  assert.equal(versionOf('a.jpg', new Map([['last-modified', 'T1']])), 'a.jpg|T1')
  assert.equal(versionOf('a.jpg', new Map([['etag', 'E']])), 'a.jpg|E')
})

test('a picture is decoded and analysed once per modification time, then served from memory and from storage', async () => {
  const win = { localStorage: store() }
  let analysed = 0
  const analyse = async () => { analysed += 1; return { stats: { mean: 0.4 }, seed: '#112233' } }
  const deps = (tag) => ({ win, analyse, fetchImpl: async () => response(tag) })
  const first = await readPicturePalette('/w/a.jpg', deps('T1'))
  const again = await readPicturePalette('/w/a.jpg', deps('T1'))
  assert.deepEqual(first, again)
  assert.equal(analysed, 1)
  await readPicturePalette('/w/a.jpg', deps('T2')) // the file changed
  assert.equal(analysed, 2)
  assert.ok(JSON.parse(win.localStorage.getItem('m-picture-read-v2'))['/w/a.jpg|T1'])
})

test('a picture that cannot be fetched rejects, so that the caller shows it unread', async () => {
  const win = { localStorage: store() }
  await assert.rejects(readPicturePalette('/w/missing.jpg', { win, fetchImpl: async () => response('x', false) }), /load/)
  await assert.rejects(readPicturePalette('/w/cors.jpg', { win, fetchImpl: async () => { throw new TypeError('Failed to fetch') } }), /Failed to fetch/)
})

test('the statistics of a flat grey picture', () => {
  const px = new Uint8ClampedArray(4 * 4).fill(128)
  const s = imageStats(px, 2, 2)
  assert.ok(Math.abs(s.mean - 0.2158) < 0.001 && s.busy === 0)
})

test('a long address is kept short, and a file without a modification time is told by its size', async () => {
  const data = 'data:image/jpeg;base64,' + 'A'.repeat(50000)
  assert.ok(shortAddress(data).length < 100)
  assert.notEqual(shortAddress(data), shortAddress(data + 'B'))
  assert.equal(shortAddress('/a.jpg'), '/a.jpg')
  const win = { localStorage: store() }
  let analysed = 0
  const analyse = async () => { analysed += 1; return { stats: {}, seed: '#000000' } }
  const bare = (size) => async () => ({ ok: true, headers: new Map(), blob: async () => ({ size }), body: { cancel() {} } })
  await readPicturePalette('/a.webp', { win, analyse, fetchImpl: bare(10) })
  await readPicturePalette('/a.webp', { win, analyse, fetchImpl: bare(10) })
  assert.equal(analysed, 1)
  await readPicturePalette('/a.webp', { win, analyse, fetchImpl: bare(11) }) // another file under the same address
  assert.equal(analysed, 2)
})
