import { CLIENTS } from '../clients/catalogue.js'
import { clientUrl, recommendForOs } from '../clients/recommend.js'
import { osFromClientName } from '../clients/osFromName.js'

// When the client a person actually streams with is not one we recommend, the card at the top of the overview is a recommendation of a client instead of the star card (starCard.js): one short line
// (what they use and, when the system is known, what we recommend for it), ONE button, 下载客户端, that opens the client download page of this application (on that system when it is known), and 以后再说.
// Once per device; it never blocks; it takes the place of the star card while it is due for the device in use and comes only when that card would (after the first pairing or stream).
// The facts come from the host (docs/api/client-family.md of the host): `GET /api/clients/list` gives each paired device
//   { name, uuid, family, official, os, version, last_seen }   family: moonlight-vplus-android | moonlight-vplus-desktop | moonlight-macos-enhanced | voidlink | moonlight-upstream | unknown
//   official: true for the three AlkaidLab clients, false for VoidLink and upstream Moonlight, null when unknown    os: android | ios | tvos | macos | windows | linux | null
// The label is advisory. Only upstream Moonlight gets the recommendation; `unknown` has no answer and the star card stays. The system is the host's `os`, which it reads from the User-Agent and which
// upstream Moonlight often does not send (null); then what the name of the device says (Pixel 9 is Android); then none: the card still comes, its line names no system, and the button opens the download page as it opens anywhere.

/** The options per system, in the order shown: ids of the client catalogue. */
export const OPTIONS_BY_OS = Object.freeze({
  macos: ['macos-enhanced', 'vplus-desktop'],
  windows: ['vplus-desktop'],
  linux: ['vplus-desktop'],
  android: ['vplus-android'],
  ios: ['voidlink'],
  tvos: ['voidlink'],
})
const OS_WORD = { macos: 'macOS', windows: 'Windows', linux: 'Linux', android: 'Android', ios: 'iPhone / iPad', tvos: 'Apple TV' }
export const osWord = (os) => OS_WORD[os] || os

/** A client we recommend already: an official one, or VoidLink on an iPhone, an iPad or an Apple TV. */
export const isRecommended = (c) => !!c && (c.official === true || (c.family === 'voidlink' && (c.os === 'ios' || c.os === 'tvos')))

const same = (a, b) => !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase()
/** The client the person uses: the paired device of the session that runs (by its uuid, else by its name), else the one seen most recently (`last_seen`; a device that was never seen is the last choice). */
export function clientInUse({ clients = [], session = null } = {}) {
  const list = (clients || []).filter((c) => c && typeof c === 'object')
  if (!list.length) return null
  if (session) {
    const hit = list.find((c) => same(c.uuid, session.uuid)) || list.find((c) => session.name && c.name === session.name)
    if (hit) return hit
  }
  let best = null, at = -Infinity
  for (const c of list) { const t = Number.isFinite(Number(c.last_seen)) && c.last_seen !== null ? Number(c.last_seen) : -1; if (t >= at) { best = c; at = t } }
  return best
}

const keyOf = (c) => `${c.uuid || c.name || ''}`.toLowerCase()

/** The system of a device: the host's `os` when it is one we have a recommendation for, else what the name says (a guess), else null. */
export function systemOf(use) {
  const known = (os) => (os && OPTIONS_BY_OS[os] ? os : null)
  return known(use?.os) || known(osFromClientName(use?.name)) || null
}

/**
 * The recommendation for the client in use, or null. `use`: a device of the host's list; `done`: the keys already handled (per device).
 * Returns { key, name, app, family, os, osWord, options: [{ id, name, label, url }], platform }. `os` is null when neither the host nor the name says one: `options` is then empty and `osWord` ''
 * (the card names no system), `platform` is the platform of the download page that the recommended client of that system has, '' when there is no system (the page opens as it opens anywhere).
 */
export function clientRecommendation({ use, done = [], locale = 'en' } = {}) {
  if (!use || isRecommended(use) || use.family !== 'moonlight-upstream') return null
  const key = keyOf(use)
  if (!key || done.includes(key)) return null
  const os = systemOf(use)
  const options = (os ? OPTIONS_BY_OS[os] : []).map((id) => CLIENTS.find((c) => c.id === id)).filter(Boolean).map((c) => ({ id: c.id, name: String(c.name), label: String(c.label || c.name), url: clientUrl(c, locale) }))
  return { key, name: use.name, app: use.version ? `Moonlight ${use.version}` : 'Moonlight', family: use.family, os, osWord: os ? osWord(os) : '', options, platform: os ? recommendForOs(os)?.target?.platform || '' : '' }
}

// ---- once per device ----
const KEY = (storageKey) => `foundation-ui.clientrec.${storageKey}`
export function readClientRec(storageKey, storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(KEY(storageKey)) || 'null'); if (Array.isArray(v?.done)) return v.done.filter((x) => typeof x === 'string').slice(-64) } catch { /* corrupted: nothing handled */ }
  return []
}
export function markClientRec(storageKey, key, storage = globalThis.localStorage) {
  const done = [...new Set([...readClientRec(storageKey, storage), key])].slice(-64)
  try { storage?.setItem(KEY(storageKey), JSON.stringify({ done })) } catch { /* storage unavailable */ }
  return done
}
