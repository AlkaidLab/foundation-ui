// A gap check that does not depend on anyone remembering: components are rendered with mock data full of sentinel values (a host name, an address, a client name, a user path, a display name) and every text or
// input value that holds a sentinel must sit inside a data-redact box. The same check runs on the real pages in tools/redact-sentinel (a browser over the Panel and the Web UI with a sentinel host).
import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { redactKindOf } from '../src/devmode/shot.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SENTINEL = /HOST-SENTINEL|Pixel-SENTINEL|DISPLAY-SENTINEL|10\.11\.12\.13|C:\\Users\\SENTINEL|D:\\SENTINEL|SERIAL-SENTINEL/

/** The sentinel texts of an HTML string that are not inside a data-redact element: [{ text, path }]. */
export function unmarkedSentinels(html, re = SENTINEL) {
  const bad = []
  const stack = []
  const VOID = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'path', 'circle', 'rect', 'line', 'use'])
  const tag = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g
  let m
  while ((m = tag.exec(html))) {
    if (m[5] !== undefined) { if (re.test(m[5]) && !stack.some((e) => e.redact)) bad.push({ text: m[5].trim().slice(0, 60), path: stack.map((e) => e.name).join('>') }); continue }
    if (!m[2]) continue
    const name = m[2].toLowerCase()
    if (m[1]) { for (let i = stack.length - 1; i >= 0; i -= 1) { if (stack[i].name === name) { stack.length = i; break } } continue }
    const attrs = m[3] || ''
    const redact = /\sdata-redact(=|\s|$)/.test(attrs)
    if (name === 'input' || name === 'textarea') {
      const value = /\svalue="([^"]*)"/.exec(attrs)?.[1] || ''
      const auto = /type="password"|autocomplete="(?:one-time-code|username|current-password|new-password)"|inputmode="numeric"|name="[^"]*(?:pin|port)[^"]*"/i.test(attrs)
      if (re.test(value) && !redact && !auto && !stack.some((e) => e.redact)) bad.push({ text: value.slice(0, 60), path: `${stack.map((e) => e.name).join('>')}>${name}[value]` })
    }
    if (!VOID.has(name) && !m[4]) stack.push({ name, redact })
  }
  return bad
}

let server, load
before(async () => {
  server = await createServer({
    root, configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('md-') } } })],
  })
  load = async (p) => (await server.ssrLoadModule(p)).default
})
after(async () => { await server?.close() })
const render = (component, props, attrs = {}) => renderToString(createSSRApp({ render: () => h(component, { ...props, ...attrs }) }))

test('the checker itself: a sentinel outside a box is found, inside one it is not, an input value counts', () => {
  assert.equal(unmarkedSentinels('<div><b>HOST-SENTINEL</b></div>').length, 1)
  assert.equal(unmarkedSentinels('<div data-redact="host"><b>HOST-SENTINEL</b></div>').length, 0)
  assert.equal(unmarkedSentinels('<p>ok</p><span data-redact="x"></span><i>10.11.12.13</i>').length, 1)
  assert.equal(unmarkedSentinels('<input value="D:\\SENTINEL\\a">').length, 1)
  assert.equal(unmarkedSentinels('<input type="password" value="HOST-SENTINEL">').length, 0)
  assert.equal(unmarkedSentinels('<div data-redact><input value="HOST-SENTINEL"><b>x</b></div><b>HOST-SENTINEL</b>').length, 1)
})

test('settings keys: a name, an address, a path or a serial is marked, a plain number is not', () => {
  for (const [key, kind] of [['sunshine_name', 'host'], ['pair_name', 'host'], ['external_ip', 'address'], ['file_apps', 'path'], ['log_path', 'path'], ['credentials_file', 'path'], ['pkey', 'path'], ['display_serial', 'serial'], ['webhook_url', 'address'], ['output_name', 'host']]) assert.equal(redactKindOf(key), kind, key)
  for (const key of ['port', 'fps', 'qp', 'min_log_level', 'nvenc_preset', 'hevc_mode', '']) assert.equal(redactKindOf(key), '', key)
})

