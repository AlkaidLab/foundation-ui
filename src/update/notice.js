// The notice of a waiting update, the one state behind the three places that show it: 「有更新可用」 in the caption bar, the red dot on the navigation item that holds 软件更新, and the same dot on the
// phone's 更多. It is kept from the last answer of the update check that already ran (the updater checks at its own interval, 4 hours; a person's 检查更新 is one more): nothing here asks the network.
//   available: the newest version a check found that is newer than the installed one (and not a version the person skipped); '' when there is none
//   seen:      the newest version whose 软件更新 the person has opened; the dot is on while available is newer than seen
// Opening 软件更新 clears the dot, not the line in the caption bar (the update is still waiting there); installing makes the installed version catch up and clears both; a newer version than the seen one brings the dot back.
import { compareVersions } from './versions.js'

export const NOTICE_KEY = 'foundation.update.notice'

const text = (value) => String(value || '').trim().replace(/^[vV](?=\d)/, '')
const newer = (a, b) => { const x = text(a), y = text(b); if (!x) return false; if (!y) return true; try { return compareVersions(x, y) > 0 } catch { return x !== y } }

/** What is remembered: { available, seen } (both version strings or ''). */
export function readNotice(storage) {
  try {
    const raw = JSON.parse(storage.getItem(NOTICE_KEY) || 'null')
    return { available: text(raw && raw.available), seen: text(raw && raw.seen) }
  } catch { return { available: '', seen: '' } }
}
export function writeNotice(storage, state) {
  try { storage.setItem(NOTICE_KEY, JSON.stringify({ available: text(state.available), seen: text(state.seen) })) } catch { /* not remembered */ }
}

/**
 * The view of the state for the installed version.
 *   waiting: an update is waiting (the caption line); dot: the red dot; version: the version that waits
 */
export function noticeView({ available = '', seen = '' } = {}, { installed = '', skipped = '' } = {}) {
  const version = text(available)
  const waiting = !!version && newer(version, installed) && !(skipped && text(skipped) === version)
  return { waiting, version: waiting ? version : '', dot: waiting && newer(version, seen) }
}

/** An answer of the update check: { version, is_latest } of the updater (the panel) or { state, version } of the Web UI. A newer version is remembered, "latest" and a failure-free older answer forget it. */
export function afterCheck(state, answer, { installed = '' } = {}) {
  const version = text(answer && answer.version)
  const latest = !!(answer && (answer.is_latest || answer.latest))
  if (latest || !version || !newer(version, installed)) return { ...state, available: '' }
  return { ...state, available: version }
}

/** The person opened 软件更新: the dot goes out for the version that waits now; a later, newer one brings it back. */
export const afterOpened = (state) => ({ ...state, seen: newer(state.available, state.seen) ? text(state.available) : state.seen })
