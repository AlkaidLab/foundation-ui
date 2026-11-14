// An unexpected stop of the host (Sunshine). The panel notices that the host answered a moment ago and does not now, without anybody asking it to stop, and shows the error surface in its
// 「Sunshine 意外停止」 variant. What the host leaves behind (a minidump, its logs, a short info file) is the "latest crash bundle": the host side writes it, the panel reads it through an interface
// the product plugs in (setCrashBundleProvider). Nothing here needs a server: where no upload endpoint is set, the bundle is saved and a prefilled GitHub issue is offered; a send button is shown
// only when there is an endpoint to send to.
import { scrubText } from './scrub.js'
import { REPO_ISSUES_URL } from './report.js'

export const CRASH_KINDS = Object.freeze(['minidump', 'log', 'info'])
let provider = null
let endpoint = ''

/** () => Promise<null | { id, at (ms), reason?, files: [{ name, kind: 'minidump' | 'log' | 'info', size, read: () => Promise<Uint8Array | string> }] }> */
export const setCrashBundleProvider = (fn) => { provider = typeof fn === 'function' ? fn : null }
export const hasCrashBundleProvider = () => !!provider
/** The upload endpoint for crash bundles (https). Empty until a server exists: then nothing is offered that could not be sent. */
export const setCrashEndpoint = (url) => { endpoint = /^https:\/\/[^\s]+$/.test(String(url || '')) ? String(url) : '' }
export const crashEndpoint = () => endpoint
export const canUploadCrash = () => !!endpoint

export async function latestCrashBundle() {
  if (!provider) return null
  try {
    const b = await provider()
    if (!b || !Array.isArray(b.files)) return null
    const files = b.files.filter((f) => f && typeof f.name === 'string' && typeof f.read === 'function').map((f) => ({ name: String(f.name).replace(/[\\/]+/g, '_').slice(0, 80), kind: CRASH_KINDS.includes(f.kind) ? f.kind : 'info', size: Number.isFinite(f.size) ? f.size : 0, read: f.read }))
    return { id: String(b.id || ''), at: Number.isFinite(b.at) ? b.at : 0, reason: scrubText(String(b.reason || ''), 200), files }
  } catch {
    return null
  }
}

export const sizeText = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`)

/** The files of a bundle as rows for the surface: what is in it and how big. */
export const bundleRows = (bundle) => (bundle ? bundle.files.map((f) => ({ name: f.name, kind: f.kind, size: sizeText(f.size) })) : [])

// ---- a ZIP file without a library (stored, not compressed): the bundle as one file to download
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
export const crc32 = (bytes) => { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const enc = (s) => new TextEncoder().encode(s)
/** files: [{ name, data: Uint8Array }] -> Uint8Array of a .zip */
export function zip(files, now = new Date()) {
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff
  const chunks = []
  const central = []
  let offset = 0
  const u16 = (v) => new Uint8Array([v & 255, (v >>> 8) & 255])
  const u32 = (v) => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255])
  for (const f of files) {
    const name = enc(f.name)
    const crc = crc32(f.data)
    const head = [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(f.data.length), u32(f.data.length), u16(name.length), u16(0), name]
    const headLen = head.reduce((a, c) => a + c.length, 0)
    chunks.push(...head, f.data)
    central.push([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(f.data.length), u32(f.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name])
    offset += headLen + f.data.length
  }
  const centralStart = offset
  let centralLen = 0
  for (const c of central) { chunks.push(...c); centralLen += c.reduce((a, p) => a + p.length, 0) }
  chunks.push(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralLen), u32(centralStart), u16(0))
  const out = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0))
  let p = 0
  for (const c of chunks) { out.set(c, p); p += c.length }
  return out
}

/** A short text of the stop for the clipboard and for the info file of the bundle. */
export function crashText(bundle, { version = '', os = '', at = 0, locale = 'en' } = {}) {
  const when = new Date(bundle?.at || at || Date.now()).toISOString()
  const lines = [`Sunshine stopped unexpectedly (${when})`, `Foundation Sunshine ${version || '?'} · ${os || '?'}`]
  if (bundle?.reason) lines.push(`Reason: ${bundle.reason}`)
  lines.push('', bundle?.files?.length ? 'Files in the crash bundle:' : 'No crash bundle was found.')
  for (const f of bundle?.files || []) lines.push(`- ${f.name} (${f.kind}, ${sizeText(f.size)})`)
  return lines.join('\n')
}

/** The bundle as one file to save: every file of it, and `summary.txt`. A file that cannot be read is named in the summary, not silently left out. */
export async function bundleArchive(bundle, context = {}) {
  const files = []
  const missing = []
  for (const f of bundle?.files || []) {
    try { const d = await f.read(); files.push({ name: f.name, data: typeof d === 'string' ? enc(d) : d instanceof Uint8Array ? d : new Uint8Array(d) }) } catch { missing.push(f.name) }
  }
  const summary = `${crashText(bundle, context)}${missing.length ? `\n\nCould not be read: ${missing.join(', ')}` : ''}\n`
  files.unshift({ name: 'summary.txt', data: enc(summary) })
  const stamp = new Date(bundle?.at || context.at || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-')
  return { name: `foundation-sunshine-crash-${stamp}.zip`, mime: 'application/zip', bytes: zip(files), missing }
}

/** A GitHub issue for the stop, prefilled; the files are not in it (they are too big and private): the text says to attach the saved bundle. */
export function crashIssueUrl(bundle, context = {}) {
  const url = new URL(REPO_ISSUES_URL)
  url.searchParams.set('title', 'Sunshine stopped unexpectedly')
  const body = `${scrubText(crashText(bundle, context), 3500)}\n\nThe saved crash bundle (a .zip) is attached to this issue.`
  url.searchParams.set('body', body)
  return url.href
}

/** The upload (only called when an endpoint is set): one multipart request with the files. -> 'sent' | 'offline' | 'rejected' */
export async function uploadCrash(bundle, { fetch: fetchFn = globalThis.fetch, url = endpoint, context = {}, timeoutMs = 20000 } = {}) {
  if (!url || typeof fetchFn !== 'function') return 'offline'
  try {
    const form = new FormData()
    const archive = await bundleArchive(bundle, context)
    form.append('bundle', new Blob([archive.bytes], { type: archive.mime }), archive.name)
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : 0
    try {
      const r = await fetchFn(url, { method: 'POST', body: form, credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller?.signal })
      return r.ok ? 'sent' : r.status === 429 || r.status >= 500 ? 'offline' : 'rejected'
    } finally { if (timer) clearTimeout(timer) }
  } catch { return 'offline' }
}

/**
 * Is a stop unexpected? Fed with the connection states of the host: it is when the host was online and goes offline without this window having asked for a restart or an exit.
 * `expectRestart()` is called when the person asks for one (then the next offline is not a surprise).
 */
export function createHostStopWatch({ now = () => Date.now() } = {}) {
  let status = 'unknown'
  let expected = 0
  return {
    expectRestart(ms = 120_000) { expected = now() + ms },
    /** the product asked for a restart and its window has not run out */
    expected() { return now() < expected },
    /** -> null, or { at } on the step from online to offline. That step is only a silence: whether the host STOPPED is decided on facts of the operating system (status/hostLoss.js). */
    feed(next) {
      const before = status
      status = next
      if ((before === 'online' || before === 'connecting') && next === 'offline') return { at: now() }
      if (next === 'online') expected = 0
      return null
    },
  }
}
