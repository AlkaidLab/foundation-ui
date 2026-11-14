// Fetching the announcements file. It sits beside the release metadata. ONE host is asked first; the mirror is asked only when the first one failed
// (a missing file, 404, is an answer: the mirror holds the same files). The request goes through the HTTP cache (the browser revalidates with the ETag and honours
// Cache-Control by itself), the answer is kept locally for at least 30 minutes in a storage the panel's windows share, and the network is asked at most once per app
// start (a process) plus when the person refreshes by hand: a mount of the home page, a second window or a retry loop never asks again.
// Developer mode (`foundation-ui.dev` = 1 in the storage) may point to a local source with `foundation-ui.announcements.source`.
//
// No cookies, no custom headers, no referrer, no query string, no identifiers of any kind.

import { LIMITS, isAnnouncementDocument, parseAnnouncements, toDocument } from './schema.js'
import { DEV_KEY, SOURCE_KEY, readAttempt, readCache, readFlag, writeAttempt, writeCache } from './store.js'

export const ANNOUNCEMENT_URLS = Object.freeze([
  'https://www.alkaidlab.com/release-metadata/foundation-sunshine-announcements.json',
  'https://www.alkaidlab.cn/release-metadata/foundation-sunshine-announcements.json',
])
/** The same files, the .cn host first (a Chinese interface reads the mirror that is nearer). */
export const announcementUrlsFor = (locale) => (/^zh/i.test(String(locale || '')) ? [ANNOUNCEMENT_URLS[1], ANNOUNCEMENT_URLS[0]] : [...ANNOUNCEMENT_URLS])

export const CACHE_TTL_MS = 30 * 60 * 1000
// After a failed fetch the last good copy is still shown for this long.
export const STALE_MAX_MS = 24 * 60 * 60 * 1000
// Windows and page loads that share a storage ask the network at most once in this time (a failure counts: no retry loop).
export const MIN_GAP_MS = 30 * 60 * 1000
export const DEFAULT_TIMEOUT_MS = 8000

const memory = { at: 0, key: '', items: null }
// the network was asked in this process (an app start): it is not asked again except by hand
const asked = { done: false }
const inflight = new Map()

export const clearAnnouncementsCache = () => {
  memory.at = 0
  memory.key = ''
  memory.items = null
  asked.done = false
  inflight.clear()
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])
export const usableUrls = (urls, { dev = false } = {}) => {
  const out = []
  for (const value of Array.isArray(urls) ? urls : []) {
    try {
      const url = new URL(value)
      // A query string or fragment could carry an identifier: such urls are not used. Developer mode may use plain http on this computer.
      const scheme = url.protocol === 'https:' || (dev && url.protocol === 'http:' && LOOPBACK.has(url.hostname))
      if (scheme && !url.search && !url.hash && !url.username && !url.password) {
        out.push(url.href)
      }
    } catch {
      // Skipped.
    }
  }
  return out
}

export class HostError extends Error {
  constructor(status) {
    super(`host answered ${status}`)
    this.status = status
  }
}

// One host: resolves with the decoded document or rejects with a HostError (status 0 = no answer). `accept` says whether the decoded JSON is a document of the file asked for.
export const requestOne = async (fetchFn, url, signal, accept = isAnnouncementDocument) => {
  const aborted = new Promise((_, reject) => {
    const fail = () => reject(new HostError(0))
    if (signal.aborted) fail()
    else signal.addEventListener('abort', fail, { once: true })
  })
  const work = (async () => {
    const response = await fetchFn(url, {
      method: 'GET',
      cache: 'default',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      mode: 'cors',
      redirect: 'follow',
      signal,
    })
    if (!response || !response.ok) throw new HostError(response ? response.status : 0)
    const declared = Number(response.headers?.get?.('content-length'))
    if (Number.isFinite(declared) && declared > LIMITS.maxFileBytes) throw new HostError(0)
    const text = await response.text()
    if (typeof text !== 'string' || text.length > LIMITS.maxFileBytes) throw new HostError(0)
    let document
    try {
      document = JSON.parse(text)
    } catch {
      throw new HostError(0)
    }
    if (!accept(document)) throw new HostError(0)
    return document
  })()
  work.catch(() => {})
  return Promise.race([work, aborted])
}

// One host after the other: the first usable answer wins; the next host is asked only when the one before failed. Resolves { ok: true, document } or
// { ok: false, absent } where absent means the host said the file does not exist (the mirror holds the same files, so it is not asked).
export const askHosts = async (fetchFn, urls, timeoutMs, accept = isAnnouncementDocument) => {
  for (const url of urls) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return { ok: true, document: await requestOne(fetchFn, url, controller.signal, accept) }
    } catch (error) {
      const status = error instanceof HostError ? error.status : 0
      if (status === 404 || status === 410) return { ok: false, absent: true }
    } finally {
      clearTimeout(timer)
    }
  }
  return { ok: false, absent: false }
}

export const fetchAnnouncements = async ({
  fetch: fetchFn = globalThis.fetch,
  urls = ANNOUNCEMENT_URLS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = Date.now,
  storage,
  ttlMs = CACHE_TTL_MS,
  force = false,
} = {}) => {
  try {
    const clock = () => (typeof now === 'function' ? now() : now)
    // developer mode: a local source instead of the hosts
    const source = readFlag(storage, DEV_KEY) === '1' ? readFlag(storage, SOURCE_KEY) : ''
    const hosts = usableUrls(source ? [source] : urls, { dev: !!source })
    if (hosts.length === 0 || typeof fetchFn !== 'function') return []
    const key = hosts.join('\n')
    const t = clock()

    // a request that is running is joined, by whoever asks
    if (!inflight.has(key) && !force) {
      if (memory.items && memory.key === key && t - memory.at >= 0 && t - memory.at < ttlMs) {
        return memory.items.slice()
      }
      const cached = readCache(storage)
      if (cached && t - cached.at >= 0 && t - cached.at < ttlMs) {
        const items = parseAnnouncements(cached.document)
        memory.at = cached.at
        memory.key = key
        memory.items = items
        return items.slice()
      }
      // the network was asked in this process, or by another window a moment ago (a failure counts): what is kept is shown, nothing is asked
      const last = readAttempt(storage)
      if (asked.done || (last !== null && t - last >= 0 && t - last < MIN_GAP_MS)) return memory.items ? memory.items.slice() : staleItems(storage, t)
    }

    let pending = inflight.get(key)
    if (!pending) {
      asked.done = true
      writeAttempt(storage, clock())
      pending = (async () => {
        const result = await askHosts(fetchFn, hosts, timeoutMs)
        if (result.ok) {
          const items = parseAnnouncements(result.document)
          store(items, key, clock(), storage)
          return items
        }
        if (result.absent) {
          // The file is not published (yet): remember that for the same time as a real answer.
          store([], key, clock(), storage)
          return []
        }
        return staleItems(storage, clock())
      })().finally(() => inflight.delete(key))
      inflight.set(key, pending)
    }
    return (await pending).slice()
  } catch {
    return []
  }
}

const store = (items, key, at, storage) => {
  memory.at = at
  memory.key = key
  memory.items = items
  writeCache({ at, document: toDocument(items) }, storage)
}

const staleItems = (storage, t) => {
  const cached = readCache(storage)
  if (!cached || t - cached.at < 0 || t - cached.at > STALE_MAX_MS) return []
  return parseAnnouncements(cached.document)
}
