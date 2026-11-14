// The network overview of the host (GET /api/network/overview, JSON v1) as 系统 › 网络概览 shows it: one line per fact (the adapters, the public IPv4 and IPv6, the NAT type,
// the carrier NAT, UPnP, the firewall) with a word, the one sentence behind it, the address to copy, and under it each thing the host said once. Pure: no DOM, no Vue.
//
// Nothing here decides a verdict: the host's per-family verdict is shown as 可能可达 / 不可达 / 未知 with its reasons. A missing, malformed or other-version answer is `null`.
import { REASON_FIX, REASON_KIND, clockText, parseReason } from './reachability.js'
import { reachTexts } from './reachTexts.js'
import { networkOverviewTexts } from './networkOverviewTexts.js'

export const OVERVIEW_VERSION = 1
export const OVERVIEW_VERDICTS = Object.freeze(['likely', 'unreachable', 'unknown'])
export const MAPPINGS = Object.freeze(['endpoint-independent', 'address-dependent', 'address-and-port-dependent', 'endpoint-dependent', 'unknown'])
const DEPENDENT = new Set(['address-dependent', 'address-and-port-dependent', 'endpoint-dependent'])

/** The look of a verdict or a state: the tone of the line (ok | info | neutral | error, as in the 网络 page) and the badge icon. */
const LOOK = Object.freeze({ ok: 'check_circle', info: 'info', neutral: 'help', error: 'error' })
const VERDICT_TONE = Object.freeze({ likely: 'info', unreachable: 'error', unknown: 'neutral' })

/** Codes of this endpoint (besides those of /api/network/reachability): what each is, and which setting fixes it. */
const OWN_KIND = Object.freeze({
  upstream_nat: 'problem', stun_on_interface: 'good', ipv6_no_global: 'problem', ipv6_stable_global: 'good', ipv6_only_temporary: 'problem', ipv6_not_listening: 'problem',
  ipv6_translated: 'note', ipv6_stun_no_answer: 'note', ipv6_inbound_filter_unknown: 'note',
})
const OWN_FIX = Object.freeze({ upstream_nat: 'mesh', ipv6_not_listening: 'family' })

const str = (v) => (v === undefined || v === null ? '' : String(v).trim())
const list = (v) => (Array.isArray(v) ? v : [])
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback)
const fill = (text, values) => String(text || '').replace(/\{(\w+)\}/g, (_, k) => (values[k] === undefined ? '' : String(values[k])))
const transport = (v) => (v && typeof v === 'object' && str(v.address) ? { address: str(v.address), port: Number(v.port) || 0 } : null)
export const formatTransport = (v) => (!v ? '' : v.address.includes(':') ? `[${v.address}]:${v.port}` : `${v.address}:${v.port}`)
const tri = (v) => ({ state: pick(str(v?.state), ['yes', 'no', 'unknown'], 'unknown'), reasons: list(v?.reasons).map(str).filter(Boolean) })

function familyOf(raw) {
  const f = raw && typeof raw === 'object' ? raw : {}
  const nat = f.nat && typeof f.nat === 'object' ? f.nat : {}
  return {
    stun: f.stun === true,
    localAddress: str(f.local_address),
    publicAddress: str(f.public_address),
    source: pick(str(f.source), ['stun', 'interface', 'none'], 'none'),
    onInterface: f.on_interface === true,
    consistent: f.consistent !== false,
    seen: list(f.seen_addresses).map(str).filter(Boolean),
    notes: list(f.notes).map(str).filter(Boolean),
    nat: {
      present: nat.present === true ? true : nat.present === false ? false : null,
      mapping: pick(str(nat.mapping), MAPPINGS, 'unknown'),
      method: pick(str(nat.method), ['rfc5780', 'two-servers', 'none'], 'none'),
      varies: nat.mapped_address_varies === true,
      reasons: list(nat.reasons).map(str).filter(Boolean),
      tests: list(nat.tests).map((t) => ({ name: str(t?.test), target: str(t?.target), mapped: transport(t?.mapped) })).filter((t) => t.name),
    },
    servers: list(f.servers).map((s) => ({ server: str(s?.server), address: str(s?.address), answered: s?.answered === true, error: str(s?.error), mapped: transport(s?.mapped), other: transport(s?.other_address), rttMs: Number(s?.rtt_ms) || 0 })).filter((s) => s.server),
  }
}

