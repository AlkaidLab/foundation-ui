// The report of the developer-mode flows (F1 an error, F2 feedback): one composed thing the person sees whole before anything leaves the machine, and the three ways it can go:
//   local   no account: the diagnostics zip to download, a prefilled issue on GitHub's own page
//   github  with the GitHub account through the backend (a Worker): the attachments to private storage, the issue under the person's name. Needs the backend (config.js); without it 未配置
// Redaction happens here, in code: the text that is previewed is the text that is sent or zipped. Pure and framework-free.
import { redactAll } from '../diagnostics/redact.js'
import { zipStore } from '../diagnostics/zip.js'
import { scrubText } from '../telemetry/scrub.js'
import { stripPngMetadata } from './shot.js'
import { DEFAULT_REPO, newIssueUrl, repoOf } from './repos.js'
import { devBackend } from './config.js'
import { adoptHandle } from './signin.js'
import { autoFields, composeFormBody, envMap } from './feedbackForm.js'

export const LIMITS = Object.freeze({ title: 120, description: 4000, logBytes: 160_000, stackLines: 14, tailLines: 60 })
export const LOG_INPUT_MAX = 2_000_000
export const FILES = Object.freeze({ shot: 'screenshot.png', logs: 'logs.txt', dump: 'crash.dmp', env: 'environment.txt', report: 'report.md' })

const enc = new TextEncoder()
const clip = (text, n) => { const t = String(text ?? ''); return t.length > n ? `${t.slice(0, n - 1)}…` : t }

/**
 * One text through every redaction pass, in this order: the diagnostics redaction (secrets, then network identity, names, paths, serial numbers) and the telemetry scrub as the last
 * word (origins, tokens of any shape, the last things a rule above did not know). Never cut: the length limit is the caller's. -> { text, counts: { secrets, ips, names, paths, serials } }
 */
export function redactText(text, { hostNames = [], clientNames = [] } = {}) {
  const source = String(text ?? '')
  const r = redactAll(source, { network: true, hostNames, clientNames })
  const last = scrubText(r.text, Infinity)
  return { text: last, counts: { secrets: r.counts.secrets || 0, ips: r.counts.ips || 0, names: r.counts.names || 0, paths: r.counts.paths || 0, serials: r.counts.serials || 0 } }
}
const zero = () => ({ secrets: 0, ips: 0, names: 0, paths: 0, serials: 0, regions: 0 })
const sum = (a, b) => ({ secrets: a.secrets + b.secrets, ips: a.ips + b.ips, names: a.names + b.names, paths: a.paths + b.paths, serials: a.serials + (b.serials || 0), regions: a.regions + (b.regions || 0) })
export const totalOf = (counts) => counts.secrets + counts.ips + counts.names + counts.paths + (counts.serials || 0) + (counts.regions || 0)

/**
 * The text a report of an error starts with, so 内容 is never empty: what the error was, where, in which version, and a line for the steps the person fills in.
 * `report` is the error report (name, message, page, version, os, product), `texts` the words (draftError, draftPage, draftVersion, draftSteps). Plain text, redacted later with the rest.
 */
export function errorDraft(report = {}, texts = {}) {
  const T = { draftError: 'Error', draftPage: 'Page', draftVersion: 'Version', draftSteps: 'Steps to reproduce:', ...texts }
  const line = (label, value) => (value ? `${label}: ${value}` : '')
  const what = [report.name, report.message].filter(Boolean).join(': ')
  const where = [report.product, report.os].filter(Boolean).join(' · ')
  const head = [line(T.draftError, what), line(T.draftPage, report.page), line(T.draftVersion, [report.version, where && `(${where})`].filter(Boolean).join(' '))].filter(Boolean)
  return `${head.join('\n')}${head.length ? '\n\n' : ''}${T.draftSteps}\n`
}

/**
 * The log of a report of an error: the live log of the window (when the product can give it) and the lines the error report carried (already scrubbed, the tail at the time of the error).
 * Whichever is empty is left out; one that holds the other is not repeated.
 */
export function withCarriedLogs(live = '', carried = '', label = '') {
  const a = String(live || '').trim()
  const b = String(carried || '').trim()
  if (!b) return a
  if (!a) return b
  if (a.includes(b)) return a
  return `${a}\n\n${label ? `${label}\n` : ''}${b}`
}