test('a setting row and its dialog field are marked when the key says so (value shown as text)', async () => {
  const MValueItem = await load('/src/vue/MValueItem.vue')
  for (const [key, value] of [['sunshine_name', 'HOST-SENTINEL'], ['external_ip', '10.11.12.13'], ['file_apps', 'C:\\Users\\SENTINEL\\apps.json'], ['log_path', 'D:\\SENTINEL\\sunshine.log']]) {
    const html = await render(MValueItem, { label: key, modelValue: value }, { 'data-cfg': key })
    assert.deepEqual(unmarkedSentinels(html), [], key)
    assert.match(html, /data-redact=/, key)
  }
  const plain = await render(MValueItem, { label: 'Port', modelValue: 47989 }, { 'data-cfg': 'port' })
  assert.ok(!/data-redact/.test(plain), 'a port number is not hidden')
})

test('display cards, the pairing prompt and the error centre: every sentinel is in a box', async () => {
  const MDisplayCards = await load('/src/vue/MDisplayCards.vue')
  assert.deepEqual(unmarkedSentinels(await render(MDisplayCards, { items: [{ id: 'a', kind: 'physical', title: 'DISPLAY-SENTINEL (DISPLAY1)', text: 'SERIAL-SENTINEL', size: '2560x1440' }] })), [])
  const MPairPrompt = await load('/src/vue/MPairPrompt.vue')
  assert.deepEqual(unmarkedSentinels(await render(MPairPrompt, { locale: 'en', now: 0, requests: [{ id: 'r1', device_name: 'Pixel-SENTINEL', expires_in: 60 }] })), [])
  const MErrorCentre = await load('/src/vue/MErrorCentre.vue')
  const { parseLog } = await import('../src/diagnostics/logs.js')
  const rows = parseLog('[2026-11-09 10:00:00.000]: Error: service on HOST-SENTINEL (10.11.12.13) could not open C:\\Users\\SENTINEL\\x.json\n')
  assert.deepEqual(unmarkedSentinels(await render(MErrorCentre, { rows, locale: 'en' })), [])
})

test('a plain MItem row of a settings key (the file paths) is marked by its data-cfg', async () => {
  const MItem = await load('/src/vue/MItem.vue')
  assert.deepEqual(unmarkedSentinels(await render(MItem, { title: 'Apps', text: 'C:\\Users\\SENTINEL\\apps.json' }, { 'data-cfg': 'file_apps' })), [])
  assert.deepEqual(unmarkedSentinels(await render(MItem, { title: 'Log', text: 'D:\\SENTINEL\\sunshine.log' }, { 'data-cfg': 'log_path' })), [])
  assert.deepEqual(unmarkedSentinels(await render(MItem, { title: 'Apps', text: 'C:\\Users\\SENTINEL\\apps.json · default apps.json' }, { 'data-diff': 'file_apps' })), [], 'the list of changes from the default')
  assert.ok(!/data-redact/.test(await render(MItem, { title: 'Port', text: '47989' }, { 'data-cfg': 'port' })))
  assert.match(await render(MItem, { title: 'x', text: 'y' }, { 'data-redact': 'client' }), /data-redact="client"/)
})

test('the network overview: the adapters, the addresses and the public address are boxes (the public STUN servers it names are not private)', async () => {
  const { normalizeOverview } = await import('../src/settings/networkOverview.js')
  const MNetworkOverview = await load('/src/vue/MNetworkOverview.vue')
  const report = normalizeOverview({
    version: 1, checked_at: '2026-11-09T10:00:00Z', stun_enabled: true, stun: { contacted: ['stun.example.org:3478'], cache_seconds: 60 },
    interfaces: [{ name: 'Ethernet HOST-SENTINEL', description: 'Intel HOST-SENTINEL', up: true, egress: true, addresses: [{ address: '10.11.12.13', family: 'ipv4', prefix_length: 24, scope: 'private', lifetime: 'stable' }] }],
    ipv4: { address: '10.11.12.13', public: true }, ipv6: { address: '' }, upnp: { available: true, wan_ip: '10.11.12.13', wan_ip_class: 'public', mappings: [] },
  })
  assert.ok(report, 'the fixture is a valid report')
  const html = await render(MNetworkOverview, { report, status: 'ready', locale: 'en' })
  assert.ok(/SENTINEL|10\.11\.12\.13/.test(html), 'the fixture reaches the page')
  assert.deepEqual(unmarkedSentinels(html), [])
})
