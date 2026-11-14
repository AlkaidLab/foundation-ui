import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeOverview, networkOverviewView, networkOverviewSummary, stunRows } from '../src/settings/networkOverview.js'
import { networkOverviewTexts } from '../src/settings/networkOverviewTexts.js'

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'))
const rowOf = (view, id) => view.rows.find((r) => r.id === id)

test('only a version-1 answer is read; anything else is null and the page says the check is not available', () => {
  assert.equal(normalizeOverview(null), null)
  assert.equal(normalizeOverview({ version: 2 }), null)
  assert.equal(normalizeOverview('x'), null)
  assert.equal(networkOverviewView(null, 'zh'), null)
  assert.ok(normalizeOverview({ version: 1 }))
})

test('the lines come in their order and every verdict word is one of 可能可达 / 不可达 / 未知; nothing says verified', () => {
  for (const name of ['network-overview-linux', 'network-overview-home']) {
    for (const locale of ['zh', 'en']) {
      const view = networkOverviewView(normalizeOverview(fixture(name)), locale)
      assert.deepEqual(view.rows.map((r) => r.id), ['interfaces', 'ipv4', 'ipv6', 'nat', 'cgnat', 'upnp', 'firewall'])
      const words = Object.values(networkOverviewTexts(locale).verdicts)
      for (const id of ['ipv4', 'ipv6']) assert.ok(words.includes(rowOf(view, id).word), `${name} ${locale} ${id}: ${rowOf(view, id).word}`)
      const all = view.rows.flatMap((r) => [r.word, r.fact, ...r.notes.map((n) => n.text)]).join('\n')
      assert.ok(!/已验证|verified/i.test(all), `${name} ${locale} says verified`)
      for (const r of view.rows) {
        const lines = [r.fact, ...r.notes.map((n) => n.text)].filter(Boolean)
        assert.equal(new Set(lines).size, lines.length, `${name} ${locale} ${r.id}: a line is said twice`)
        for (const n of r.notes) assert.ok(n.text, `${name} ${locale} ${r.id}: an empty note`)
        for (const n of r.notes.filter((x) => x.action)) assert.ok(n.actionLabel, `${r.id} ${n.code} has no action label`)
      }
    }
  }
})

test('the real Linux run: STUN address and RFC 5780 mapping, no IPv6, container bridges not listed', () => {
  const report = normalizeOverview(fixture('network-overview-linux'))
  const view = networkOverviewView(report, 'zh')
  const v4 = rowOf(view, 'ipv4')
  assert.equal(v4.address, '203.0.113.56')
  assert.equal(v4.word, '不可达')
  assert.ok(v4.notes.some((n) => n.code === 'not_listening' && /47984/.test(n.text)))
  assert.ok(v4.notes.some((n) => n.code === 'source' && n.text === '111.206.174.3 看到的地址'))
  assert.equal(rowOf(view, 'interfaces').address, '', 'the adapter addresses are notes, not a second address column')
  const nat = rowOf(view, 'nat')
  assert.deepEqual([nat.word, nat.tone], ['与目标无关', 'ok'])
  assert.match(nat.fact, /P2P 直连通常可行/)
  assert.equal(rowOf(view, 'cgnat').fact, '不知道路由器的外网地址。')
  assert.ok(nat.details.some((n) => n.code === 'method' && /RFC 5780/.test(n.text) && /测试 II 203\.0\.113\.56:\d+/.test(n.text)), 'the tests are under 详细信息')
  assert.ok(nat.details.some((n) => n.code === 'filtering'), 'filtering is said to be not tested, under 详细信息')
  assert.ok(!nat.notes.some((n) => /RFC|测试 I/.test(n.text)), 'no RFC wording on the line itself')
  const v6 = rowOf(view, 'ipv6')
  assert.deepEqual([v6.word, v6.address], ['不可达', ''])
  assert.ok(v6.notes.some((n) => n.code === 'ipv6_no_global'))
  const ifs = rowOf(view, 'interfaces')
  assert.equal(ifs.fact, 'enp6s0 · 连外网')
  assert.ok(!ifs.notes.some((n) => /^br-/.test(n.text)), 'a container bridge is not listed')
  assert.ok(ifs.notes.some((n) => n.code === 'if:tailscale0' && /组网/.test(n.text)))
  assert.equal(rowOf(view, 'upnp').word, '无回应')
  assert.equal(rowOf(view, 'cgnat').word, '未知')
})

test('a home router behind another NAT: the reasons say why, the stable IPv6 is the one shown, the temporary one is marked', () => {
  const report = normalizeOverview(fixture('network-overview-home'))
  const view = networkOverviewView(report, 'zh')
  const v4 = rowOf(view, 'ipv4')
  assert.deepEqual([v4.word, v4.tone], ['未知', 'neutral'])
  const upstream = v4.notes.find((n) => n.code === 'upstream_nat')
  assert.match(upstream.text, /198\.51\.100\.88.*203\.0\.113\.56/)
  assert.equal(v4.notes[0].kind, 'problem', 'problems come first')
  const ifs = rowOf(view, 'interfaces')
  assert.ok(ifs.notes.some((n) => n.text === 'IPv6 2408:8207:1:2::abcd · 公网 · 稳定'))
  assert.ok(ifs.notes.some((n) => n.kind === 'note' && /临时，不提供给客户端/.test(n.text)))
  assert.ok(!ifs.notes.some((n) => /fe80::1/.test(n.text)), 'link-local addresses are left out')
  assert.ok(ifs.notes.some((n) => n.code === 'hidden' && /1 个/.test(n.text)))
  const v6 = rowOf(view, 'ipv6')
  assert.equal(v6.word, '未知')
  assert.equal(v6.address, '2408:8207:1:2::abcd', 'the stable address is the one to copy')
  assert.ok(v6.notes.some((n) => n.code === 'ipv6_inbound_filter_unknown'))
  const nat = rowOf(view, 'nat')
  assert.deepEqual([nat.word, nat.tone], ['随目标变化', 'info'])
  assert.ok(nat.details.some((n) => /地址和端口相关映射/.test(n.text)))
  assert.equal(nat.fact, '每个目标换一个公网端口：P2P 直连多半要靠中继。')
  const cg = rowOf(view, 'cgnat')
  assert.match(cg.fact, /还有一层 NAT/, 'an unknown carrier NAT says why it is unknown')
  assert.equal(cg.notes[0].code, 'double_nat')
  assert.ok(cg.notes[0].actionLabel)
  const fw = rowOf(view, 'firewall')
  assert.deepEqual([fw.word, fw.tone], ['有拦截', 'error'])
  assert.match(fw.notes[0].text, /UDP 47998/)
  assert.match(rowOf(view, 'upnp').fact, /已映射 2\/3 个端口/)
  assert.equal(networkOverviewSummary(report, 'zh'), 'IPv4 未知 · IPv6 未知')
})

