// Community links file (version 1): validation and normalisation. Pure and framework-free. See docs/community.md for the format.
//
// The file carries the addresses of the project that change without a release (the QQ group, the documentation). It only ever replaces an
// address the build already knows: an id this build has no row for is ignored, and a link that does not validate leaves the bundled one in place.

export const SCHEMA_VERSION = 1
/** The rows whose address the file may replace, and the hosts an address of that row may have (a plain `https:` address of any host when null). */
export const COMMUNITY_LINKS = Object.freeze({
  qq: Object.freeze({ hosts: Object.freeze(['qm.qq.com', 'qun.qq.com']) }),
  docs: Object.freeze({ hosts: null }),
})
export const LIMITS = Object.freeze({ maxUrl: 500, maxFileBytes: 16 * 1024 })

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const parseUrl = (value, hosts) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > LIMITS.maxUrl) return null
  if (/[\u0000- \u007f-\u009f]/.test(value)) return null
  let url
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.port) return null
  if (hosts && !hosts.includes(url.hostname)) return null
  return url.href.length <= LIMITS.maxUrl ? url.href : null
}

/** The shape of the file: a schema-1 object with a `links` object. The links themselves are checked one by one by `parseCommunity`. */
export const isCommunityDocument = (value) => isPlainObject(value) && value.schema === SCHEMA_VERSION && isPlainObject(value.links)

/**
 * { qq: { url, zh? }, docs: { url, zh? } } of the links that are valid; a missing or broken one is simply absent.
 * `url` is the address for every interface language, `zh` (optional) the address for a Chinese interface (the mirror of the site).
 */
export const parseCommunity = (document) => {
  const out = {}
  if (!isCommunityDocument(document)) return out
  for (const id of Object.keys(COMMUNITY_LINKS)) {
    const entry = document.links[id]
    if (!isPlainObject(entry)) continue
    const url = parseUrl(entry.url, COMMUNITY_LINKS[id].hosts)
    if (!url) continue
    const link = { url }
    const zh = entry.zh === undefined ? null : parseUrl(entry.zh, COMMUNITY_LINKS[id].hosts)
    if (zh) link.zh = zh
    out[id] = link
  }
  return out
}

/** The document to keep in the local cache: only what validated. */
export const toDocument = (links) => ({ schema: SCHEMA_VERSION, links: { ...links } })

/**
 * The project rows with the file's addresses laid over them. A row keeps its other fields; a `zh` address of the file replaces the row's `zh`,
 * and a file `url` without a `zh` drops the row's own `zh` (it would otherwise still point at the old place).
 */
export const applyCommunity = (rows, links = {}) =>
  rows.map((row) => {
    const own = links[row.id]
    if (!own) return row
    const { zh, ...rest } = row // eslint-disable-line no-unused-vars
    return { ...rest, url: own.url, ...(own.zh ? { zh: own.zh } : {}) }
  })
