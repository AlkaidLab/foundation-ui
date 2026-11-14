import test from 'node:test'
import assert from 'node:assert/strict'
import { useDashLayout, LAYOUT_VERSION } from '../src/vue/useDashLayout.js'
import { DEFAULT_ORDER } from '../src/vue/homeCards.js'

const store = (value) => { const m = new Map(value === undefined ? [] : [['foundation-ui.dash2.k', JSON.stringify(value)]]); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), dump: () => JSON.parse(m.get('foundation-ui.dash2.k') || 'null') } }
const load = (saved) => { const storage = store(saved); const layout = useDashLayout('k', storage); return { layout, storage, state: layout.state } }
const ALWAYS = DEFAULT_ORDER.filter((id) => ['hero', 'vdd', 'encoder', 'display', 'memory', 'devices', 'quick', 'gamepad-type', 'sw:mic'].includes(id))

test('a layout never changed by the person returns to the smart default (builds up to 2026.1103.16:11 saved the defaults they showed)', () => {
  // an old build saved its defaults as choices: every always-on card shown, the errors chart tile shown, an old XL on the host card
  for (const saved of [
    { v: 5, order: [...DEFAULT_ORDER], overrides: {}, sizes: {} },
    { v: 6, order: [...DEFAULT_ORDER], overrides: Object.fromEntries(ALWAYS.map((id) => [id, true])), sizes: {} },
    { v: 7, mode: 'manual', order: [...DEFAULT_ORDER], overrides: { ...Object.fromEntries(ALWAYS.map((id) => [id, true])), errors: true }, sizes: { hero: 'm' } },
  ]) {
    const { state, storage } = load(saved)
    assert.equal(state.mode, 'smart', JSON.stringify(saved).slice(0, 60))
    assert.deepEqual([state.overrides, state.sizes], [{}, {}])
    assert.deepEqual(state.order, [...DEFAULT_ORDER])
    assert.equal(storage.dump().v, LAYOUT_VERSION) // written back once, so the migration does not run again
  }
})

test('a layout the person changed keeps their tiles, drops the 错误 tile they did not add, and maps every old size onto the standard', () => {
  const saved = { v: 7, mode: 'manual', order: ['pair', ...DEFAULT_ORDER.filter((id) => id !== 'pair')], overrides: { hero: false, errors: true, cpu: true }, sizes: { cpu: 'xl', vdd: 'l' } }
  const { state } = load(saved)
  assert.equal(state.mode, 'manual')
  assert.equal(state.overrides.hero, false) // the person hid the host card
  assert.equal(state.overrides.cpu, true)
  assert.equal('errors' in state.overrides, false) // not added by them: dropped
  assert.deepEqual(state.sizes, { cpu: 'l', vdd: 'l' }) // XL (8x2) is not a legacy size to keep
  assert.equal(state.order[0], 'pair')
})

test('the 错误 tile stays when the person made it theirs (they resized it) and for a layout saved at version 8 or later', () => {
  const own = load({ v: 7, mode: 'manual', order: [...DEFAULT_ORDER], overrides: { errors: true, hero: false }, sizes: { errors: 'm' } })
  assert.equal(own.state.overrides.errors, true); assert.equal(own.state.sizes.errors, 'm')
  const now = load({ v: 8, mode: 'manual', order: [...DEFAULT_ORDER], overrides: { errors: true }, sizes: { errors: 'xl' } })
  assert.equal(now.state.overrides.errors, true); assert.equal(now.state.sizes.errors, 'xl'); assert.equal(now.state.mode, 'manual') // untouched by the migration
})

test('pins and a reordered list count as the person\'s work', () => {
  const pin = { 'pin:setting:k': { type: 'setting', key: 'k', title: 'K', icon: 'tune', control: 'switch', on: 'on', off: 'off', def: 'off' } }
  assert.equal(load({ v: 6, order: [...DEFAULT_ORDER], overrides: {}, sizes: {}, pins: pin }).state.mode, 'manual')
  const swapped = [...DEFAULT_ORDER]; [swapped[4], swapped[5]] = [swapped[5], swapped[4]]
  assert.equal(load({ v: 6, order: swapped, overrides: {}, sizes: {} }).state.mode, 'manual')
})

test('nothing saved: the smart default', () => assert.equal(load(undefined).state.mode, 'smart'))