export const sizeLabel = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`)
const tail = (text, lines) => String(text).split(/\r?\n/).slice(-lines).join('\n')

/**
 * @param {object} p
 * @param {'error'|'feedback'} p.kind
 * @param {string} p.repo repository id (repos.js)
 * @param {{ name?: string, message?: string, code?: string, fingerprint?: string, stack?: string, page?: string }} [p.error]
 * @param {string} [p.env] environment text (developer/envInfo.js environmentText)
 * @param {string} [p.logs] the log text of the window / host, not yet redacted
 * @param {Uint8Array|null} [p.screenshot] the PNG
 * @param {Uint8Array|null} [p.dump] a crash dump the person chose
 * @param {{ shot?: boolean, logs?: boolean, dump?: boolean }} [p.include] what rides along (the screenshot and the logs on by default for an error, the dump off)
 * @param {'bug'|'feature'} [p.form] which Issue Form of the repository the body is written as (feedbackForm.js); `locale` picks its language (Chinese: the zh form, otherwise the English one)
 * @param {string} [p.category] the problem type / feature category the person chose (matched to an option of the form; the closest one, or 其他); `steps` fills 复现步骤 (建议的解决方案 for a feature); `answers` {field id: text} fills any other field;
 *   `machine` {hostOs, osVersion, sunshineVersion, gpuVendor, gpuModel, encoder, clientDevice} what the application knows beyond the environment text
 * @returns {{ repo: string, title: string, body: string, files: object[], counts: object, total: number, problems: string[] }}
 */
export function composeReport({ kind = 'feedback', repo = DEFAULT_REPO, title = '', description = '', contact = '', error = null, env = '', logs = '', screenshot = null, dump = null, include = {}, hostNames = [], clientNames = [], shotRegions = { auto: 0, manual: 0 }, form = 'bug', locale = 'zh', category = '', steps = '', answers = {}, machine = {} } = {}) {
  const names = { hostNames, clientNames }
  let counts = zero()
  // redact first, cut after: a cut can never leave half of a secret that no rule would know any more
  const take = (text, max) => { const r = redactText(String(text ?? '').slice(0, max * 8), names); counts = sum(counts, r.counts); return clip(r.text, max) }
  const want = { shot: include.shot !== false, logs: include.logs !== false, dump: include.dump === true }
  const safeTitle = take(title || (error ? `${error.name || 'Error'}: ${error.message || ''}` : ''), LIMITS.title).trim()
  const text = take(description, LIMITS.description).trim()
  // what the form has no field for goes to the diagnostics section; what the form has a field for (the description, the steps, the problem type, the machine) is written there
  const diagnostics = { rows: [], attachments: [] }
  if (error) {
    const lines = String(error.stack || '').split(/\r?\n/)
    // a stack that starts with the message already said it above
    if (lines[0] && lines[0].includes(String(error.message || '\u0000'))) lines.shift()
    const stack = lines.length && lines.join('').trim() ? take(lines.slice(0, LIMITS.stackLines).join('\n'), 3000) : ''
    if (error.fingerprint) diagnostics.fingerprint = take(error.fingerprint, 120)
    for (const [k, v] of [['code', error.code], ['page', error.page]]) if (v) diagnostics.rows.push([k, take(v, 200)])
    diagnostics.error = `${take(`${error.name || 'Error'}: ${error.message || ''}`, 600)}${stack ? `\n${stack}` : ''}`
  }
  const envText = env ? take(env, 3000) : ''
  const e = envMap(envText)
  if (e.version) diagnostics.release = e.version
  for (const k of ['product', 'channel']) if (e[k]) diagnostics.rows.push([k, e[k]])
  if (envText) diagnostics.environment = envText
  const files = []
  // the whole log goes through every pass (the report shows its tail, the file holds all of it); the cut by size comes after the redaction would not matter, but a long one is bounded first
  const logText = want.logs && logs ? (() => { const r = redactText(String(logs).slice(-LOG_INPUT_MAX), names); return { text: r.text.slice(-LIMITS.logBytes), counts: r.counts } })() : null
  if (logText) counts = sum(counts, logText.counts)
  if (logText) diagnostics.log = tail(logText.text, LIMITS.tailLines)
  if (contact) diagnostics.contact = take(contact, 200)
  const add = (id, name, mime, bytes, extra = {}) => files.push({ id, name, mime, bytes, size: bytes.length, ...extra })
  // the picture goes out without any metadata, whatever the caller handed over; a file that is not a PNG is not sent
  const picture = want.shot && screenshot?.length ? stripPngMetadata(screenshot) : null
  if (picture) { counts = { ...counts, regions: counts.regions + (shotRegions.auto || 0) + (shotRegions.manual || 0) }; add('shot', FILES.shot, 'image/png', picture, { redacted: true, regions: (shotRegions.auto || 0) + (shotRegions.manual || 0) }) }
  if (logText) add('logs', FILES.logs, 'text/plain', enc.encode(logText.text), { redacted: true })
  if (want.dump && dump?.length) add('dump', FILES.dump, 'application/octet-stream', dump, { redacted: false, risk: true })
  diagnostics.attachments = files.map((f) => ({ name: f.name, size: sizeLabel(f.size) }))
  // the machine: what the application knows, redacted like every other text (a dropdown value is an option of the template and is not touched)
  const auto = Object.fromEntries(Object.entries(autoFields(envText, machine)).map(([k, v]) => [k, k === 'hostOs' || k === 'gpuVendor' ? v : take(v, 200)]))
  const formKind = form === 'feature' ? 'feature' : 'bug'
  const composed = composeFormBody({ form: formKind, locale, limit: LIMITS.description, values: { category, description: text, steps: take(steps, LIMITS.description).trim(), answers, auto }, diagnostics })
  const body = composed.body
  const problems = []
  if (!safeTitle) problems.push('title')
  if (kind === 'feedback' && !text) problems.push('description')
  return { kind, form: formKind, repo: repoOf(repo) ? repo : DEFAULT_REPO, title: safeTitle, body, labels: composed.labels, files, envText, counts, total: totalOf(counts), problems }
}

const two = (n) => String(n).padStart(2, '0')
export const zipName = (now = new Date()) => `foundation-report-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}.zip`

/** The no-account path: the report and what rides along as one zip (stored, no compression). -> { name, bytes, mime } */
export function reportZip(report, now = new Date()) {
  const list = [{ name: FILES.report, data: `# ${report.title}\n\n${report.body}\n` }]
  if (report.envText) list.push({ name: FILES.env, data: report.envText })
  for (const f of report.files) list.push({ name: f.name, data: f.bytes })
  return { name: zipName(now), bytes: zipStore(list, now), mime: 'application/zip' }
}

