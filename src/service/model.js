// 系统 › Sunshine 服务: what the page shows for the three layers of the host (the SCM record of SunshineService, the sunshine.exe
// process, the answer of the host API), the start type choice and the confirmations of start, stop, restart and of a start type that
// leaves the host unreachable after a reboot. Pure: the panel passes the answer of `get_sunshine_service_status`; no DOM, no Vue.
//
//   layerRows(status, T)        -> [{ id: 'scm'|'process'|'api', icon, tone, title, value, facts: [[label, value]] }]
//   verdictOf(status, T)        -> { tone, icon, title, text }
//   startTypeOptions(T)         -> [{ value, label }]            the four SCM start types, in the order of services.msc
//   startTypeConfirm(type, T)   -> null | { title, text, action } Manual and Disabled need it (the backend refuses without it)
//   actionConfirm(kind, status, T) -> { title, text, action, danger, acknowledgeLiveStream }   kind: start | stop | restart | user-mode
//   availableActions(status)    -> { start, stop, restart }      which buttons are enabled
import { serviceTexts } from './texts.js'

export { serviceTexts }

export const START_TYPES = Object.freeze(['auto', 'delayed-auto', 'manual', 'disabled'])
const fill = (text, values) => String(text).replace(/\{(\w+)\}/g, (_, k) => (values[k] ?? ''))
const TONE = { running: 'ok', starting: 'info', stopping: 'info', stopped: 'warn', 'process-missing': 'error', 'api-silent': 'error', 'user-mode': 'info', 'not-installed': 'warn', 'foreign-service': 'error' }
const ICON = { ok: 'check_circle', info: 'info', warn: 'warning', error: 'error', neutral: 'help' }

/** The SCM error text of a Win32 exit code (a few the service can leave behind; otherwise the number). */
export function exitText(exit, T) {
  if (!exit) return T.exitNone
  const known = T.exitCodes[exit.code]
  const code = exit.serviceSpecific ? fill(T.exitSpecific, { code: exit.code }) : fill(T.exitWin32, { code: exit.code })
  return known ? `${known} · ${code}` : code
}

export function recoveryText(recovery, T) {
  if (!recovery) return T.unknown
  if (!recovery.actions?.length) return T.recoveryNone
  const parts = recovery.actions.slice(0, 3).map((a) => (a.kind === 'none' ? T.recoveryKinds.none : fill(T.recoveryAfter, { what: T.recoveryKinds[a.kind] || a.kind, s: Math.round((a.delayMs || 0) / 1000) })))
  return parts.join(' · ')
}

export function formatStart(ms, locale) {
  if (!ms) return ''
  try { return new Date(ms).toLocaleString(String(locale || '').startsWith('zh') ? 'zh-CN' : 'en-US', { hour12: false }) } catch { return new Date(ms).toISOString() }
}

export function verdictOf(status, T) {
  const verdict = status?.verdict || 'unknown'
  const tone = TONE[verdict] || 'neutral'
  const v = T.verdicts[verdict] || T.verdicts.unknown
  return { tone, icon: ICON[tone], title: v[0], text: v[1] }
}

export function layerRows(status, T, locale) {
  const scm = status?.scm || {}
  const proc = status?.process || {}
  const api = status?.api || {}
  const failing = status?.failingLayer || null
  const scmTone = !scm.installed ? 'warn' : !scm.belongsToInstall ? 'error' : scm.state === 'running' ? 'ok' : scm.state === 'stopped' ? (failing === 'scm' ? 'warn' : 'neutral') : 'info'
  const scmRow = {
    id: 'scm', icon: 'dns', tone: failing === 'scm' && scmTone === 'ok' ? 'warn' : scmTone, title: T.layers.scm,
    value: !scm.installed ? T.notInstalled : !scm.belongsToInstall ? T.foreign : T.states[scm.state] || T.unknown,
    facts: scm.installed ? [
      [T.facts.startType, T.startTypes[scm.startType] || T.unknown],
      [T.facts.lastExit, exitText(scm.lastExit, T)],
      [T.facts.recovery, recoveryText(scm.recovery, T)],
      [T.facts.account, scm.account || T.unknown],
      [T.facts.binary, scm.binaryPath || T.unknown],
    ] : [],
  }
  if (scm.error) scmRow.facts.push([T.facts.error, scm.error])
  const procRow = {
    id: 'process', icon: 'memory', tone: proc.running ? 'ok' : failing === 'process' ? 'error' : 'neutral', title: T.layers.process,
    value: proc.running ? fill(T.pid, { pid: proc.pid }) : T.processNone,
    facts: proc.running ? [
      [T.facts.startedAt, formatStart(proc.startedAtMs, locale) || T.unknown],
      [T.facts.parent, proc.childOfService ? T.parentService : T.parentOther],
    ] : [],
  }
  if (proc.error) procRow.facts.push([T.facts.error, proc.error])
  const apiRow = {
    id: 'api', icon: 'lan', tone: api.answers ? 'ok' : failing === 'api' ? 'error' : 'neutral', title: T.layers.api,
    value: api.answers ? fill(T.apiAnswers, { ms: api.latencyMs ?? '?' }) : T.apiSilent,
    facts: [[T.facts.http, api.httpStatus ? String(api.httpStatus) : api.error || T.unknown]],
  }
  return [scmRow, procRow, apiRow]
}

export const startTypeOptions = (T) => START_TYPES.map((value) => ({ value, label: T.startTypes[value] }))

/** Manual and Disabled: the host is not reachable after a reboot until someone starts it on this PC. */
export function startTypeConfirm(type, T) {
  if (type !== 'manual' && type !== 'disabled') return null
  return { title: fill(T.confirmStartType.title, { type: T.startTypes[type] }), text: T.confirmStartType.text, action: T.startTypes[type] }
}

export function availableActions(status) {
  const scm = status?.scm || {}
  const ours = !!scm.installed && !!scm.belongsToInstall
  const state = scm.state
  return {
    start: ours && state === 'stopped' && scm.startType !== 'disabled',
    stop: ours && (state === 'running' || state === 'start-pending'),
    restart: ours && state === 'running',
  }
}

/** The confirmation of start, stop or restart. Stop and restart warn about live streams; with any, the call must acknowledge them. */
export function actionConfirm(kind, status, T) {
  const live = Number(status?.liveStreams) || 0
  const c = T.confirm[kind]
  const lines = [c.text]
  if (kind !== 'start' && live > 0) lines.push(fill(T.liveWarning, { n: live }))
  if (kind === 'stop') lines.push(T.remoteWarning)
  return { title: c.title, text: lines.join('\n\n'), action: c.action, danger: kind !== 'start', acknowledgeLiveStream: kind !== 'start' && live > 0 }
}
