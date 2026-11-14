import test from 'node:test'
import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { useTiles } from '../src/vue/useTiles.js'

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m } }
const catalogue = [
  { id: 'a', title: 'A', icon: 'home', sizes: ['1x1', '2x1'], size: '1x1' },
  { id: 'b', title: 'B', icon: 'home', sizes: ['1x1', '2x1', '2x2'], size: '2x1' },
  { id: 'c', title: 'C', icon: 'home', sizes: ['1x1'], size: '1x1' },
]

test('tile layout persists per storage key and restores in the saved order and size', async () => {
  globalThis.localStorage = memory()
  const first = useTiles('t-persist', catalogue, ['a', 'b'])
  first.move('b', -1)
  first.resize('a')
  first.add('c')
  await nextTick()
  const again = useTiles('t-persist', catalogue, ['a', 'b'])
  assert.deepEqual(again.tiles.value, [{ id: 'b', size: '2x1' }, { id: 'a', size: '2x1' }, { id: 'c', size: '1x1' }])
  assert.deepEqual(again.available.value, [])
})

test('reset returns to the defaults and the storage follows', async () => {
  globalThis.localStorage = memory()
  const store = useTiles('t-reset', catalogue, ['a', { id: 'b', size: '2x2' }])
  store.remove('a')
  store.reset()
  await nextTick()
  assert.deepEqual(store.tiles.value, [{ id: 'a', size: '1x1' }, { id: 'b', size: '2x2' }])
  assert.deepEqual(JSON.parse(localStorage.getItem('foundation-ui.tiles.t-reset')), store.tiles.value)
})

test('saved tiles that left the catalogue are dropped and a size that is no longer allowed falls back', async () => {
  globalThis.localStorage = memory()
  localStorage.setItem('foundation-ui.tiles.t-stale', JSON.stringify([{ id: 'gone', size: '1x1' }, { id: 'c', size: '2x2' }]))
  const store = useTiles('t-stale', catalogue, ['a'])
  assert.deepEqual(store.tiles.value, [{ id: 'c', size: '1x1' }])
  assert.deepEqual(store.available.value.map((t) => t.id), ['a', 'b'])
})

test('add ignores ids that are unknown or already placed; resize cycles the allowed sizes', () => {
  globalThis.localStorage = memory()
  const store = useTiles('t-add', catalogue, ['b'])
  store.add('b'); store.add('zzz')
  assert.equal(store.tiles.value.length, 1)
  store.resize('b'); assert.equal(store.tiles.value[0].size, '2x2')
  store.resize('b'); assert.equal(store.tiles.value[0].size, '1x1')
})

test('moveBefore reorders for drag and drop', () => {
  globalThis.localStorage = memory()
  const store = useTiles('t-drag', catalogue, ['a', 'b', 'c'])
  store.moveBefore('c', 'a')
  assert.deepEqual(store.tiles.value.map((t) => t.id), ['c', 'a', 'b'])
})
