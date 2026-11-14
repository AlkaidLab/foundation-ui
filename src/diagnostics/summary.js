import { redactAll } from './redact.js'
import { PRODUCT } from '../about/data.js'
import { formatRecord, isErrorRecord } from './record.js'

// The short problem summary (versions, environment, last error) for the clipboard and the prefilled bug report.
const REPO = PRODUCT.repo

const lastErrorOf = (f) => f.lastError || ((f.records || []).slice().reverse().find(isErrorRecord)?.body ?? '')
const logTailOf = (f) => f.logTail || (f.records || []).slice(-30).map(formatRecord).join('\n')

/**
 * @param {{ version?: string, channel?: string, panelVersion?: string, os?: string, gpu?: string[]|string, encoder?: string, lastError?: string, at?: string }} f
 * @param {{ network?: boolean, hostNames?: string[], clientNames?: string[] }} options
 */
export function problemSummary(f = {}, options = {}) {
  const gpu = Array.isArray(f.gpu) ? f.gpu.filter(Boolean).join(' / ') : f.gpu
  const lastError = lastErrorOf(f)
  const lines = [
    `${PRODUCT.name} ${[f.version, f.channel ? `(${f.channel})` : ''].filter(Boolean).join(' ')}`.trim(),
    f.panelVersion ? `Control panel ${f.panelVersion}` : '',
    [f.os, gpu, f.encoder].filter(Boolean).join(' · '),
    lastError ? `Last error${f.at ? ` (${f.at})` : ''}: ${String(lastError).split('\n')[0].slice(0, 300)}` : '',
  ].filter(Boolean)
  return redactAll(lines.join('\n'), { network: options.network !== false, hostNames: options.hostNames, clientNames: options.clientNames }).text
}

const MAX_URL = 7000
/**
 * The address of the project's bug report form with what we know already filled in (the form's own field ids). The product opens it in the
 * browser; the person reads and sends it there. Returns { url, truncated }.
 */
export function issueUrl(f = {}, { locale = 'en', network = true, hostNames = [], clientNames = [] } = {}) {
  const clean = (t) => redactAll(String(t || ''), { network, hostNames, clientNames }).text
  const base = `${REPO}/issues/new`
  const first = String(lastErrorOf(f) || '').split('\n')[0].slice(0, 90)
  const params = {
    template: /^zh/i.test(String(locale)) ? 'bug_report_zh.yml' : 'bug_report_en.yml',
    ...(first ? { title: `[Bug]: ${clean(first)}` } : {}),
    'sunshine-version': clean([f.version, f.channel ? `(${f.channel})` : ''].filter(Boolean).join(' ')),
    'os-version': clean(f.os),
    'gpu-model': clean(Array.isArray(f.gpu) ? f.gpu.join(' / ') : f.gpu),
    encoder: clean(f.encoder),
    additional: clean(problemSummary(f, { network: false })),
    logs: clean(logTailOf(f)),
  }
  const build = (p) => `${base}?${Object.entries(p).filter(([, v]) => v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
  let url = build(params)
  let truncated = false
  while (url.length > MAX_URL && params.logs.length > 80) {
    params.logs = params.logs.slice(Math.floor(params.logs.length * 0.25))
    truncated = true
    url = build(params)
  }
  return { url, truncated }
}
