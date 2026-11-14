import test from 'node:test'
import assert from 'node:assert/strict'
import { VDD_KEYS, VDD_MODES, VDD_PROTECTED, VDD_SEARCH_KEYS, vddModeOf, vddPatchForMode, vddPhysicalDisplays, vddSplit, vddStatusOf, vddSummary, SEARCH_INDEX } from '../src/settings/index.js'

test('the mode follows the display source and the keep switch', () => {
  assert.equal(vddModeOf({}), 'physical')
  assert.equal(vddModeOf({ output_name: '' }), 'physical')
  assert.equal(vddModeOf({ output_name: '\\\\.\\DISPLAY1' }), 'physical')
  assert.equal(vddModeOf({ output_name: 'ZakoHDR' }), 'ondemand')
  assert.equal(vddModeOf({ output_name: 'ZakoHDR', vdd_keep_enabled: 'disabled' }), 'ondemand')
  assert.equal(vddModeOf({ output_name: 'ZakoHDR', vdd_keep_enabled: 'enabled' }), 'persistent')
  assert.equal(vddModeOf({ output_name: 'ZakoHDR', vdd_keep_enabled: true }), 'persistent')
})

test('every mode writes exactly the keys that make it, and the tray-owned key goes the protected way', () => {
  assert.deepEqual(vddPatchForMode('ondemand'), { normal: { output_name: 'ZakoHDR' }, protected: { vdd_keep_enabled: false } })
  assert.deepEqual(vddPatchForMode('persistent'), { normal: { output_name: 'ZakoHDR' }, protected: { vdd_keep_enabled: true } })
  assert.deepEqual(vddPatchForMode('physical', {}, '\\\\.\\DISPLAY2'), { normal: { output_name: '\\\\.\\DISPLAY2' }, protected: {} })
  assert.deepEqual(vddPatchForMode('physical', {}, 'ZakoHDR'), { normal: { output_name: '' }, protected: {} })
  // a mode, applied, reads back as itself
  for (const mode of VDD_MODES) {
    const { normal, protected: tray } = vddPatchForMode(mode, {}, '')
    assert.equal(vddModeOf({ ...normal, ...tray }), mode)
  }
})

test('keys are split by who may write them', () => {
  assert.deepEqual(vddSplit({ output_name: 'ZakoHDR', vdd_keep_enabled: true, vdd_headless_create: false, vdd_reuse: 'enabled' }), {
    normal: { output_name: 'ZakoHDR', vdd_reuse: 'enabled' },
    protected: { vdd_keep_enabled: true, vdd_headless_create: false },
  })
  assert.deepEqual([...VDD_PROTECTED].sort(), ['vdd_headless_create', 'vdd_keep_enabled'])
})

test('physical displays are read from the host listing', () => {
  const config = { display_devices: [{ device_id: 'a1', data: 'DISPLAY NAME: \\\\.\\DISPLAY1\nFRIENDLY NAME: F32D80U\nDEVICE STATE: PRIMARY\nHDR STATE: ENABLED' }, { device_id: 'b2', data: '' }] }
  assert.deepEqual(vddPhysicalDisplays(config), [{ id: 'a1', name: 'F32D80U (DISPLAY1)' }, { id: 'b2', name: 'b2' }])
  assert.deepEqual(vddPhysicalDisplays({}), [])
})

test('the summary reads the options; the host status says ready and active', () => {
  const s = vddSummary({ output_name: 'ZakoHDR', vdd_reuse: 'enabled', vdd_headless_create: true, display_device_prep: 'ensure_secondary', resolution_change: 'manual' }, { ready: true, active: false })
  assert.deepEqual([s.mode, s.shared, s.headless, s.prep, s.resolution, s.refresh, s.driverReady, s.active], ['ondemand', true, true, 'ensure_secondary', 'manual', 'automatic', true, false])
  assert.equal(vddSummary({}).shared, false)
  assert.equal(vddSummary({ display_device_prep: 'nonsense' }).prep, 'no_operation')
  assert.deepEqual(vddStatusOf({ state: 'ready' }), { ready: true, active: null, text: '' })
  assert.deepEqual(vddStatusOf({ data: { installed: false, state: 'not_installed', status_text: 'x' } }), { ready: false, active: null, text: 'x' })
  assert.equal(vddStatusOf(null), null)
})

test('every key of the control is a setting the registry or the index knows', () => {
  const ids = new Set(SEARCH_INDEX.map((e) => e.id))
  for (const [key] of VDD_KEYS) assert.ok(ids.has(key) || VDD_SEARCH_KEYS.some(([k]) => k === key), key)
  assert.equal(new Set(VDD_SEARCH_KEYS.map(([k]) => k)).size, VDD_SEARCH_KEYS.length)
})