test('a session from the internet leads the IPv4 line and is not repeated as a reason', () => {
  const raw = fixture('network-overview-home')
  raw.reachability.ipv4 = { verdict: 'likely', reasons: ['session_evidence', 'mappings_complete'] }
  raw.upstream_nat = { state: 'no', reasons: ['stun_matches_wan'] }
  const v4 = rowOf(networkOverviewView(normalizeOverview(raw), 'zh'), 'ipv4')
  assert.equal(v4.word, '可能可达')
  assert.match(v4.fact, /7 天内有客户端从公网连上过/)
  assert.ok(!v4.notes.some((n) => n.code === 'session_evidence'))
})

test('a proxy fake-IP resolver is said where it changes the result', () => {
  const raw = fixture('network-overview-linux')
  raw.ipv4.notes = ['dns_fake_ip']
  const view = networkOverviewView(normalizeOverview(raw), 'en')
  assert.ok(rowOf(view, 'ipv4').notes.some((n) => n.code === 'dns_fake_ip' && /proxy rewrites/.test(n.text)))
  assert.ok(rowOf(view, 'nat').notes.some((n) => n.code === 'dns_fake_ip'))
  assert.ok(rowOf(view, 'ipv4').details.some((n) => n.code === 'dns_fake_ip_range' && /198\.18\.0\.0\/15/.test(n.text)))
})

test('the STUN table lists both families with the result of each server', () => {
  const rows = stunRows(normalizeOverview(fixture('network-overview-home')))
  assert.deepEqual(rows.map((r) => r.family), ['IPv4', 'IPv4', 'IPv6'])
  assert.equal(rows[0].mappedText, '198.51.100.88:40001')
  assert.equal(rows[2].mappedText, '[2408:8207:1:2:a1b2:c3d4:e5f6:789]:50000')
  assert.equal(rows[1].error, 'timeout')
})

test('the main view has no RFC names, test lines or address ranges; they are all under 详细信息', () => {
  for (const name of ['network-overview-linux', 'network-overview-home']) {
    for (const locale of ['zh', 'en']) {
      const view = networkOverviewView(normalizeOverview(fixture(name)), locale)
      for (const r of view.rows) {
        for (const text of [r.fact, ...r.notes.map((n) => n.text)]) assert.ok(!/RFC \d|测试 (I|II|III) |test (I|II|III) |\d+\.\d+\.\d+\.\d+\/\d+ |NPTv6|ULA/.test(text || ''), `${name} ${locale} ${r.id}: ${text}`)
        assert.ok(Array.isArray(r.details))
      }
    }
  }
})

test('the privacy line names the servers this check contacted, the cache time and how to turn it off', () => {
  const raw = fixture('network-overview-home')
  raw.stun = { enabled: true, region: 'china', contacted: ['stun.miwifi.com:3478', 'stun.chat.bilibili.com:3478', '[2606:4700:49::]:3478'], cache_seconds: 600 }
  const view = networkOverviewView(normalizeOverview(raw), 'zh')
  assert.equal(view.privacy, '本次检测向第三方 STUN 服务器询问了这台电脑的公网地址：stun.miwifi.com、stun.chat.bilibili.com、2606:4700:49::。结果保留 10 分钟；把 stun_servers 设为 none 可关闭。')
  raw.stun_enabled = false
  assert.match(networkOverviewView(normalizeOverview(raw), 'en').privacy, /STUN is off/)
})

test('the shared state asks the host only when called: the page reads the cache, 重新检测 asks again, an older host is unavailable', async () => {
  const { createNetworkOverview } = await import('../src/vue/useNetworkOverview.js')
  const paths = []
  const ok = createNetworkOverview({ request: async (path) => { paths.push(path); return { ok: true, status: 200, json: fixture('network-overview-home') } } })
  await ok.refresh()
  await ok.refresh(true)
  assert.deepEqual(paths, ['/api/network/overview', '/api/network/overview?refresh=1'])
  assert.equal(ok.view.status, 'ready')
  const old = createNetworkOverview({ request: async () => ({ ok: false, status: 404, json: null }) })
  await old.refresh()
  assert.equal(old.view.status, 'unavailable')
  const broken = createNetworkOverview({ request: async () => { throw new Error('down') } })
  await broken.refresh()
  assert.equal(broken.view.status, 'error')
  const src = fs.readFileSync(new URL('../src/vue/useNetworkOverview.js', import.meta.url), 'utf8')
  assert.ok(!/setInterval|setTimeout/.test(src), 'nothing asks the host on a timer')
})
