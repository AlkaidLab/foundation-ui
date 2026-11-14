import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PORT_CHECK_IDS, checkPortsViaDoctor } from '../src/vue/guidePortCheck.js'
import { GUIDE_TEXTS_EN, GUIDE_TEXTS_ZH } from '../src/vue/guideTexts.js'

const report = (items) => ({ version: 1, checked_at: '2026-11-09T12:00:00Z', groups: [{ id: 'network', title: 'Network', items: items.map((i) => i.id) }], items: items.map((i) => ({ group: 'network', ...i })) })
const answer = (json, extra = {}) => async (path) => ({ ok: true, status: 200, json, path, ...extra })

test('the port check of the guide is the host 体检, group network: it asks that route and keeps only the lines about ports', async () => {
  const seen = []
  const request = async (path) => { seen.push(path); return { ok: true, status: 200, json: report([{ id: 'network.public', status: 'warn', title: 'From the internet', detail: 'x' }, { id: 'network.ports', status: 'fail', title: 'Ports', detail: 'UDP 47998 is not open' }, { id: 'network.lan', status: 'pass', title: 'Local network', detail: 'listening' }, { id: 'network.firewall', status: 'pass', title: 'Firewall', detail: 'allowed' }]) } }
  const r = await checkPortsViaDoctor(request, 'zh')
  assert.equal(seen.length, 1)
  assert.match(seen[0], /^\/api\/doctor\?only=network&lang=zh/, 'the diagnostics route, no probe of its own')
  assert.deepEqual(r.items.map((i) => i.id), ['network.lan', 'network.ports', 'network.firewall'], 'in the order of PORT_CHECK_IDS, the public-address line left to the remote step')
  assert.deepEqual(PORT_CHECK_IDS, ['network.lan', 'network.ports', 'network.firewall'])
  assert.equal(r.ok, true)
  assert.equal(r.worst, 'fail')
  assert.equal(r.items[1].detail, 'UDP 47998 is not open')
})

test('a host without 体检 (404, or a closed connection) is "unsupported", not a failed check; any other failure is a failure', async () => {
  assert.deepEqual(await checkPortsViaDoctor(async () => ({ ok: false, status: 404 })), { ok: false, unsupported: true })
  assert.deepEqual(await checkPortsViaDoctor(async () => ({ ok: false, status: 444 })), { ok: false, unsupported: true })
  assert.deepEqual(await checkPortsViaDoctor(async () => ({ ok: false, status: 500 })), { ok: false, unsupported: false })
  assert.deepEqual(await checkPortsViaDoctor(async () => { throw new Error('down') }), { ok: false, unsupported: false })
  assert.deepEqual(await checkPortsViaDoctor(answer({ version: 2 })), { ok: false, unsupported: true }, 'an answer that is not a v1 report is an older host')
})

test('a report whose ports lines are all fine says pass; with no port line it is an empty result the screen words itself', async () => {
  const good = await checkPortsViaDoctor(answer(report([{ id: 'network.ports', status: 'pass', title: 'Ports', detail: 'ok' }, { id: 'network.firewall', status: 'skip', title: 'Firewall', detail: 'n/a' }])))
  assert.equal(good.worst, 'pass')
  const none = await checkPortsViaDoctor(answer(report([{ id: 'network.public', status: 'pass', title: 'x', detail: '' }])))
  assert.deepEqual(none, { ok: true, items: [], worst: 'skip' })
})

test('the port row of the address step offers the check only where the product supplies it, runs it on request and says what it found; the texts exist in zh and en', () => {
  const port = readFileSync(new URL('../src/vue/MGuidePort.vue', import.meta.url), 'utf8')
  const address = readFileSync(new URL('../src/vue/MGuideAddress.vue', import.meta.url), 'utf8')
  assert.match(port, /<div v-if="callbacks\.checkPorts" class="m-guide__portcheck">/)
  assert.match(port, /@click="runCheck"/)
  assert.doesNotMatch(port, /onMounted|immediate: true[^\n]*runCheck/, 'never run by itself: a probe of the router and the firewall is on request')
  assert.match(address, /checkPorts: \(\) => props\.callbacks\.checkPorts\(\)/)
  for (const key of ['check', 'checking', 'checkAgain', 'checkUnsupported', 'checkFailed', 'checkNone', 'checkOpen']) {
    assert.ok(GUIDE_TEXTS_EN.address.port[key], `en ${key}`)
    assert.ok(GUIDE_TEXTS_ZH.address.port[key], `zh ${key}`)
  }
})