/** The issue page on GitHub with the text filled in; the attachments are not part of the address, so the text says where they are (the zip the person downloaded and drags in). */
export function reportIssueUrl(report, { zip = '' } = {}) {
  const note = zip ? `\n\n---\n${zip}` : ''
  return newIssueUrl(report.repo, { title: report.title, body: `${report.body}${note}`, labels: report.labels })
}

// ---------------------------------------------------------------- the backend path
const json = async (res) => { try { return await res.json() } catch { return {} } }
/**
 * Sends through the backend with the person's session. Never throws; the state says what happened:
 * unconfigured | signedout | sent | queued (no network) | limited | rejected
 */
export async function sendThroughBackend({ report, session, fetchImpl = (...a) => fetch(...a), backend = devBackend(), now = () => Date.now(), sessionStore = undefined } = {}) {
  if (!backend.configured) return { state: 'unconfigured' }
  if (!session?.handle) return { state: 'signedout' }
  const headers = { authorization: `Bearer ${session.handle}` }
  const attachments = []
  try {
    for (const f of report.files) {
      const url = `${backend.workerUrl}/feedback/attachment?name=${encodeURIComponent(f.name)}&repo=${encodeURIComponent(report.repo)}`
      const res = await fetchImpl(url, { method: 'POST', headers: { ...headers, 'content-type': f.mime }, body: f.bytes })
      adoptHandle(res, sessionStore)
      if (res.status === 401) return { state: 'signedout' }
      if (res.status === 429) return { state: 'limited' }
      if (!res.ok) return { state: 'rejected', status: res.status }
      const data = await json(res)
      attachments.push({ id: data.id, name: f.name, expires: data.expires_at || '' })
    }
    const res = await fetchImpl(`${backend.workerUrl}/feedback/issue`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ repo: report.repo, title: report.title, body: report.body, labels: report.labels || [], attachments: attachments.map((a) => a.id) }) })
    adoptHandle(res, sessionStore)
    if (res.status === 401) return { state: 'signedout' }
    if (res.status === 429) return { state: 'limited' }
    if (!res.ok) return { state: 'rejected', status: res.status }
    const data = await json(res)
    return { state: 'sent', number: data.number, url: data.url || '', attachments: data.attachments || attachments, at: now() }
  } catch {
    return { state: 'queued' }
  }
}
