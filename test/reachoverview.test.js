import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { lanView, normalizeReport, reachOverview } from '../src/settings/reachability.js'

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'))
const src = (path) => fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const listeners = { status: true, addresses: [{ name: 'Ethernet', address: '192.168.1.100' }, { name: 'Tailscale', address: '100.92.14.7' }], active: { bind_address: '', address_family: 'ipv4', port: 47989, upnp: false }, saved: { bind_address: '', address_family: 'ipv4', port: 47989, upnp: false } }

test('the overview says each thing once: the own-certificate test is evidence or a reason, never both, and no line repeats the line above it', () => {
  for (const name of ['reachability-public-verified', 'reachability-endpoints', 'reachability-cgnat', 'reachability-video-port']) {
    for (const locale of ['zh', 'en']) {
      for (const path of reachOverview(normalizeReport(fixture(name)), locale)) {
        const lines = [path.fact, ...path.notes.map((n) => n.text)].filter(Boolean)
        assert.equal(new Set(lines).size, lines.length, `${name} ${locale} ${path.id}: a line is said twice`)
        const self = lines.filter((l) => /自己的证书|its own certificate/.test(l))
        assert.ok(self.length <= 1, `${name} ${locale} ${path.id}: the own-certificate test is said ${self.length} times`)
      }
    }
  }
})

test('a verified path leads with its evidence (when and from where), a path without evidence with the verdict\'s sentence', () => {
  const [pub, mesh] = reachOverview(normalizeReport(fixture('reachability-public-verified')), 'zh')
  assert.match(pub.fact, /^最近一次从公网连接成功 · 2026-11-03 \d\d:\d\d · 198\.51\.100\.0\/24$/)
  assert.ok(pub.notes.some((n) => n.kind === 'evidence' && n.text.includes('回环测试通过')))
  assert.ok(!pub.notes.some((n) => n.code === 'hairpin_verified'), 'the reason that repeats the evidence is dropped')
  assert.equal(mesh.verdict, 'likely')
  assert.match(mesh.fact, /不算已验证/)
  assert.ok(!mesh.notes.some((n) => n.code === 'mesh_adapter_up'), 'the mesh being up is in the sentence and the adapter line, not a third time')
  assert.ok(mesh.notes.some((n) => n.kind === 'adapter' && n.up))
})

test('problems come first, each with the action that fixes it; notes keep no action', () => {
  const paths = reachOverview(normalizeReport(fixture('reachability-video-port')), 'en')
  for (const path of paths) {
    const kinds = path.notes.map((n) => n.kind)
    const lastProblem = kinds.lastIndexOf('problem')
    assert.ok(lastProblem < 0 || kinds.slice(0, lastProblem + 1).every((k) => k === 'problem'), `${path.id}: a problem comes after something else`)
    for (const n of path.notes.filter((x) => x.kind === 'problem' && x.action)) assert.ok(n.actionLabel, `${n.code} has no action label`)
  }
  assert.deepEqual(reachOverview(null, 'en'), [])
})

test('the local network says what the host says: the listener in use, its adapter and port, LAN discovery; never "verified"', () => {
  const v = lanView(listeners, { mdns_broadcast: 'enabled' }, 'zh')
  assert.deepEqual([v.id, v.verdict, v.word, v.tone, v.address], ['lan', 'listening', '在监听', 'ok', '192.168.1.100'])
  assert.equal(v.fact, 'Ethernet · 端口 47989 · 局域网发现 开')
  const other = lanView({ ...listeners, active: { ...listeners.active, port: 57989 }, saved: { ...listeners.saved, port: 57989 } }, { mdns_broadcast: 'disabled' }, 'en')
  assert.equal(other.address, '192.168.1.100:57989', 'a port other than the default is part of the address')
  assert.match(other.fact, /LAN discovery off/)
  const pending = lanView({ ...listeners, saved: { ...listeners.saved, port: 50000 } }, {}, 'zh')
  assert.deepEqual([pending.verdict, pending.tone], ['pending', 'info'])
  assert.equal(lanView(null, {}, 'zh').verdict, 'loading')
  assert.equal(lanView(listeners, {}, 'zh', 'boom').verdict, 'unknown')
  const bound = lanView({ ...listeners, active: { ...listeners.active, bind_address: '10.0.0.5' } }, {}, 'en')
  assert.equal(bound.address, '10.0.0.5', 'an address the person bound is the one to enter')
  const meshOnly = lanView({ ...listeners, addresses: [{ name: 'Tailscale', address: '100.92.14.7' }] }, {}, 'en')
  assert.equal(meshOnly.address, '', 'a mesh address is not offered as the LAN address')
  for (const word of Object.values({ ...v, notes: '' })) assert.ok(!/验证|verified/i.test(String(word)))
})

test('status colour is a small accent: no path surface of the network page is a filled success/error/primary container', () => {
  const css = src('css/reach.css')
  for (const sel of ['.m-reach__path.is-ok', '.m-reach__path.is-info', '.m-reach__path.is-error', '.m-reacho__path', '.m-eplist__row']) {
    for (const rule of css.split('}').filter((r) => r.trim().startsWith(sel))) assert.ok(!/background:[^;]*(success|error|primary)-container/.test(rule), `${sel} fills its surface with a container colour`)
  }
  assert.ok(!/--reach-bg: var\(--md-sys-color-(success|error|primary)-container\)/.test(css))
})

test('the endpoints are a list of rows with a sheet, not a stack of text fields; each change is saved as the whole list', () => {
  const list = src('vue/MEndpointList.vue')
  assert.match(list, /<MSheet /)
  assert.equal((list.match(/<MField /g) || []).length, 1, 'one field, in the sheet')
  assert.match(list, /emit\('save', serializeEndpoints\(next\)\)/)
  const overview = src('vue/MReachOverview.vue')
  assert.match(overview, /<MEndpointList /)
  assert.match(overview, /content_copy/)
  assert.ok(!/T\.address\.check/.test(overview), 'the check is the one button at the top, not a second one under the list')
})

test('on a narrow page the address of a path goes under its sentence, so the sentence never wraps word by word', () => {
  const css = src('css/reach.css')
  const narrow = /@container \(max-width: (\d+)px\) \{ \.m-reacho__row \{ flex-wrap: wrap;[^}]*\} \.m-reacho__addr \{ flex: 1 1 100%;/.exec(css)
  assert.ok(narrow, 'the address takes a line of its own below the sentence')
  assert.ok(Number(narrow[1]) >= 700, `the address moves down only below ${narrow?.[1]} px of content: a 1024 px window (about 560 px of content) must stack it`)
  assert.match(css, /\.m-reacho__main \{ flex: 1 1 0; min-width: 0;/, 'the sentence keeps the room beside the icon')
})

test('the status of a path is its icon and its chip only: no coloured bar or edge on a path row, here or on the tutorial card', () => {
  const css = src('css/reach.css')
  assert.ok(!/\.m-reacho__path::before/.test(css), 'no lead bar on the rows of the network page')
  for (const rule of css.split('}').filter((r) => /\.m-reach(o)?__path/.test(r))) assert.ok(!/box-shadow|border-left|::before/.test(rule), `a path row draws a coloured edge: ${rule.trim()}`)
})
