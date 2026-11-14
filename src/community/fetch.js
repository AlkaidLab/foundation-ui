// Fetching the community links file. It sits beside the announcements file and is fetched the same way: ONE host is asked first, the mirror only when the
// first failed (a missing file, 404, is an answer), through the HTTP cache (the browser revalidates with the ETag and honours Cache-Control by itself),
// the answer kept locally for at least 30 minutes in a storage the windows share, the network asked at most once per app start plus a manual refresh.
// Developer mode (`foundation-ui.dev` = 1) may point to a local source with `foundation-ui.community.source`.
//
// No cookies, no custom headers, no referrer, no query string, no identifiers of any kind.

import { CACHE_TTL_MS, DEFAULT_TIMEOUT_MS, MIN_GAP_MS, STALE_MAX_MS, askHosts, usableUrls } from '../announcements/fetch.js'
import { DEV_KEY, readFlag, readRecord, writeRecord } from '../announcements/store.js'
import { isCommunityDocument, parseCommunity, toDocument } from './schema.js'

export const COMMUNITY_URLS = Object.freeze([
  'https://www.alkaidlab.com/release-metadata/foundation-sunshine-community.json',
  'https://www.alkaidlab.cn/release-metadata/foundation-sunshine-community.json',
])
/** The same files, the .cn host first for a Chinese interface. */
export const communityUrlsFor = (locale) => (/^zh/i.test(String(locale || '')) ? [COMMUNITY_URLS[1], COMMUNITY_URLS[0]] : [...COMMUNITY_URLS])

export const COMMUNITY_CACHE_KEY = 'foundation-ui.community.cache'
export const COMMUNITY_ATTEMPT_KEY = 'foundation-ui.community.attempt'
export const COMMUNITY_SOURCE_KEY = 'foundation-ui.community.source'

const memory = { at: 0, key: '', links: null }
const asked = { done: false }
const inflight = new Map()

export const clearCommunityCache = () => {
  memory.at = 0
  memory.key = ''
  memory.links = null
  asked.done = false
  inflight.clear()
}

const readCache = (storage) => {
  const value = readRecord(storage, COMMUNITY_CACHE_KEY)
  return value && Number.isFinite(value.at) && isCommunityDocument(value.document) ? value : null
}
const readAttempt = (storage) => {
  const value = Number(readRecord(storage, COMMUNITY_ATTEMPT_KEY, 64))
  return Number.isFinite(value) && value > 0 ? value : null
}
const store = (links, key, at, storage) => {
  memory.at = at
  memory.key = key
  memory.links = links
  writeRecord(storage, COMMUNITY_CACHE_KEY, { at, document: toDocument(links) })
}
const staleLinks = (storage, t) => {
  const cached = readCache(storage)
  if (!cached || t - cached.at < 0 || t - cached.at > STALE_MAX_MS) return {}
  return parseCommunity(cached.document)
}

/**
 * The links the file gives ({} when it gives none: not published, unreachable, unusable). Never throws; the build's own addresses stay in use then.
 */
export const fetchCommunity = async ({
  fetch: fetchFn = globalThis.fetch,
  urls = COMMUNITY_URLS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = Date.now,
  storage = (() => { try { return globalThis.localStorage ?? null } catch { return null } })(),
  ttlMs = CACHE_TTL_MS,
  force = false,
} = {}) => {
  try {
    const clock = () => (typeof now === 'function' ? now() : now)
    const source = readFlag(storage, DEV_KEY) === '1' ? readFlag(storage, COMMUNITY_SOURCE_KEY) : ''
    const hosts = usableUrls(source ? [source] : urls, { dev: !!source })
    if (hosts.length === 0 || typeof fetchFn !== 'function') return {}
    const key = hosts.join('\n')
    const t = clock()

    if (!inflight.has(key) && !force) {
      if (memory.links && memory.key === key && t - memory.at >= 0 && t - memory.at < ttlMs) return { ...memory.links }
      const cached = readCache(storage)
      if (cached && t - cached.at >= 0 && t - cached.at < ttlMs) {
        const links = parseCommunity(cached.document)
        memory.at = cached.at
        memory.key = key
        memory.links = links
        return { ...links }
      }
      const last = readAttempt(storage)
      if (asked.done || (last !== null && t - last >= 0 && t - last < MIN_GAP_MS)) return memory.links ? { ...memory.links } : staleLinks(storage, t)
    }

    let pending = inflight.get(key)
    if (!pending) {
      asked.done = true
      writeRecord(storage, COMMUNITY_ATTEMPT_KEY, clock())
      pending = (async () => {
        const result = await askHosts(fetchFn, hosts, timeoutMs, isCommunityDocument)
        if (result.ok) {
          const links = parseCommunity(result.document)
          store(links, key, clock(), storage)
          return links
        }
        if (result.absent) {
          store({}, key, clock(), storage)
          return {}
        }
        return staleLinks(storage, clock())
      })().finally(() => inflight.delete(key))
      inflight.set(key, pending)
    }
    return { ...(await pending) }
  } catch {
    return {}
  }
}
