import assert from 'node:assert/strict'
import test from 'node:test'
import { coerceLike, saveSettingKey } from '../src/settings/save.js'

test('one key is changed and the whole configuration is written back, in the type the host keeps', async () => {
  const sent = []
  const api = { getJson: async () => ({ encoder: '', max_bitrate: 0, sunshine_name: 'Host' }), postJson: async (path, body) => { sent.push([path, body]); return { status: true } } }
  const r = await saveSettingKey(api, 'max_bitrate', '50000')
  assert.equal(r.ok, true)
  assert.deepEqual(sent, [['/api/config', { encoder: '', max_bitrate: 50000, sunshine_name: 'Host' }]])
  assert.equal((await saveSettingKey(api, 'encoder', 'nvenc')).config.encoder, 'nvenc')
})

test('a failed read or write is reported and nothing is claimed saved', async () => {
  assert.deepEqual(await saveSettingKey({ getJson: async () => { throw new Error('x') }, postJson: async () => ({}) }, 'a', 1), { ok: false, error: 'read' })
  assert.equal((await saveSettingKey({ getJson: async () => null, postJson: async () => ({}) }, 'a', 1)).ok, false)
  const w = await saveSettingKey({ getJson: async () => ({ a: 1 }), postJson: async () => ({ status: false, error: 'nope' }) }, 'a', 2)
  assert.equal(w.ok, false); assert.equal(w.error, 'nope'); assert.deepEqual(w.config, { a: 1 })
  assert.equal((await saveSettingKey({ getJson: async () => ({}), postJson: async () => { throw new Error('net') } }, 'a', 2)).error, 'write')
})

test('values keep the host type', () => {
  assert.equal(coerceLike(0, '20000'), 20000); assert.equal(coerceLike('', 'nvenc'), 'nvenc'); assert.equal(coerceLike(true, 'false'), false); assert.equal(coerceLike(5, 'abc'), 'abc')
})
