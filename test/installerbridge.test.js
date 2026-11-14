import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMockBridge, createTauriBridge, COMPONENT_IDS, PROGRESS_GROUPS, emptyView } from '../src/vue/installer/bridge.js'

const drain = (b) => { let n = 0; while (b.step()) n++; return n }

test('fresh install runs through uac, installing, done', async () => {
  const b = createMockBridge({ speed: 0 })
  const pages = []
  b.subscribe((v) => pages.push(v.page))
  assert.equal(b.state().page, 'welcome')
  await b.send({ type: 'install' })
  assert.equal(b.state().page, 'uac')
  assert.ok(drain(b) > 5)
  const v = b.state()
  assert.equal(v.page, 'done')
  assert.equal(v.restart, 'none')
  assert.ok(pages.includes('installing'))
  assert.deepEqual(v.progress.groups.map((g) => g.state), ['done', 'done', 'done', 'done'])
})

test('components: toggle, select-all, back to maintenance', async () => {
  const b = createMockBridge({ speed: 0, scenario: 'upgrade' })
  assert.equal(b.state().page, 'maintenance')
  assert.equal(b.state().components.usbip, false)
  await b.send({ type: 'customize' })
  await b.send({ type: 'toggle-component', id: 'usbip' })
  assert.equal(b.state().components.usbip, true)
  assert.equal(b.state().allSelected, true)
  await b.send({ type: 'select-all' })
  assert.ok(COMPONENT_IDS.every((id) => !b.state().components[id]))
  await b.send({ type: 'toggle-component', id: 'nope' })
  await b.send({ type: 'back' })
  assert.equal(b.state().page, 'maintenance')
})

test('failures and reboot', async () => {
  for (const [scenario, page, failure] of [['fail-driver', 'failed', 'driver'], ['fail-service', 'failed', 'service'], ['needs-reboot', 'done', null]]) {
    const b = createMockBridge({ speed: 0, scenario })
    await b.send({ type: 'install' })
    drain(b)
    assert.equal(b.state().page, page, scenario)
    assert.equal(b.state().failure, failure)
  }
  const r = createMockBridge({ speed: 0, scenario: 'needs-reboot' })
  await r.send({ type: 'install' }); drain(r)
  assert.equal(r.state().restart, 'optional')
})

test('uac cancel returns to welcome with a note; guide flag on upgrade', async () => {
  const b = createMockBridge({ speed: 0, scenario: 'uac-cancel' })
  await b.send({ type: 'install' }); drain(b)
  assert.equal(b.state().page, 'welcome')
  assert.equal(b.state().uacCancelled, true)
  assert.equal(createMockBridge({ speed: 0, scenario: 'upgrade-guide-done' }).state().guidePending, false)
  assert.equal(createMockBridge({ speed: 0 }).state().guidePending, true)
})

test('gallery page jump', () => {
  for (const page of ['components', 'installing', 'done', 'failed', 'uac']) assert.equal(createMockBridge({ speed: 0, page }).state().page, page)
  assert.equal(createMockBridge({ speed: 0, page: 'failed' }).state().failure, 'generic')
})

test('tauri bridge drops stale snapshots and validates actions', async () => {
  let push
  const calls = []
  const v1 = { ...emptyView(), seq: 5, page: 'components' }
  const fake = {
    event: { listen: (name, fn) => { assert.equal(name, 'installer://view'); push = fn } },
    core: { invoke: async (cmd, args) => { calls.push([cmd, args]); return cmd === 'installer_view' ? v1 : undefined } },
  }
  const b = createTauriBridge(fake)
  const seen = []
  b.subscribe((v) => seen.push(v.seq))
  assert.equal((await b.view()).page, 'components')
  push({ payload: { ...v1, seq: 4 } })
  push({ payload: { ...v1, seq: 6 } })
  assert.deepEqual(seen, [5, 6])
  await b.send({ type: 'bogus' })
  await b.send({ type: 'toggle-component', id: 'vdd' })
  assert.deepEqual(calls.at(-1), ['installer_action', { action: { type: 'toggle-component', id: 'vdd' } }])
  assert.equal(calls.length, 2)
  assert.equal(PROGRESS_GROUPS.length, 4)
})

test('planned steps follow the selection and files report a fraction', async () => {
  const b = createMockBridge({ speed: 0, scenario: 'upgrade' })
  await b.send({ type: 'install' })
  const plan = b.state().progress.planned
  assert.ok(plan.includes('files') && plan.includes('service'))
  assert.ok(!plan.includes('usbip'), 'usbip is not selected in the upgrade scenario')
  const fractions = []
  while (b.step()) { const f = b.state().progress.fraction.files; if (f !== undefined) fractions.push(f) }
  assert.deepEqual(fractions, [0, 0.35, 0.8])
  assert.equal(b.state().progress.fraction.files, undefined)
  assert.deepEqual(emptyView().progress.planned, [])
})

test('a failed invoke reaches the caller, so the page can show it (never silence)', async () => {
  const fake = { event: { listen: () => {} }, core: { invoke: async () => { throw new Error('Command installer_action not allowed by ACL') } } }
  const b = createTauriBridge(fake)
  await assert.rejects(b.send({ type: 'install' }), /not allowed by ACL/)
})
