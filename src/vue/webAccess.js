import { pickLanAddresses } from './guideModel.js'

// Pure model of the Web UI access scope (主机设置 › 网络 and the first-run flow): who may open the management page of this host, and the address a phone opens.
// The host keeps it in `origin_web_ui_allowed` ('pc' only this computer, 'lan' private networks, 'wan' anyone) and `bind_address` (empty: every interface). The page is HTTPS on the base port + 1.

export const WEB_ACCESS_SCOPES = Object.freeze(['pc', 'lan', 'wan'])
export const DEFAULT_BASE_PORT = 47989
/** the host answers `lan` when the key is unset or unknown */
export const scopeOf = (value) => (WEB_ACCESS_SCOPES.includes(String(value)) ? String(value) : 'lan')
export const webPortOf = (base) => (Number(base) > 0 ? Number(base) : DEFAULT_BASE_PORT) + 1
const hostText = (address) => (String(address).includes(':') && !String(address).startsWith('[') ? `[${address}]` : String(address))
export const webUrl = (address, base) => (address ? `https://${hostText(address)}:${webPortOf(base)}` : '')

/**
 * The addresses a phone can type: the listener's addresses, private LAN first. A bind address narrows them to that one address (nothing else answers).
 * -> [{ name, address, url, rank }]
 */
export function webAddresses(addresses, { bind = '', base = DEFAULT_BASE_PORT } = {}) {
  const picked = pickLanAddresses(addresses)
  const only = String(bind || '').trim()
  const list = only && !only.includes(':') ? picked.filter((a) => a.address === only) : picked
  const shown = only && !list.length && !only.includes(':') ? [{ name: '', address: only, rank: 0 }] : list
  return shown.map((a) => ({ ...a, url: webUrl(a.address, base) }))
}

/**
 * What changing the choice needs. `wan` needs a password first (`password` false: none is set; null/undefined: unknown, the host decides when it saves) and TWO confirmations in a row
 * (what it opens, then 「注意」 with what a guessed password costs).
 * -> { confirm, steps, blocked } for the new scope.
 */
export function scopeChange(from, to, { password = null } = {}) {
  const next = scopeOf(to)
  if (next === scopeOf(from)) return { confirm: false, steps: 0, blocked: false }
  if (next === 'wan') return password === false ? { confirm: false, steps: 0, blocked: true } : { confirm: true, steps: 2, blocked: false }
  return { confirm: false, steps: 0, blocked: false }
}

/**
 * Whether the host has to restart before the saved choice is the one in use. `active`/`saved` are the listener answer's objects; a host that does not report a key leaves it out,
 * then `local` (the choice was changed on this page since it loaded) decides.
 */
export function accessPending(active, saved, local = false) {
  if (!active || !saved) return !!local
  const keys = ['origin_web_ui_allowed', 'bind_address'].filter((k) => active[k] !== undefined && saved[k] !== undefined)
  if (!keys.length) return !!local
  return keys.some((k) => String(active[k] ?? '') !== String(saved[k] ?? ''))
}

/** The value a bind address typed by hand must be: empty (every interface) or an IPv4/IPv6 address. */
export const bindValid = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return true
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) return text.split('.').every((n) => Number(n) <= 255)
  return text.includes(':') && /^[0-9a-fA-F:.]+$/.test(text)
}