function verdictOf(raw) {
  return { verdict: pick(str(raw?.verdict), OVERVIEW_VERDICTS, 'unknown'), reasons: list(raw?.reasons).map(str).filter(Boolean) }
}

/** The answer of the host in a stable shape, or null when it is not a version-1 network overview. */
export function normalizeOverview(raw) {
  if (!raw || typeof raw !== 'object' || Number(raw.version) !== OVERVIEW_VERSION) return null
  const interfaces = list(raw.interfaces).map((i) => ({
    name: str(i?.name), description: str(i?.description), up: i?.up === true, egress: i?.egress === true, virtual: i?.virtual === true, mesh: str(i?.mesh) || 'none',
    addresses: list(i?.addresses).map((a) => ({
      address: str(a?.address), family: a?.family === 'ipv6' ? 6 : 4, prefix: Number(a?.prefix_length) || 0, scope: str(a?.scope) || 'other',
      lifetime: pick(str(a?.lifetime), ['stable', 'temporary', 'unknown'], 'unknown'), deprecated: a?.deprecated === true,
    })).filter((a) => a.address),
  })).filter((i) => i.name)
  const upnp = raw.upnp && typeof raw.upnp === 'object' ? raw.upnp : {}
  const firewall = raw.firewall && typeof raw.firewall === 'object' ? raw.firewall : {}
  const hairpin = raw.hairpin && typeof raw.hairpin === 'object' ? raw.hairpin : {}
  return {
    checkedAt: str(raw.checked_at),
    stunEnabled: raw.stun_enabled !== false,
    contacted: list(raw.stun?.contacted).map(str).filter(Boolean),
    cacheSeconds: Number(raw.stun?.cache_seconds) || 0,
    interfaces,
    ipv4: familyOf(raw.ipv4),
    ipv6: familyOf(raw.ipv6),
    cgnat: tri(raw.cgnat),
    upstream: tri(raw.upstream_nat),
    upnp: {
      available: upnp.available === true, wanIp: str(upnp.wan_ip), wanClass: pick(str(upnp.wan_ip_class), ['public', 'private', 'cgnat', 'unknown'], 'unknown'),
      mappings: list(upnp.mappings).map((m) => ({ proto: str(m?.proto), port: Number(m?.port) || 0, present: m?.present === true })),
    },
    hairpin: { tried: hairpin.tried === true, ok: hairpin.ok === true && hairpin.identity_match === true },
    firewall: { state: pick(str(firewall.state), ['allowed', 'blocked', 'unknown'], 'unknown'), blocked: list(firewall.blocked).map(str).filter(Boolean) },
    reach: { ipv4: verdictOf(raw.reachability?.ipv4), ipv6: verdictOf(raw.reachability?.ipv6) },
  }
}

const hostOf = (server) => str(server).replace(/:\d+$/, '').replace(/^\[|\]$/g, '')

/** One reason of a family verdict as a note: its sentence, its kind, the action that fixes it. */
function reasonNote(code, report, T, R) {
  const { code: base, proto, port } = parseReason(code)
  const values = { proto: proto.toUpperCase(), port, wan: report.upnp.wanIp, seen: report.ipv4.publicAddress }
  const own = T.reasons[base]
  const text = own !== undefined ? fill(own, values) : R.reasons[base] !== undefined ? fill(R.reasons[base], values) : `${R.unknownReason} (${code})`
  const kind = OWN_KIND[base] || REASON_KIND[base] || 'problem'
  const action = kind === 'problem' ? OWN_FIX[base] || REASON_FIX[base] || '' : ''
  return { kind, code: base, text, ...(action ? { action } : {}) }
}

