// Where the update is looked for and downloaded from. The person chooses a SOURCE; the channel (stable or beta, the only two that exist) is chosen separately.
//   auto    our release metadata: in the Chinese interface the CNB mirror first and GitHub when that fails, in every other language GitHub first and the mirror when that fails (the default)
//   cnb     the CNB mirror only
//   github  GitHub only
//   mirror  Mirror酱 (MirrorChyan): with a CDK it answers the version and the download address; without one it only answers the version, and the download goes through CNB or GitHub from
//           our own release metadata. Whatever the source, the downloaded file is verified against the SHA-256 of OUR release metadata before it is installed.
export const UPDATE_SOURCES = Object.freeze(['auto', 'cnb', 'github', 'mirror'])
export const UPDATE_CHANNELS = Object.freeze(['stable', 'beta'])
export const DEFAULT_SOURCE = 'auto'
export const SOURCE_KEY = 'foundation.update.source'
export const normalizeSource = (value) => (UPDATE_SOURCES.includes(value) ? value : DEFAULT_SOURCE)
const isZh = (locale) => /^zh/i.test(String(locale || ''))
/**
 * The order the download hosts are tried in for a source. The Chinese interface tries the domestic mirror (CNB) first and GitHub when that fails; every other language GitHub first and CNB when that
 * fails. Mirror酱 downloads (CDK) are tried first only when the person chose it and has a valid CDK. The person is never told which host is tried first: a sentence appears only when one failed.
 */
export function downloadOrder(source, { hasCdk = false, locale = '' } = {}) {
  const s = normalizeSource(source)
  if (s === 'cnb') return ['cnb']
  if (s === 'github') return ['github']
  const hosts = isZh(locale) ? ['cnb', 'github'] : ['github', 'cnb']
  return s === 'mirror' && hasCdk ? ['mirror', ...hosts] : hosts
}
const hostOf = (url) => { try { const h = new URL(url).hostname; return h === 'cnb.cool' ? 'cnb' : h === 'github.com' ? 'github' : '' } catch { return '' } }
/** The two addresses of a file ({ url, fallbackUrl }, either host first) in the order of the source: { url: tried first, fallbackUrl: tried when that fails }. Addresses of other hosts, or an order that none of them is in, are left as they are. */
export function orderedDownloadUrls({ url = '', fallbackUrl = '' } = {}, { source, hasCdk = false, locale = '' } = {}) {
  const list = [url, fallbackUrl].filter(Boolean)
  const byHost = new Map(list.map((u) => [hostOf(u), u]))
  if (list.length === 0 || [...byHost.keys()].some((h) => !h)) return { url, fallbackUrl: fallbackUrl || null }
  const ordered = downloadOrder(source, { hasCdk, locale }).filter((h) => byHost.has(h)).map((h) => byHost.get(h))
  if (!ordered.length) return { url, fallbackUrl: fallbackUrl || null }
  return { url: ordered[0], fallbackUrl: ordered[1] || null }
}
/** The channels a person can pick: stable and beta. `dev` adds nothing: there is no third channel (developer mode does not create one). */
export const channelOptions = () => [...UPDATE_CHANNELS]
