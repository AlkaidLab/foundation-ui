import test from 'node:test'
import assert from 'node:assert/strict'
import { shallowRef } from 'vue'
import { createJumpHistory, backVariant, showsButton, showsChip } from '../src/nav/jumpHistory.js'

// a navigation of two fields: the place is set by the product (a jump), by the person (manual) or by the system (popstate)
function world() {
  const at = shallowRef({ id: 'home', rail: 'overview' })
  const go = (id, params, rail = id) => { at.value = { id, params, rail } }
  const h = createJumpHistory({ locate: () => at.value, restore: (p) => go(p.id, p.params, p.rail), ephemeral: ['stamp'] })
  h.attach(at)
  return { at, go, h, ids: () => h.stack.value.map((p) => p.id) }
}

test('a cross-area jump pushes the place it left; back returns and takes it off', () => {
  const { at, go, h, ids } = world()
  go('doctor'); h.clear()
  h.jump(() => go('config', { tab: 'network' }, 'config'))
  assert.deepEqual(ids(), ['doctor']); assert.equal(h.canBack.value, true); assert.equal(h.top.value.id, 'doctor')
  assert.equal(h.back(), true)
  assert.equal(at.value.id, 'doctor'); assert.equal(h.canBack.value, false)
  assert.equal(h.back(), false, 'nothing left to go back to')
})
test('the home tile → settings → back scenario', () => {
  const { at, go, h } = world()
  h.jump(() => go('config', { tab: 'general' }, 'config'))
  assert.equal(h.top.value.id, 'home')
  h.back()
  assert.equal(at.value.id, 'home')
})
test('dedupe: a jump that goes nowhere pushes nothing; going to a place that is in the stack takes the stack down to it', () => {
  const { at, go, h, ids } = world()
  h.jump(() => go('home', undefined, 'overview'))
  assert.deepEqual(ids(), [])
  h.jump(() => go('doctor')); h.jump(() => go('config', { tab: 'network' }, 'config'))
  assert.deepEqual(ids(), ['home', 'doctor'])
  h.jump(() => go('doctor'))
  assert.deepEqual(ids(), ['home'], 'doctor → config → doctor is not a loop of three')
  assert.equal(at.value.id, 'doctor')
  h.jump(() => go('config', { tab: 'network' }, 'config'))
  h.jump(() => go('config', { tab: 'network' }, 'config'))
  assert.deepEqual(ids(), ['home', 'doctor'], 'the same place twice in a row is once')
})
test('the stack keeps at most max places and the newest', () => {
  const at = shallowRef({ id: 'p0' })
  const h = createJumpHistory({ locate: () => at.value, restore() {}, max: 3 })
  h.attach(at)
  for (let i = 1; i <= 6; i++) h.jump(() => { at.value = { id: `p${i}` } })
  assert.deepEqual(h.stack.value.map((p) => p.id), ['p3', 'p4', 'p5'])
})
test('a move of the person resets the stack', () => {
  const { go, h, ids } = world()
  h.jump(() => go('doctor')); h.jump(() => go('config', { tab: 'network' }, 'config'))
  assert.deepEqual(ids(), ['home', 'doctor'])
  go('apps') // the rail, a row of a list
  assert.deepEqual(ids(), [])
  assert.equal(h.canBack.value, false)
})
test('a move that only changes an ephemeral stamp is the same place', () => {
  const { go, h, ids } = world()
  go('doctor', { stamp: 1 }); h.clear()
  h.jump(() => go('config', { tab: 'network' }, 'config'))
  assert.deepEqual(h.stack.value[0].params, undefined, 'the stamp is not remembered')
  h.back()
  h.jump(() => go('doctor', { stamp: 2 })) // same place with a new stamp is not a jump
  assert.deepEqual(ids(), [])

})
test('params that are not ephemeral are part of the place (a health check keeps its token and finds its result)', () => {
  const at = shallowRef({ id: 'doctor', params: { autostart: 1 } })
  const h = createJumpHistory({ locate: () => at.value, restore: (p) => { at.value = p } })
  h.attach(at)
  h.jump(() => { at.value = { id: 'config', params: { tab: 'network' } } })
  assert.deepEqual(h.top.value.params, { autostart: 1 })
  h.back()
  assert.deepEqual(at.value.params, { autostart: 1 })
})
test('a move inside the page (another tab of the settings) pushes nothing and clears nothing', () => {
  const { go, h, ids } = world()
  h.jump(() => go('config', { tab: 'network' }, 'config'))
  assert.deepEqual(ids(), ['home'])
  h.jump(() => go('config', { tab: 'audio' }, 'config')) // a tab click goes through the page's opener
  assert.deepEqual(ids(), ['home'], 'not a jump')
  go('config', { tab: 'files' }, 'config') // and by the person
  assert.deepEqual(ids(), ['home'], 'the chip stays while the person is on the page they were sent to')
  go('apps')
  assert.deepEqual(ids(), [])
})
test('the system back that leads to the place on top is the same step as back', () => {
  const { at, go, h, ids } = world()
  h.jump(() => go('doctor')); h.jump(() => go('config', { tab: 'network' }, 'config'))
  go('doctor') // popstate: the window's history brought the place before
  assert.deepEqual(ids(), ['home'])
  assert.equal(at.value.id, 'doctor')
  go('somewhere-else')
  assert.deepEqual(ids(), [], 'while any other place resets')
})
test('back does not count as a move of the person, and nested jumps are one jump', () => {
  const { go, h, ids } = world()
  h.jump(() => { go('doctor'); h.jump(() => go('config', { tab: 'network' }, 'config')) })
  assert.deepEqual(ids(), ['home'], 'the place before the outer jump, once')
  h.back()
  assert.deepEqual(ids(), [])
})
test('a restore that fails to leave the place still takes the entry off', () => {
  const at = shallowRef({ id: 'a' })
  const h = createJumpHistory({ locate: () => at.value, restore() { /* the place cannot be opened */ } })
  h.attach(at)
  h.jump(() => { at.value = { id: 'b' } })
  assert.equal(h.back(), true); assert.equal(h.canBack.value, false)
})
test('the variant: the address first, then the stored choice, then A', () => {
  const store = (v) => ({ getItem: () => v })
  assert.equal(backVariant(), 'B')
  assert.equal(backVariant({ search: '?back=A' }), 'B')
  assert.deepEqual(['A', 'B', 'C'].map((v) => [showsButton(v), showsChip(v)]), [[true, false], [false, true], [true, true]])
})
