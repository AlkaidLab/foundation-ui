// Versions and channel choice for the release metadata (schema 1, kind release-metadata, product foundation-sunshine).
//
// Real shape, read 2026-11-02 from https://www.alkaidlab.com/release-metadata/foundation-sunshine.json (the .cn copy is the same):
//   { schema: 1, kind, product, channels: { latest, "pre-latest" } }
//   channel: { version: "v2026.1031.121458.杂鱼", prerelease, githubReleaseId, publishedAt, releaseNotes, assets: [...] }
//   asset:   { type, name, size, sha256, url (cnb.cool), fallbackUrl (github.com) }
//   types seen: checksum-json, checksum-text, dualsense-sidecar-manifest, dualsense-sidecar-zip, windows-x64-portable, windows-x64-installer

import { compareVersions, parseVersion } from '../announcements/select.js'

export { compareVersions, parseVersion }

export const METADATA_PRODUCT = 'foundation-sunshine'
export const RELEASE_REPOSITORY = 'AlkaidLab/foundation-sunshine'
export const INSTALLER_TYPE = 'windows-x64-installer'
const DOWNLOAD_HOSTS = new Set(['github.com', 'cnb.cool'])
const MAX_VERSION_CHARS = 96
const MAX_NOTES_CHARS = 128 * 1024
const MAX_ASSETS = 64

/** "v2026.1031.121458.杂鱼" -> "2026.1031.121458.杂鱼" */
export const displayVersion = (value) => (typeof value === 'string' ? value.trim().replace(/^[vV](?=\d)/, '') : '')

export const releasePageUrl = (version) =>
  typeof version === 'string' && version.trim() ? `https://github.com/${RELEASE_REPOSITORY}/releases/tag/${encodeURIComponent(version.trim())}` : ''

const downloadUrl = (value) => {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || !DOWNLOAD_HOSTS.has(url.hostname)) return ''
    return url.href
  } catch {
    return ''
  }
}

const isoDate = (value) => {
  if (typeof value !== 'string') return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

const normalizeAsset = (asset) => {
  if (!asset || typeof asset !== 'object') return null
  const { type, name } = asset
  if (typeof type !== 'string' || typeof name !== 'string' || !type || !name || name.length > 200) return null
  const sha256 = typeof asset.sha256 === 'string' ? asset.sha256.replace(/^sha256:/i, '').trim().toLowerCase() : ''
  const size = Number.isSafeInteger(asset.size) && asset.size >= 0 ? asset.size : 0
  return {
    type,
    name,
    size,
    sha256: /^[0-9a-f]{64}$/.test(sha256) ? sha256 : '',
    url: downloadUrl(asset.url),
    fallbackUrl: downloadUrl(asset.fallbackUrl),
  }
}

const normalizeRelease = (entry) => {
  if (!entry || typeof entry !== 'object') return null
  const version = typeof entry.version === 'string' ? entry.version.trim() : ''
  if (!version || version.length > MAX_VERSION_CHARS || !parseVersion(version)) return null
  const assets = (Array.isArray(entry.assets) ? entry.assets.slice(0, MAX_ASSETS) : []).map(normalizeAsset).filter(Boolean)
  const installer = assets.find((asset) => asset.type === INSTALLER_TYPE && asset.sha256 && (asset.url || asset.fallbackUrl)) || null
  return {
    version,
    prerelease: entry.prerelease === true,
    id: Number.isSafeInteger(entry.githubReleaseId) && entry.githubReleaseId > 0 ? entry.githubReleaseId : null,
    publishedAt: isoDate(entry.publishedAt),
    notes: typeof entry.releaseNotes === 'string' ? entry.releaseNotes.slice(0, MAX_NOTES_CHARS) : '',
    releasePage: releasePageUrl(version),
    assets,
    installer,
  }
}

/**
 * The metadata document as the product needs it, or null when it is not a usable release-metadata file.
 * @returns {null | { latest: object | null, preLatest: object | null }}
 */
export const normalizeMetadata = (document) => {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return null
  if (document.schema !== 1 || document.kind !== 'release-metadata' || document.product !== METADATA_PRODUCT) return null
  const channels = document.channels
  if (!channels || typeof channels !== 'object' || Array.isArray(channels)) return null
  const latest = normalizeRelease(channels.latest)
  const preLatest = normalizeRelease(channels['pre-latest'])
  if (!latest && !preLatest) return null
  return { latest, preLatest }
}

const asNormalized = (metadata) =>
  metadata && typeof metadata === 'object' && 'latest' in metadata && 'preLatest' in metadata ? metadata : normalizeMetadata(metadata)

// Which of two releases is the newer one: release id, then publish time, then the numeric version (the order the panel's updater uses).
export const compareReleases = (left, right) => {
  if (left.id != null && right.id != null && left.id !== right.id) return left.id < right.id ? -1 : 1
  if (left.publishedAt && right.publishedAt && left.publishedAt !== right.publishedAt) return left.publishedAt < right.publishedAt ? -1 : 1
  const byVersion = compareVersions(left.version, right.version)
  if (byVersion) return byVersion
  if (left.prerelease !== right.prerelease) return left.prerelease ? -1 : 1
  return 0
}

const sameVersion = (a, b) => displayVersion(a).toLowerCase() === displayVersion(b).toLowerCase()

/**
 * Which release a product offers.
 * channel 'stable' offers `latest`; 'prerelease' offers the newer of `latest` and `pre-latest`.
 * @param {object} metadata raw document or the result of normalizeMetadata
 * @param {{ channel?: 'stable'|'prerelease', current?: string, skipped?: string, manual?: boolean, requireInstaller?: boolean }} [options]
 * @returns {{ status: 'invalid'|'none'|'latest'|'skipped'|'available', release: object | null, channel: 'stable'|'prerelease'|'', currentKnown: boolean }}
 */
export const pickRelease = (metadata, { channel = 'stable', current = '', skipped = '', manual = false, requireInstaller = false } = {}) => {
  const normalized = asNormalized(metadata)
  if (!normalized) return { status: 'invalid', release: null, channel: '', currentKnown: false }
  const usable = (release) => (release && (!requireInstaller || release.installer) ? release : null)
  const latest = usable(normalized.latest)
  const pre = usable(normalized.preLatest)
  let release = latest
  if (channel === 'prerelease' && pre) release = !latest || compareReleases(pre, latest) > 0 ? pre : latest
  if (!release) return { status: 'none', release: null, channel: '', currentKnown: false }

  const picked = release.prerelease ? 'prerelease' : 'stable'
  const currentKnown = parseVersion(current) !== null
  const order = currentKnown ? compareVersions(release.version, current) : 1
  if (order !== 1) return { status: 'latest', release, channel: picked, currentKnown }
  if (!manual && skipped && sameVersion(skipped, release.version)) return { status: 'skipped', release, channel: picked, currentKnown }
  return { status: 'available', release, channel: picked, currentKnown }
}

/** Which channel a version came from in this metadata ('' when it is in neither). */
export const channelOfVersion = (metadata, version) => {
  const normalized = asNormalized(metadata)
  if (!normalized || typeof version !== 'string') return ''
  for (const release of [normalized.preLatest, normalized.latest]) {
    if (release && sameVersion(release.version, version)) return release.prerelease ? 'prerelease' : 'stable'
  }
  return ''
}
