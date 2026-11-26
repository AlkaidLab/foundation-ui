import test from 'node:test'
import assert from 'node:assert/strict'
import { SETTING_META, TIERS, isChanged, normalizeValue, keysOfTier, tierOf } from '../src/settings/index.js'

const CONTROLS = new Set(['switch', 'seg', 'cards', 'sheet', 'slider', 'range', 'chips', 'field', 'path', 'list', 'page', 'custom'])

test('tiers are 1 to 3 and the three tiers are all used', () => {
  for (const [key, meta] of Object.entries(SETTING_META)) {
    assert.ok([1, 2, 3].includes(meta.tier), `${key}: tier`)
    assert.ok(CONTROLS.has(meta.control), `${key}: control ${meta.control}`)
  }
  assert.ok(keysOfTier(TIERS.COMMON).length >= 8)
  assert.ok(keysOfTier(TIERS.NORMAL).length >= 20)
  assert.ok(keysOfTier(TIERS.EXPERT).length >= 60)
})

test('a slider has a usable range or named steps, and its default lies on it', () => {
  for (const [key, meta] of Object.entries(SETTING_META)) {
    if (meta.control !== 'slider') continue
    if (meta.steps) {
      assert.ok(meta.steps.length >= 2, `${key}: steps`)
      assert.ok(meta.steps.some((s) => String(s) === String(meta.def)), `${key}: default is one of the steps`)
    } else {
      assert.ok(meta.min < meta.max, `${key}: range`)
      assert.ok(meta.step > 0, `${key}: step`)
      const def = meta.off !== undefined && meta.def === meta.off ? meta.min : meta.def
      assert.ok(def >= meta.min && def <= meta.max, `${key}: default ${meta.def} in ${meta.min}..${meta.max}`)
    }
  }
})

test('a switch default is a boolean; a risky setting says how risky', () => {
  for (const [key, meta] of Object.entries(SETTING_META)) {
    if (meta.control === 'switch') assert.equal(typeof meta.def, 'boolean', `${key}: switch default`)
    if (meta.risk) assert.ok(['medium', 'high', 'critical'].includes(meta.risk), `${key}: risk`)
  }
})

test('isChanged compares as text and treats the unset key as the default', () => {
  assert.equal(normalizeValue('enabled'), normalizeValue(true))
  assert.equal(isChanged('key_repeat_delay', undefined), false)
  assert.equal(isChanged('key_repeat_delay', '500'), false)
  assert.equal(isChanged('key_repeat_delay', 800), true)
  assert.equal(isChanged('upnp', 'disabled'), false)
  assert.equal(isChanged('upnp', 'enabled'), true)
  assert.equal(isChanged('system_tray', true), false)
  assert.equal(isChanged('system_tray', false), true)
  assert.equal(isChanged('sunshine_name', 'Skyward'), false) // a name is the person's own, never "changed"
  assert.equal(isChanged('port', '57989'), true)
  assert.equal(isChanged('sunshine_name', ''), false)
  assert.equal(isChanged('global_prep_cmd', [{ do: 'x' }]), false)
  assert.equal(tierOf('gamepad'), 1)
  assert.equal(tierOf('nope'), 0)
})

test('NVENC defaults match the host defaults and are not reported as changed', () => {
  assert.equal(SETTING_META.nvenc_preset.def, 4)
  assert.equal(SETTING_META.nvenc_spatial_aq.def, true)

  assert.equal(isChanged('nvenc_preset', undefined), false)
  assert.equal(isChanged('nvenc_preset', 4), false)
  assert.equal(isChanged('nvenc_preset', 1), true)

  assert.equal(isChanged('nvenc_spatial_aq', undefined), false)
  assert.equal(isChanged('nvenc_spatial_aq', true), false)
  assert.equal(isChanged('nvenc_spatial_aq', 'enabled'), false)
  assert.equal(isChanged('nvenc_spatial_aq', false), true)
  assert.equal(isChanged('nvenc_spatial_aq', 'disabled'), true)
})
