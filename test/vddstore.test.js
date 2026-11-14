import test from 'node:test'
import assert from 'node:assert/strict'
import { reactive } from 'vue'
import { createHttpVddAdapter, createVddStore } from '../src/vue/useVddStore.js'

const adapterOf = (initial, extra = {}) => {
  const config = reactive({ ...initial })
  const calls = []
  return { config, calls, adapter: { read: () => config, write: (patch) => Object.assign(config, patch), commit: async (keys) => { calls.push(['commit', keys]) }, ...extra } }
}

test('choosing a mode writes the display source and, where the product can, the tray-owned keep key', async () => {
  const tray = []
  const { config, adapter } = adapterOf({ output_name: '' }, { setProtected: async (key, on) => { tray.push([key, on]) } })
  const store = createVddStore(adapter)
  assert.equal(store.mode.value, 'physical')
  await store.setMode('persistent')
  assert.equal(config.output_name, 'ZakoHDR')
  assert.deepEqual(tray, [['vdd_keep_enabled', true]])
  assert.equal(store.mode.value, 'persistent')
  await store.setMode('ondemand')
  assert.equal(store.mode.value, 'ondemand')
  assert.deepEqual(tray.at(-1), ['vdd_keep_enabled', false])
})

test('going back to the physical display remembers the display the person had', async () => {
  const { config, adapter } = adapterOf({ output_name: '\\\\.\\DISPLAY2' }, { setProtected: async () => {} })
  const store = createVddStore(adapter)
  await store.setMode('ondemand')
  assert.equal(config.output_name, 'ZakoHDR')
  await store.setMode('physical')
  assert.equal(config.output_name, '\\\\.\\DISPLAY2')
})

test('without a writer for tray-owned keys the persistent mode is listed but cannot be chosen, and nothing tray-owned is written', async () => {
  const { config, adapter } = adapterOf({ output_name: '' })
  const store = createVddStore(adapter)
  assert.equal(store.canSaveProtected, false)
  assert.deepEqual(store.modes.value.map((m) => [m.id, m.disabled]), [['physical', false], ['ondemand', false], ['persistent', true]])
  await store.setMode('ondemand')
  assert.equal(config.output_name, 'ZakoHDR')
  assert.equal(config.vdd_keep_enabled, undefined)
})

test('a failed tray write is rolled back and reported', async () => {
  const { config, adapter } = adapterOf({ output_name: 'ZakoHDR', vdd_keep_enabled: 'disabled' }, { setProtected: async () => { throw new Error('driver not ready') } })
  const store = createVddStore(adapter)
  await store.set({ vdd_keep_enabled: true })
  assert.equal(config.vdd_keep_enabled, 'disabled')
  assert.equal(store.error.value, 'driver not ready')
  assert.equal(store.busy.vdd_keep_enabled, false)
})

test('a card saves at once and a failed save puts the old values back; the settings page leaves saving to its own bar', async () => {
  const { calls, adapter } = adapterOf({ vdd_reuse: 'disabled' })
  const store = createVddStore(adapter)
  await store.set({ vdd_reuse: 'enabled' })
  assert.deepEqual(calls, [])
  await store.set({ vdd_reuse: 'disabled' }, { save: true })
  assert.deepEqual(calls, [['commit', ['vdd_reuse']]])
  const failing = adapterOf({ vdd_reuse: 'disabled' })
  failing.adapter.commit = async () => { throw new Error('save failed') }
  const s2 = createVddStore(failing.adapter, { autosave: true })
  await s2.set({ vdd_reuse: 'enabled' })
  assert.equal(failing.config.vdd_reuse, 'disabled')
  assert.equal(s2.error.value, 'save failed')
})

test('the HTTP adapter reads the host configuration fresh and posts it back with the changed keys', async () => {
  const sent = []
  const host = { output_name: '', port: 47989 }
  const fetchJson = async (path, init) => {
    if (init?.method === 'POST') { sent.push(JSON.parse(init.body)); return { status: true } }
    return { ...host }
  }
  const adapter = createHttpVddAdapter({ fetchJson, setProtected: async () => {} })
  await adapter.load()
  const store = createVddStore(adapter, { autosave: true })
  await store.setMode('ondemand')
  assert.equal(sent.length, 1)
  assert.equal(sent[0].output_name, 'ZakoHDR')
  assert.equal(sent[0].port, 47989)
})

test('the status of the host is kept for the control to show', async () => {
  const { adapter } = adapterOf({ output_name: 'ZakoHDR' }, { status: async () => ({ ready: true, active: true }) })
  const store = createVddStore(adapter)
  await store.refresh()
  assert.equal(store.summary.value.driverReady, true)
  assert.equal(store.summary.value.active, true)
})

test('a tray-owned key is handed to the product as a real boolean, whatever form the control wrote', async () => {
  const seen = []
  const { config, adapter } = adapterOf({}, { setProtected: async (key, on) => { seen.push([key, on]) } })
  const store = createVddStore(adapter)
  await store.set({ vdd_headless_create: 'enabled' })
  await store.set({ vdd_headless_create: 'disabled' })
  assert.deepEqual(seen, [['vdd_headless_create', true], ['vdd_headless_create', false]])
  assert.equal(config.vdd_headless_create, 'disabled')
})