const order = { problem: 0, note: 1, good: 2 }
const sortNotes = (notes) => [...notes.filter((n) => n.kind === 'problem'), ...notes.filter((n) => n.kind !== 'problem').sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1))]

function stunNotes(family, report, T) {
  const notes = []
  if (!report.stunEnabled) notes.push({ kind: 'note', text: T.stunOff })
  if (family.notes.includes('dns_fake_ip')) notes.push({ kind: 'problem', code: 'dns_fake_ip', text: T.fakeIp }, { kind: 'note', code: 'dns_fake_ip_range', text: T.fakeIpDetail, detail: true })
  if (!family.consistent && family.seen.length > 1) notes.push({ kind: 'note', code: 'inconsistent', text: fill(T.consistent, { list: family.seen.join(T.sep) }) })
  return notes
}

function sourceNote(family, report, T) {
  if (!family.publicAddress) return null
  if (family.source === 'stun') {
    const first = family.servers.find((s) => s.answered && s.mapped)
    return first ? { kind: 'note', code: 'source', text: fill(T.source.stun, { server: hostOf(first.server) }) } : null
  }
  if (family.source === 'interface') {
    const owner = report.interfaces.find((i) => i.addresses.some((a) => a.address === family.publicAddress))
    return { kind: 'note', code: 'source', text: fill(T.source.interface, { name: owner?.name || '' }) }
  }
  return null
}

function familyRow(id, report, T, R) {
  const family = report[id]
  const { verdict, reasons } = report.reach[id]
  const tone = VERDICT_TONE[verdict]
  let fact = T.reach[verdict]
  const hidden = new Set()
  if (verdict === 'likely' && reasons.includes('session_evidence')) { fact = T.reach.likelySession; hidden.add('session_evidence') }
  else if (verdict === 'likely' && reasons.includes('hairpin_verified')) { fact = T.reach.likelyHairpin; hidden.add('hairpin_verified') }
  const notes = reasons.filter((r) => !hidden.has(parseReason(r).code)).map((r) => reasonNote(r, report, T, R))
  if (reasons.includes('ipv6_translated')) notes.push({ kind: 'note', code: 'ipv6_translated_kind', text: T.translatedDetail, detail: true })
  const source = sourceNote(family, report, T)
  return {
    id, icon: id === 'ipv4' ? 'public' : 'language', title: T.rows[id], verdict, word: T.verdicts[verdict], tone, badge: LOOK[tone], fact,
    address: family.publicAddress,
    notes: [...stunNotes(family, report, T), ...sortNotes(notes), ...(source ? [source] : [])],
  }
}

function natRow(report, T) {
  const nat = report.ipv4.nat
  const L = T.nat
  const key = nat.present === false ? 'none' : nat.mapping === 'endpoint-independent' ? 'endpoint-independent' : DEPENDENT.has(nat.mapping) ? 'dependent' : 'unknown'
  const tone = key === 'none' || key === 'endpoint-independent' ? 'ok' : key === 'dependent' ? 'info' : 'neutral'
  const notes = []
  if (DEPENDENT.has(nat.mapping)) notes.push({ kind: 'note', code: nat.mapping, text: L.kinds[nat.mapping], detail: true })
  if (nat.tests.length) {
    const tests = nat.tests.map((t) => fill(L.test, { name: t.name, mapped: t.mapped ? formatTransport(t.mapped) : L.noAnswer })).join(T.sep)
    const target = hostOf(nat.tests[0].target)
    notes.push({ kind: 'note', code: 'method', text: fill(L.method[nat.method] || L.method.none, { target, tests }), detail: true })
  }
  if (nat.varies) notes.push({ kind: 'note', code: 'varies', text: L.varies, detail: true })
  for (const code of nat.reasons) if (L.reasons[code]) notes.push({ kind: code === 'no_answer' ? 'problem' : 'note', code, text: L.reasons[code] })
  for (const n of stunNotes(report.ipv4, report, T)) if (n.code === 'dns_fake_ip') notes.unshift(n)
  if (nat.present !== false) notes.push({ kind: 'note', code: 'filtering', text: L.filtering, detail: true })
  return { id: 'nat', icon: 'swap_horiz', title: T.rows.nat, verdict: key, word: L.words[key], tone, badge: LOOK[tone], fact: L.facts[key], address: '', notes }
}

