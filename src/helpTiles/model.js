// The four tiles at the top of 帮助与关于 (软件更新, 主机体检, 反馈问题, 客户端下载): what each one shows, as pure data. No DOM, no network: the product hands in what it already knows
// (the update check's answer, the last doctor result, the feedback reports kept on this computer) and the model says which lines the tile has and which line leaves first.
//
// One anatomy for all four, the small tile of the overview: the header (glyph and name), one value, one state line, one action. The state line has a main part and an `aux` part
// (a time, a second fact); the view drops `aux` first when the tile is narrow, then the action's words (the tile itself stays the button), and only then shrinks the value to its floor.
// The tile's size never depends on the state: every state fills the same lines, a part that is missing leaves its line empty.
import { afterOpened } from '../update/notice.js'

export const HELP_TILE_IDS = Object.freeze(['update', 'doctor', 'feedback', 'downloads'])
/** The states of the update tile: what the product's check says. */
export const UPDATE_STATES = Object.freeze(['idle', 'checking', 'available', 'latest', 'error'])

const text = (v) => String(v ?? '').trim()

/**
 * The short form of a version for a small tile: no leading v, no build metadata, and the build stamp of a date version cut off
 * (2026.1122.123456 -> 2026.1122). A channel suffix stays (1.0.9-rc.2): a pre-release must not look like the release.
 */
export function shortVersion(raw) {
  let v = text(raw).replace(/^[vV](?=\d)/, '').replace(/\+.*$/, '')
  const m = v.match(/^(\d{4}\.\d{3,4})\.\d{4,}(.*)$/)
  if (m) v = m[1] + m[2]
  return v
}

/**
 * 软件更新. `update` = { state, installed, next, checkedAt }: the state of the product's check, the installed version, the version that waits, when the last check ended (ms).
 * The action is on the tile: 检查 (idle, latest), 更新 (available: opens the update sheet), 重试 (error); while checking there is none.
 */
export function updateTile(update = {}, T, ago = () => '') {
  const state = UPDATE_STATES.includes(update.state) ? update.state : 'idle'
  const installed = shortVersion(update.installed)
  const next = shortVersion(update.next)
  const at = Number(update.checkedAt) > 0 ? Number(update.checkedAt) : 0
  const tile = { id: 'update', icon: 'system_update_alt', label: T.update, state, accent: '', busy: false, value: installed || '–', unit: '', sub: '', aux: '', action: { kind: 'check', label: T.actCheck } }
  if (state === 'checking') return { ...tile, busy: true, sub: T.checking, action: { kind: 'none', label: '' } }
  if (state === 'available') return { ...tile, accent: 'tertiary', value: next || installed || '–', sub: T.available, action: { kind: 'open', label: T.actUpdate } }
  if (state === 'error') return { ...tile, accent: 'warn', sub: T.failed, action: { kind: 'check', label: T.actRetry } }
  if (state === 'latest') return { ...tile, sub: T.upToDate, aux: at ? ago(at) : '' }
  return { ...tile, sub: at ? '' : T.notChecked, aux: at ? ago(at) : '' }
}

/**
 * 主机体检. `doctor` = the kept summary of the last check ({ at, counts: { pass, warn, fail, skip }, empty }) or null. A result says 正常 or the number of items that need a look
 * (warnings and failures); a check that found nothing out is not a result. The time is the aux part.
 */
export function doctorTile(doctor, T, ago = () => '') {
  const tile = { id: 'doctor', icon: 'health_and_safety', label: T.doctor, state: 'none', accent: '', busy: false, value: T.doctorNone, unit: '', sub: '', aux: '', action: { kind: 'run', label: T.actStart } }
  const c = doctor && !doctor.empty && doctor.counts ? doctor.counts : null
  if (!c || !(Number(doctor.at) > 0)) return tile
  const problems = (Number(c.warn) || 0) + (Number(c.fail) || 0)
  const aux = ago(Number(doctor.at))
  if (!problems) return { ...tile, state: 'ok', accent: 'ok', value: T.doctorOk, aux, action: { kind: 'run', label: T.actRerun } }
  return { ...tile, state: Number(c.fail) > 0 ? 'fail' : 'warn', accent: Number(c.fail) > 0 ? 'error' : 'warn', value: String(problems), unit: T.toFix, aux, action: { kind: 'run', label: T.actRerun } }
}

/**
 * 反馈问题. `feedback` = { unread, last }: the number of replies not read yet (the reply channel; absent where the product has none) and the last report this computer sent
 * ({ status: 'sent' | 'queued', ref }). Unread replies are the value; else the last report's state; else the plain fact that it is private.
 */
export function feedbackTile(feedback = {}, T) {
  const unread = Math.max(0, Math.floor(Number(feedback.unread) || 0))
  const last = feedback.last && (feedback.last.status === 'sent' || feedback.last.status === 'queued') ? feedback.last : null
  const tile = { id: 'feedback', icon: 'feedback', label: T.feedback, state: 'none', accent: '', busy: false, value: T.private, unit: '', sub: T.noAccount, aux: '', action: { kind: 'write', label: T.actWrite } }
  if (unread) return { ...tile, state: 'unread', accent: 'primary', value: String(unread), unit: T.repliesUnit, sub: '', action: { kind: 'replies', label: T.actReplies } }
  if (last) return { ...tile, state: last.status, value: last.status === 'sent' ? T.sent : T.queued, sub: last.ref ? `#${last.ref}` : '' }
  return tile
}

/** 客户端下载. `downloads` = { os, client }: the system the person last chose for connecting a device (its short name) and the client recommended for it. */
export function downloadsTile(downloads = {}, T) {
  return { id: 'downloads', icon: 'download', label: T.downloads, state: 'none', accent: '', busy: false, value: text(downloads.os) || '–', unit: '', sub: text(downloads.client), aux: '', action: { kind: 'open', label: T.actDownload } }
}

/** The four tiles, in the order of the row: 软件更新 first, so it is the first on a phone. */
export function helpTiles({ update, doctor, feedback, downloads } = {}, T, ago) {
  return [updateTile(update, T, ago), doctorTile(doctor, T, ago), feedbackTile(feedback, T), downloadsTile(downloads, T)]
}

/** What a screen reader hears: the name, the value with its unit, the state and the action. */
export function tileLabel(tile) {
  return [tile.label, [tile.value, tile.unit].filter(Boolean).join(' '), tile.sub, tile.aux, tile.action.label].filter(Boolean).join(' · ')
}

/**
 * Opening 软件更新 puts the update dot out for the version that waits (notice.js). Acting on the tile of an available update opens the sheet: that is opening it. A tile that
 * only shows the state (up to date, checking, failed) leaves the notice as it is: a check the person asked for records its own answer (afterCheck, then afterOpened).
 */
export function noticeAfterTile(noticeState, tile) {
  return tile && tile.id === 'update' && tile.state === 'available' && tile.action.kind === 'open' ? afterOpened(noticeState) : noticeState
}

/** The second line of 关于 in the list of 帮助与关于: the version, and the state of the update when one waits ("2026.1122 · 有新版本"). */
export function aboutLine(installed, update = {}, T) {
  const v = shortVersion(installed)
  if (update.state === 'available') return [v, T.available].filter(Boolean).join(' · ')
  return v
}
