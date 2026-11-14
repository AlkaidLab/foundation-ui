// Fetching the release metadata. ONE host is asked first; the mirror only when the first one failed (no race: a check is one request, not two). The request goes through
// the HTTP cache (ETag and Cache-Control are honoured by the browser), an answer is kept in memory for 30 minutes, and a check that is already running is joined, so a page that
// mounts again does not ask again. A missing file, an error status, an oversized body, text that is not JSON or JSON of another shape counts as no answer from that host.
//
// No cookies, no custom headers, no referrer, no query string, no identifiers of any kind.
//
// The panel's updater (Rust, `update/metadata.rs`) has its own request; this helper is for the places that read the metadata from the web view (the Web UI as a fallback,
// the channel lookup in the panel).

import { normalizeMetadata } from './versions.js'

export const METADATA_URLS = Object.freeze([
  'https://www.alkaidlab.com/release-metadata/foundation-sunshine.json',
  'https://www.alkaidlab.cn/release-metadata/foundation-sunshine.json',
])
export const MAX_METADATA_BYTES = 1024 * 1024
export const DEFAULT_TIMEOUT_MS = 8000
export const METADATA_TTL_MS = 30 * 60 * 1000
export const metadataUrlsFor = (locale) => (/^zh/i.test(String(locale || '')) ? [METADATA_URLS[1], METADATA_URLS[0]] : [...METADATA_URLS])
const memo = { key: '', at: 0, result: null, pending: null }
export const clearMetadataCache = () => { memo.key = ''; memo.at = 0; memo.result = null; memo.pending = null }

const usableUrls = (urls) => {
  const out = []
  for (const value of Array.isArray(urls) ? urls : []) {
    try {
      const url = new URL(value)
      if (url.protocol === 'https:' && !url.search && !url.hash && !url.username && !url.password) out.push(url.href)
    } catch {
      // Skipped.
    }
  }
  return out
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

class HostError extends Error {
  constructor(reason, status = 0) {
    super(`release metadata host: ${reason}`)
    this.reason = reason
    this.status = status
  }
}

const requestOne = async (fetchFn, url, signal) => {
  const aborted = new Promise((_, reject) => {
    const fail = () => reject(new HostError('timeout'))
    if (signal.aborted) fail()
    else signal.addEventListener('abort', fail, { once: true })
  })
  const work = (async () => {
    let response
    try {
      response = await fetchFn(url, { method: 'GET', cache: 'default', credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors', redirect: 'follow', signal })
    } catch {
      throw new HostError('network')
    }
    if (!response || !response.ok) throw new HostError('status', response ? response.status : 0)
    const declared = Number(response.headers?.get?.('content-length'))
    if (Number.isFinite(declared) && declared > MAX_METADATA_BYTES) throw new HostError('too-large')
    let text
    try {
      text = await response.text()
    } catch {
      throw new HostError('network')
    }
    if (typeof text !== 'string' || text.length > MAX_METADATA_BYTES) throw new HostError('too-large')
    let document
    try {
      document = JSON.parse(text)
    } catch {
      throw new HostError('malformed')
    }
    const metadata = normalizeMetadata(document)
    if (!metadata) throw new HostError('malformed')
    return metadata
  })()
  work.catch(() => {})
  return Promise.race([work, aborted])
}

/**
 * @returns {Promise<{ ok: true, metadata: object, url: string, host: string, fallback: boolean, failed: Array<{ host: string, reason: string, status: number }> }
 *   | { ok: false, reason: 'offline'|'absent'|'malformed'|'unavailable', failed: Array<{ host: string, reason: string, status: number }> }>}
 */
export const fetchReleaseMetadata = async ({ fetch: fetchFn = globalThis.fetch, urls = METADATA_URLS, timeoutMs = DEFAULT_TIMEOUT_MS, now = Date.now, ttlMs = METADATA_TTL_MS, force = false } = {}) => {
  const hosts = usableUrls(urls)
  if (hosts.length === 0 || typeof fetchFn !== 'function') return { ok: false, reason: 'unavailable', failed: [] }
  const key = hosts.join('\n')
  const t = typeof now === 'function' ? now() : now
  if (!force && memo.key === key && memo.result?.ok && t - memo.at >= 0 && t - memo.at < ttlMs) return memo.result
  if (memo.pending && memo.key === key) return memo.pending
  memo.key = key
  memo.pending = (async () => {
    const failed = []
    for (const [index, url] of hosts.entries()) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const metadata = await requestOne(fetchFn, url, controller.signal)
        const result = { ok: true, metadata, url, host: hostOf(url), fallback: index > 0 && failed.length > 0, failed: failed.slice() }
        memo.result = result; memo.at = t
        return result
      } catch (error) {
        const entry = { host: hostOf(url), reason: error instanceof HostError ? error.reason : 'network', status: error instanceof HostError ? error.status : 0 }
        failed.push(entry)
        // the file is not published: the mirror holds the same files, it is not asked
        if (entry.status === 404 || entry.status === 410) break
      } finally {
        clearTimeout(timer)
      }
    }
    const reasons = failed.map((entry) => entry.reason)
    const absent = failed.length > 0 && failed.every((entry) => entry.status === 404 || entry.status === 410)
    const reason = absent ? 'absent' : reasons.includes('malformed') ? 'malformed' : reasons.every((r) => r === 'network' || r === 'timeout') ? 'offline' : 'unavailable'
    return { ok: false, reason, failed }
  })().finally(() => { memo.pending = null })
  return memo.pending
}