function cgnatRow(report, T) {
  const L = T.cgnat
  const { state, reasons } = report.cgnat
  const tone = state === 'yes' ? 'error' : state === 'no' ? 'ok' : 'neutral'
  const values = { wan: report.upnp.wanIp, seen: report.ipv4.publicAddress }
  // an unknown state whose sentence already names the cause does not say it again as a note
  const said = state === 'unknown' ? new Set(['no_igd', 'no_wan_ip']) : new Set()
  const notes = reasons.filter((code) => !said.has(code)).map((code) => ({ kind: 'note', code, text: fill(L.reasons[code], values) })).filter((n) => n.text)
  if (state === 'yes') notes.push({ kind: 'note', code: 'shared_range', text: fill(L.sharedRange, values), detail: true })
  if (report.upstream.state === 'yes' && state !== 'yes') notes.unshift({ kind: 'problem', code: 'double_nat', text: L.double, action: 'mesh' })
  const fact = state === 'unknown' ? L.unknownFacts[reasons.find((r) => L.unknownFacts[r]) || 'no_igd'] : L.facts[state]
  return { id: 'cgnat', icon: 'share', title: T.rows.cgnat, verdict: state, word: L.words[state], tone, badge: LOOK[tone], fact, address: '', notes }
}

function upnpRow(report, T) {
  const L = T.upnp
  const { available, wanIp, wanClass, mappings } = report.upnp
  const present = mappings.filter((m) => m.present).length
  const fact = available
    ? [wanIp ? fill(L.wan, { wan: wanIp, class: L.classes[wanClass] }) : '', mappings.length ? fill(L.mapped, { n: present, total: mappings.length }) : ''].filter(Boolean).join(' · ')
    : L.none
  const notes = report.hairpin.tried ? [{ kind: report.hairpin.ok ? 'good' : 'note', code: 'hairpin', text: report.hairpin.ok ? L.hairpin.ok : L.hairpin.failed }] : []
  const tone = available ? 'ok' : 'neutral'
  return { id: 'upnp', icon: 'router', title: T.rows.upnp, verdict: available ? 'on' : 'off', word: L.words[available ? 'on' : 'off'], tone, badge: LOOK[tone], fact, address: '', notes }
}

function firewallRow(report, T, R) {
  const L = T.firewall
  const { state, blocked } = report.firewall
  const tone = state === 'allowed' ? 'ok' : state === 'blocked' ? 'error' : 'neutral'
  const ports = blocked.map((p) => p.replace('/', ' ').toUpperCase()).join(T.sep)
  const notes = state === 'blocked' ? [{ kind: 'problem', code: 'firewall_blocked', text: fill(L.facts.blocked, { ports }), action: 'firewall', actionLabel: R.actions.firewall }] : []
  return { id: 'firewall', icon: 'shield', title: T.rows.firewall, verdict: state, word: L.words[state], tone, badge: LOOK[tone], fact: state === 'blocked' ? '' : L.facts[state], address: '', notes }
}

function addressLine(a, L) {
  const parts = [`${a.family === 6 ? 'IPv6' : 'IPv4'} ${a.address}`, L.scopes[a.scope]]
  if (a.family === 6) parts.push(L.lifetimes[a.lifetime])
  if (a.deprecated) parts.push(L.deprecated)
  return parts.filter(Boolean).join(' · ')
}

