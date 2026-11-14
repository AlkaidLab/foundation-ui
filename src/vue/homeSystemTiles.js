// The tiles that read the host's system information (GET /api/system/info) and its public address: 网卡, 系统, 公网地址. Nothing is invented: a tile is `null` while its source is not there.
// Sources are listed in docs/home-tiles.md.
import { endpointsOfConfig, reachView } from '../settings/reachability.js'

export const SYSTEM_META = { net: ['host', 'off', 4, 'card', 'widget'], sys: ['host', 'off', 2, 'card', 'widget'], 'public-address': ['host', 'off', 4, 'card', 'widget'] }
export const SYSTEM_SIZES = { net: { s: [2, 1], m: [4, 1], l: [4, 2] }, sys: { s: [2, 1], m: [4, 1] }, 'public-address': { s: [2, 1], m: [4, 1], l: [4, 2] } }

const KIND_ICON = { ethernet: 'settings_ethernet', wifi: 'wifi', mesh: 'hub', virtual: 'dns', other: 'lan' }
export const speedText = (mbps) => (!mbps ? '' : mbps >= 1000 ? `${+(mbps / 1000).toFixed(mbps % 1000 ? 1 : 0)} Gbps` : `${mbps} Mbps`)
const kindWord = (T, kind) => T[`nic_${kind}`] || T.nic_other

/** Whether the host's check found a problem with the public address that was set (an unset address is not a problem; clients then use the address that is found). */
/** The public address has a fault the person can fix: a name that does not resolve, an address that is not the router's, another device answering, or only private addresses. */
export const reachProblemOf = (report) => {
  const eps = report?.public?.endpoints || []
  if (eps.length) return eps.some((e) => e.error === 'dns_failed' || e.error === 'identity_mismatch' || e.reasons.includes('address_mismatch')) || eps.every((e) => e.scope === 'lan' || e.scope === 'loopback')
  const c = report?.public?.configured
  return !!c && (c.reasons || []).some((r) => r !== 'unset')
}

export function systemCatalogue(x, T) {
  const d = { net: null, sys: null, 'public-address': null }
  const si = x.sysinfo
  if (si && Array.isArray(si.nics)) {
    const nics = si.nics.filter((n) => n.up || n.is_default_route)
    const sorted = [...nics].sort((a, b) => Number(b.is_default_route) - Number(a.is_default_route) || Number(b.up) - Number(a.up))
    const main = sorted[0]
    if (main) {
      const row = (n) => ({ icon: KIND_ICON[n.type] || 'lan', title: n.name, sub: [kindWord(T, n.type), speedText(n.link_speed_mbps), (n.ipv4 || [])[0]].filter(Boolean).join(' · '), tone: n.up ? '' : 'warn', main: !!n.is_default_route })
      d.net = {
        type: 'nics', icon: 'lan', title: T.c_net, empty: T.netNone,
        primary: { icon: KIND_ICON[main.type] || 'lan', name: main.name, kind: kindWord(T, main.type), speed: speedText(main.link_speed_mbps), ipv4: (main.ipv4 || [])[0] || '', signal: main.wifi && Number.isFinite(main.wifi.signal) ? main.wifi.signal : null, ssid: main.wifi?.ssid_masked || '', isDefault: !!main.is_default_route, wifi: main.type === 'wifi' },
        rows: sorted.map(row),
        facts: [...(main.ipv6?.length ? [{ label: 'IPv6', value: main.ipv6[0] }] : []), ...(main.mac ? [{ label: T.nicMac, value: `${main.mac}:••:••:••` }] : []), { label: T.nicDefault, value: main.is_default_route ? T.yes : T.no }],
        labels: { signal: T.nicSignal, default: T.nicDefault },
      }
    }
  }
  if (si && si.os) d.sys = { type: 'rows', icon: 'computer', title: T.c_sys, big: si.os.name || '', rows: [{ icon: 'info', title: T.sysVersion, value: si.os.version || '–' }, { icon: 'tag', title: T.sysBuild, value: si.os.build || '–' }, { icon: 'dns', title: T.sysHost, value: si.host?.name || '–' }] }
  const view = x.reach ? reachView(x.reach, T.__locale || 'en') : null
  if (view || x.config) {
    const path = view?.paths.find((p) => p.id === 'public') || null
    const saved = endpointsOfConfig(x.config).join(', ')
    d['public-address'] = { type: 'address', icon: 'public', title: T['c_public-address'], saved, path, locale: T.__locale || 'en', texts: { edit: T.addrEdit, detect: T.addrCheck, checking: T.addrChecking, cancel: T.addrCancel, unset: T.addrUnset }, checking: !!x.reachChecking, canAct: x.canAct !== false }
  }
  return d
}
