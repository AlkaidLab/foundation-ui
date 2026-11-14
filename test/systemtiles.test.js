import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildCatalogue } from '../src/vue/homeCatalogue.js'
import { homeTexts } from '../src/vue/homeModel.js'
import { buildCards } from '../src/vue/homeCards.js'
import { reachProblemOf, speedText } from '../src/vue/homeSystemTiles.js'
import { normalizeReport } from '../src/settings/reachability.js'
import { createHistory } from '../src/vue/homeHistory.js'

const si = JSON.parse(fs.readFileSync(new URL('./fixtures/system-info.json', import.meta.url), 'utf8'))
const reach = (name) => normalizeReport(JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')))
const T = { ...homeTexts('zh'), __locale: 'zh' }

test('网卡: the adapter of the default route first, with its type, speed and address; the rest as rows; IPv6 and the masked MAC for the large size', () => {
  const d = buildCatalogue({ sysinfo: si, now: 0, history: createHistory({ getItem: () => null, setItem() {} }, 't') }, T).data.net
  assert.equal(d.type, 'nics')
  assert.deepEqual([d.primary.kind, d.primary.speed, d.primary.ipv4, d.primary.isDefault], ['以太网', '2.5 Gbps', '192.168.7.188', true])
  assert.deepEqual(d.rows.map((r) => r.title), ['Ethernet', 'Wi-Fi', 'Tailscale', 'vEthernet (WSL)'])
  assert.ok(d.rows[1].sub.includes('Wi-Fi') && d.rows[1].sub.includes('1.2 Gbps'))
  assert.ok(d.facts.some((f) => f.label === 'IPv6' && f.value.startsWith('2408:')) && d.facts.some((f) => f.label === 'MAC' && /^a8:a1:59:••:••:••$/.test(f.value)), 'the MAC shows the vendor part only')
  const wifi = JSON.parse(JSON.stringify(si)); wifi.nics[0].is_default_route = false; wifi.nics[1].is_default_route = true
  const w = buildCatalogue({ sysinfo: wifi, now: 0, history: createHistory({ getItem: () => null, setItem() {} }, 't') }, T).data.net
  assert.deepEqual([w.primary.wifi, w.primary.signal, w.primary.ssid], [true, 82, 'Sk***'])
  assert.equal(buildCatalogue({ now: 0, history: createHistory({ getItem: () => null, setItem() {} }, 't') }, T).data.net, null, 'no system information, no tile')
  assert.equal(speedText(2500), '2.5 Gbps'); assert.equal(speedText(1000), '1 Gbps'); assert.equal(speedText(100), '100 Mbps'); assert.equal(speedText(0), '')
})

test('系统: the operating system, its version and build, and the host name', () => {
  const d = buildCatalogue({ sysinfo: si, now: 0, history: createHistory({ getItem: () => null, setItem() {} }, 't') }, T).data.sys
  assert.equal(d.big, 'Windows 11 Pro'); assert.deepEqual(d.rows.map((r) => r.value), ['24H2', '26100.2605', 'Skyward'])
})

test('公网地址: the configured address, the verdict of the host check, and what is a problem', () => {
  const x = { now: 0, history: createHistory({ getItem: () => null, setItem() {} }, 't'), reach: reach('reachability-public-verified'), config: { external_ip: 'home.example.net' } }
  const d = buildCatalogue(x, T).data['public-address']
  assert.deepEqual([d.type, d.saved, d.path.id], ['address', 'home.example.net', 'public'])
  assert.equal(buildCatalogue({ ...x, config: {} }, T).data['public-address'].saved, '', 'unset')
  assert.equal(reachProblemOf(x.reach), false)
  assert.equal(reachProblemOf({ public: { configured: { reasons: ['dns_failed'] } } }), true); assert.equal(reachProblemOf({ public: { configured: { reasons: ['unset'] } } }), false); assert.equal(reachProblemOf(null), false)
})

test('the CPU and GPU cards carry what the system information adds: the model, the cores, the driver, the memory, the stream adapter', () => {
  const model = { curves: [{ id: 'cpu', title: 'CPU', value: '12', points: [1, 2] }, { id: 'gpu', title: 'GPU', value: '40', points: [3, 4], caption: 'old' }] }
  const cards = buildCards(model, { texts: T, sysinfo: si, temps: { cpu: 61.2, gpu: 70 } })
  const cpu = cards.find((c) => c.id === 'cpu').data, gpu = cards.find((c) => c.id === 'gpu').data
  assert.equal(cpu.caption, 'Intel(R) Core(TM) i7-13700KF'); assert.deepEqual(cpu.facts, ['16 核 / 24 线程', '61 °C'])
  assert.equal(gpu.caption, 'NVIDIA GeForce RTX 4080'); assert.deepEqual(gpu.facts, ['驱动 572.83', '16 GB', '70 °C', '串流使用这块显卡'])
  assert.equal(buildCards(model, { texts: T }).find((c) => c.id === 'cpu').data.facts, undefined, 'without the information the card is as it was')
})