function interfacesRow(report, T) {
  const L = T.interfaces
  const shown = report.interfaces.filter((i) => i.up && !i.virtual)
  const hiddenCount = report.interfaces.filter((i) => i.up && i.virtual).length
  const egress = shown.find((i) => i.egress) || null
  const usable = (i) => i.addresses.filter((a) => a.scope !== 'link-local')
  const notes = []
  if (egress) for (const a of usable(egress)) notes.push({ kind: a.lifetime === 'temporary' ? 'note' : 'adapter', up: true, code: `addr:${a.address}`, text: addressLine(a, L) })
  for (const i of shown) {
    if (i === egress) continue
    const addresses = usable(i).map((a) => a.address).join(T.sep)
    notes.push({ kind: 'adapter', up: i.up, code: `if:${i.name}`, text: [i.name, i.mesh !== 'none' ? L.mesh : '', addresses].filter(Boolean).join(' · ') })
  }
  if (hiddenCount) notes.push({ kind: 'note', code: 'hidden', text: fill(L.hidden, { n: hiddenCount }) })
  const tone = egress ? 'ok' : shown.length ? 'neutral' : 'error'
  const fact = egress ? [egress.name, L.egress].join(' · ') : shown.length ? '' : L.none
  return { id: 'interfaces', icon: 'lan', title: T.rows.interfaces, verdict: egress ? 'egress' : 'none', word: fill(L.word, { n: shown.length }), tone, badge: LOOK[tone], fact, address: '', notes }
}

/** The lines of 网络概览 in their order, or null without a usable report. -> { checkedAt, rows: [{ id, icon, title, verdict, word, tone, badge, fact, address, notes }] } */
export function networkOverviewView(report, locale = 'en') {
  if (!report) return null
  const T = networkOverviewTexts(locale)
  const R = reachTexts(locale)
  const rows = [interfacesRow(report, T), familyRow('ipv4', report, T, R), familyRow('ipv6', report, T, R), natRow(report, T), cgnatRow(report, T), upnpRow(report, T), firewallRow(report, T, R)]
  for (const row of rows) {
    for (const n of row.notes) if (n.action && !n.actionLabel) n.actionLabel = T.actions[n.action] || R.actions[n.action] || ''
    // the plain meaning stays on the line; RFC names, tests and address ranges are under 详细信息, closed
    row.details = row.notes.filter((n) => n.detail)
    row.notes = row.notes.filter((n) => !n.detail)
  }
  return { checkedAt: clockText(report.checkedAt), rows, privacy: privacyLine(report, T) }
}

/** The privacy line: which third-party servers this check contacted, how long the result is kept, how to turn it off. */
export function privacyLine(report, T) {
  if (!report.stunEnabled) return T.stunOff
  if (!report.contacted.length) return ''
  const hosts = [...new Set(report.contacted.map(hostOf))].join(T.sep)
  return fill(T.privacy, { servers: hosts, minutes: Math.round((report.cacheSeconds || 600) / 60) })
}

/** The STUN servers each family asked, for the closed details under the lines. */
export function stunRows(report) {
  if (!report) return []
  return ['ipv4', 'ipv6'].flatMap((id) => report[id].servers.map((s) => ({ family: id === 'ipv4' ? 'IPv4' : 'IPv6', ...s, mappedText: formatTransport(s.mapped) })))
}

/** The one line of the list pane and of the doctor: IPv4 and IPv6 verdict words. */
export function networkOverviewSummary(report, locale = 'en') {
  if (!report) return ''
  const T = networkOverviewTexts(locale)
  return `IPv4 ${T.verdicts[report.reach.ipv4.verdict]} · IPv6 ${T.verdicts[report.reach.ipv6.verdict]}`
}
