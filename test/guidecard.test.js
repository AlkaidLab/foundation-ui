import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useGuideCard } from '../src/vue/useGuideCard.js'

const memory = () => { const s = {}; return { s, getItem: (k) => s[k] ?? null, setItem: (k, v) => { s[k] = v } } }
const steps = (auto = {}) => () => ['a', 'b', 'c'].map((id) => ({ id, title: id, auto: auto[id] === true }))

test('auto steps tick from data, manual ones from the person', () => {
  const g = useGuideCard('t1', steps({ a: true }), memory())
  assert.equal(g.doneCount.value, 1)
  g.toggle('b'); g.toggle('a')
  assert.deepEqual(g.steps.value.map((s) => s.done), [true, true, false])
  assert.equal(g.next.value.id, 'c')
})
test('the card disappears when every step is done and returns on reopen', () => {
  const store = memory()
  const g = useGuideCard('t2', steps({ a: true, c: true }), store)
  assert.equal(g.visible.value, true)
  g.toggle('b')
  assert.equal(g.allDone.value, true); assert.equal(g.visible.value, false)
  g.reopen(); assert.equal(g.visible.value, true)
  g.dismiss(); assert.equal(g.visible.value, false)
  assert.equal(useGuideCard('t2', steps({ a: true, c: true }), store).visible.value, false)
})
test('state survives a reload and a corrupted value is ignored', () => {
  const store = memory()
  useGuideCard('t3', steps(), store).toggle('c')
  assert.equal(useGuideCard('t3', steps(), store).steps.value[2].done, true)
  store.s['foundation-ui.guide.t4'] = '{nope'
  assert.equal(useGuideCard('t4', steps(), store).doneCount.value, 0)
  store.s['foundation-ui.guide.t5'] = JSON.stringify({ manual: { a: 'yes', b: true }, hidden: 'x' })
  const g = useGuideCard('t5', steps(), store)
  assert.deepEqual(g.steps.value.map((s) => s.done), [false, true, false]); assert.equal(g.visible.value, true)
})
test('no steps means no card', () => { assert.equal(useGuideCard('t6', () => [], memory()).visible.value, false) })
