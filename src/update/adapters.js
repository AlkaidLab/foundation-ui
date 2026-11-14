// From what a product already has to what the update sheet shows. Pure, no network, no DOM.

import { detectDriverNotes } from './drivers.js'
import { parseReleaseNotes } from './notes.js'

const str = (value) => (typeof value === 'string' ? value.trim() : '')

// Only https links to the two release hosts are ever handed to the "open in the browser" action.
const RELEASE_HOSTS = new Set(['github.com', 'cnb.cool'])
export const releaseLink = (value) => {
  try {
    const url = new URL(str(value))
    return url.protocol === 'https:' && !url.username && !url.password && RELEASE_HOSTS.has(url.hostname) ? url.href : ''
  } catch {
    return ''
  }
}

const finite = (value) => (Number.isFinite(value) && value >= 0 ? value : 0)

/**
 * The Control Panel's UpdateInfo (the Rust `UpdateInfo`: version, release_notes, download_url, download_fallback_url,
 * download_name, download_size, download_sha256, download_type, release_page, is_latest).
 */
export const sheetFromPanelInfo = (info, { current = '', channel = '' } = {}) => {
  if (!info || typeof info !== 'object') return null
  const notes = parseReleaseNotes(info.release_notes)
  const url = str(info.download_url)
  return {
    latest: info.is_latest === true,
    current: str(current),
    next: str(info.version),
    channel: channel === 'stable' || channel === 'prerelease' ? channel : '',
    notes,
    drivers: detectDriverNotes(notes),
    releasePage: releaseLink(info.release_page),
    installer: url
      ? {
          url,
          fallbackUrl: str(info.download_fallback_url),
          name: str(info.download_name),
          size: finite(info.download_size),
          sha256: str(info.download_sha256),
          type: str(info.download_type),
        }
      : null,
  }
}

/** A GitHub release object (tag_name, name, body, html_url, prerelease), what the Web UI's version check holds. */
export const sheetFromGithubRelease = (release, { current = '' } = {}) => {
  if (!release || typeof release !== 'object') return null
  const notes = parseReleaseNotes(release.body)
  return {
    latest: false,
    current: str(current),
    next: str(release.tag_name),
    channel: release.prerelease === true ? 'prerelease' : 'stable',
    notes,
    drivers: detectDriverNotes(notes),
    releasePage: releaseLink(release.html_url),
    installer: null,
  }
}

/**
 * The panel's `download-progress` event ({ progress 0..100, total, downloaded, phase, source }) as sheet props.
 * Connecting, retrying and a download of unknown length show the indeterminate wave.
 */
export const downloadView = (payload) => {
  const p = payload && typeof payload === 'object' ? payload : {}
  const phase = ['connecting', 'downloading', 'retrying', 'verifying', 'complete'].includes(p.phase) ? p.phase : 'connecting'
  const total = finite(p.total)
  let progress = null
  if (phase === 'downloading' && total > 0) progress = Math.min(1, finite(p.progress) / 100)
  else if (phase === 'verifying') progress = 0.99
  else if (phase === 'complete') progress = 1
  return { downloadPhase: phase, progress, downloaded: finite(p.downloaded), total, source: str(p.source) }
}
