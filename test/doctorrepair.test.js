// One problem, one repair button: the host's `input.usb` and the panel's `drivers.usbip` both name driver:usbip; the check of this PC keeps the button, the other row says where to repair.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createDoctor, doctorSnapshot, doctorText, applyRepairMerge, repairGroups } from '../src/doctor/model.js'
import { doctorTexts } from '../src/doctor/texts.js'

const act = { kind: 'repair', target: 'driver:usbip', level: 3, confirm: true, effect: 'Installs usbip-win2 again. Every attached USB device is detached.' }
const row = (id, status, title, detail, fix) => ({ id, group: id.split('.')[0], status, title, detail, fix })
const report = (id, title, items) => ({ version: 1, groups: [{ id, title, status: 'warn', items: items.map((i) => i.id) }], items })
const sources = ({ hostItems, localItems }) => [
  { id: 'host', groups: [{ id: 'input' }], fetch: async () => ({ ok: true, status: 200, json: report('input', 'Input and gamepads', hostItems) }) },
  { id: 'local', groups: [{ id: 'drivers' }], fetch: async () => ({ ok: true, status: 200, json: report('drivers', 'Drivers', localItems) }) },
]
const HOST_USB = row('input.usb', 'warn', 'USB forwarding', 'usbip.exe found, its driver is not installed', { text: 'Install USB forwarding (in the control panel, or Components).', action: act })
const LOCAL_USB = row('drivers.usbip', 'fail', 'USB/IP (usbip-win2)', 'Installed but not running · 0.9.7.7', { text: 'Repair the driver.', action: act })
const other = (state, id) => state.groups.flatMap((g) => g.items).find((i) => i.id === id)

test('both rows ask for driver:usbip: the check of this PC keeps the one button, the host row points to it and keeps its own words', async () => {
  const d = createDoctor({ sources: sources({ hostItems: [HOST_USB], localItems: [LOCAL_USB] }), parallel: 1 })
  await d.run()
  const local = other(d.state, 'drivers.usbip'), host = other(d.state, 'input.usb')
  assert.equal(local.fix.action.target, 'driver:usbip')
  assert.equal(host.fix.action, null, 'one problem, one repair button')
  assert.deepEqual(host.fix.at, { group: 'drivers', groupTitle: 'Drivers', item: 'drivers.usbip', title: 'USB/IP (usbip-win2)' })
  // both checks keep what they say
  assert.deepEqual([host.status, host.detail, host.title], ['warn', 'usbip.exe found, its driver is not installed', 'USB forwarding'])
  assert.deepEqual([local.status, local.detail], ['fail', 'Installed but not running · 0.9.7.7'])
  // the bundle and the AI text carry the pointer
  const snap = doctorSnapshot(d.state).groups.find((g) => g.id === 'input').items[0]
  assert.equal(snap.repair_at, 'drivers.usbip')
  assert.equal(snap.action, undefined)
  assert.match(doctorText(d.state, { fixAtText: (at) => `see ${at.title}` }), /! USB forwarding: usbip\.exe found[^\n]*\n {2}→ see USB\/IP \(usbip-win2\)/)
  assert.match(doctorText(d.state), /→ repair it at USB\/IP/)
})

test('the same with the answers in the other order, and again after a re-check (the merge is idempotent, the sources\' fixes come back first)', async () => {
  const s = sources({ hostItems: [HOST_USB], localItems: [LOCAL_USB] }).reverse()
  const d = createDoctor({ sources: s, parallel: 1 })
  await d.run()
  assert.equal(other(d.state, 'input.usb').fix.action, null)
  assert.equal(other(d.state, 'drivers.usbip').fix.action.target, 'driver:usbip')
  await d.rerun('input')
  d.restate()
  assert.equal(other(d.state, 'input.usb').fix.action, null)
  assert.equal(other(d.state, 'drivers.usbip').fix.action.target, 'driver:usbip')
  assert.equal(other(d.state, 'input.usb').fix.at.item, 'drivers.usbip')
})

test('a row that is alone with its repair keeps the button: the host row when the driver check has none (not installed is skip), the driver row with Sunshine down', async () => {
  const skipped = row('drivers.usbip', 'skip', 'USB/IP (usbip-win2)', 'Not checked: not installed', { text: '' })
  const d1 = createDoctor({ sources: sources({ hostItems: [HOST_USB], localItems: [skipped] }), parallel: 1 })
  await d1.run()
  assert.equal(other(d1.state, 'input.usb').fix.action.target, 'driver:usbip')
  assert.equal(other(d1.state, 'input.usb').fix.at, undefined)
  const down = sources({ hostItems: [HOST_USB], localItems: [LOCAL_USB] })
  down[0].fetch = async () => ({ ok: false, status: 503, json: null })
  const d2 = createDoctor({ sources: down, parallel: 1 })
  await d2.run()
  assert.equal(other(d2.state, 'drivers.usbip').fix.action.target, 'driver:usbip')
})

test('different repairs are not merged, and a passed row never takes or gives the button', () => {
  const mk = (id, source, status, target) => ({ id, source, status, title: id, fix: { text: 'x', action: { kind: 'repair', target, level: 3 } }, rawFix: { text: 'x', action: { kind: 'repair', target, level: 3 } } })
  const groups = [
    { id: 'drivers', source: 'local', state: 'done', title: 'Drivers', items: [mk('drivers.vigem', 'local', 'fail', 'driver:vigem'), mk('drivers.usbip', 'local', 'pass', 'driver:usbip')] },
    { id: 'input', source: 'host', state: 'done', title: 'Input', items: [mk('input.vigem', 'host', 'fail', 'driver:vigem'), mk('input.usb', 'host', 'warn', 'driver:usbip')] },
  ]
  applyRepairMerge(groups)
  assert.equal(groups[1].items[1].fix.action.target, 'driver:usbip', 'the other side passed: this row keeps its button')
  assert.equal(groups[1].items[0].fix.action, null, 'two fails of driver:vigem merge as well')
  assert.equal(groups[0].items[0].fix.action.target, 'driver:vigem')
})

test('after a repair every group that asked for it is checked again, not only the one whose button was pressed', async () => {
  const d = createDoctor({ sources: sources({ hostItems: [HOST_USB], localItems: [LOCAL_USB] }), parallel: 1 })
  await d.run()
  assert.deepEqual(repairGroups(d.state.groups, act).sort(), ['drivers', 'input'])
  assert.deepEqual(repairGroups(d.state.groups, { kind: 'repair', target: 'driver:vigem' }), [])
  const vue = fs.readFileSync(new URL('../src/vue/MDoctor.vue', import.meta.url), 'utf8')
  assert.match(vue, /for \(const id of new Set\(\[item\.group, \.\.\.repairGroups\(state\.groups, action\)\]\)\) await doctor\.rerun\(id\)/)
})

test('the pointer is a line of text on the row (no button), in both languages, with the words of the group and the row filled in', () => {
  const vue = fs.readFileSync(new URL('../src/vue/MDoctor.vue', import.meta.url), 'utf8')
  assert.match(vue, /v-else-if="it\.status !== 'pass' && it\.fix\.at" class="m-doctor__fix m-doctor__fixat"/)
  for (const loc of ['zh', 'en']) {
    const T = doctorTexts(loc)
    assert.match(T.fixAt, /\{group\}/); assert.match(T.fixAt, /\{item\}/)
  }
  assert.equal(doctorTexts('zh').fixAt.replace('{group}', '驱动').replace('{item}', 'USB/IP'), '在「驱动」的「USB/IP」里修复；修一次，这里也会好。')
})
