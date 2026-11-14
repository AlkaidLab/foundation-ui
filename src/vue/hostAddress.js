import { validateEndpoint } from '../settings/reachability.js'

// The address a client types for this host, and the ports a base port stands for. Pure: no DOM, no Vue.
// The host (Sunshine) derives every port from one base port (`port`, 47989 by default): net::map_port(offset) in src/network.cpp, with the offsets
//   nvhttp PORT_HTTPS -5, PORT_HTTP 0, confighttp PORT_HTTPS +1 (the Web UI), stream VIDEO 9, CONTROL 10, AUDIO 11, MIC 12, rtsp RTSP_SETUP_PORT 21.
// Moonlight takes `host` or `host:port` in "add computer" (the port is the HTTP port, the base port); see docs/authority/source-index.tsv (moonlight-qt-computer-address-20261109).

export const DEFAULT_BASE_PORT = 47989
/** The host refuses a base port whose derived ports leave 1024..65535 (src/config.cpp: 1024 + PORT_HTTPS(-5) .. 65535 - RTSP_SETUP_PORT(21)); 1029 keeps the lowest one at 1024 or above. */
export const BASE_PORT_MIN = 1029
export const BASE_PORT_MAX = 65514

/** The ports of a base port, in the order a person meets them in a router or a firewall. `needed` is false for the Web UI: a stream does not use it. */
export const PORT_OFFSETS = Object.freeze([
  Object.freeze({ role: 'https', proto: 'tcp', offset: -5, needed: true }),
  Object.freeze({ role: 'http', proto: 'tcp', offset: 0, needed: true }),
  Object.freeze({ role: 'web', proto: 'tcp', offset: 1, needed: false }),
  Object.freeze({ role: 'rtsp', proto: 'tcp', offset: 21, needed: true }),
  Object.freeze({ role: 'video', proto: 'udp', offset: 9, needed: true }),
  Object.freeze({ role: 'control', proto: 'udp', offset: 10, needed: true }),
  Object.freeze({ role: 'audio', proto: 'udp', offset: 11, needed: true }),
  Object.freeze({ role: 'microphone', proto: 'udp', offset: 12, needed: true }),
])

/** A usable base port as a number, or 0. */
export const basePortOf = (value) => {
  const n = Number(value)
  return Number.isInteger(n) && n >= BASE_PORT_MIN && n <= BASE_PORT_MAX ? n : 0
}
export const isDefaultPort = (port) => !basePortOf(port) || Number(port) === DEFAULT_BASE_PORT

/** The ports for a base port: [{ role, proto, port, needed }]; a base port that is not usable gives the default ones. */
export function derivedPorts(base = DEFAULT_BASE_PORT) {
  const port = basePortOf(base) || DEFAULT_BASE_PORT
  return PORT_OFFSETS.map((p) => ({ role: p.role, proto: p.proto, port: port + p.offset, needed: p.needed }))
}

/** The Web UI port of a base port. */
export const webPort = (base = DEFAULT_BASE_PORT) => (basePortOf(base) || DEFAULT_BASE_PORT) + 1

/**
 * What a client types for `address` when the host's base port is `port`: the bare address for the default port (as always), `192.168.1.5:48989` otherwise,
 * `[fe80::1]:48989` for IPv6 with a port (a bare IPv6 address keeps no brackets). An address that already carries a port is left as it is.
 */
export function formatHostAddress(address, port = DEFAULT_BASE_PORT) {
  const text = String(address ?? '').trim()
  if (!text) return ''
  const own = validateEndpoint(text)
  if (own.ok && own.port) return own.text
  const host = own.ok ? own.host : text.replace(/^\[|\]$/g, '')
  const v6 = host.includes(':')
  if (isDefaultPort(port)) return host
  return `${v6 ? `[${host}]` : host}:${basePortOf(port)}`
}

/**
 * `host`, `host:port`, `[v6]:port` as a person types it in the client. The same rules as the host's own check of a public address (settings/reachability.js, validateEndpoint),
 * so the guide and the diagnostics page accept and refuse the same text. -> { ok, host, port (0 = not given), kind, error, warn, text }
 */
export const parseHostPort = validateEndpoint

/**
 * Whether `value` is a base port the host takes. `value` is what was typed. -> { ok, port, error: '' | 'format' | 'range' }
 * (a port that another program holds is only known after the host restarts: the host reports it then.)
 */
export function validateBasePort(value) {
  const text = String(value ?? '').trim()
  if (!/^\d{1,5}$/.test(text)) return { ok: false, port: 0, error: 'format' }
  const port = Number(text)
  return port >= BASE_PORT_MIN && port <= BASE_PORT_MAX ? { ok: true, port, error: '' } : { ok: false, port: 0, error: 'range' }
}

/** `47998` or `47998-48000` for a run of ports of one protocol; separate runs joined with commas. */
export function portRunText(ports) {
  const sorted = [...new Set(ports)].sort((a, b) => a - b)
  const runs = []
  for (const p of sorted) {
    const last = runs[runs.length - 1]
    if (last && p === last[1] + 1) last[1] = p; else runs.push([p, p])
  }
  return runs.map(([a, b]) => (a === b ? String(a) : `${a}-${b}`)).join(', ')
}
