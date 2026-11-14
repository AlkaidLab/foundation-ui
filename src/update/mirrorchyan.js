// MirrorChyan (Mirror酱) as the updater's client sees it: the request it makes, the answer, and every error code as a plain sentence key. Pure: the HTTP call is somebody else's (the control
// panel's native side, which keeps the CDK in the operating system's secure store; the CDK never reaches this code). The tests use a mock transport and never call the service.
//   GET https://mirrorchyan.com/api/resources/foundation-sunshine/latest?current_version=&cdk=&os=win&arch=x64&channel=stable|beta&user_agent=foundation-sunshine-panel
// The answer is { code, msg, data }: code 0 is success, above 0 a business error, below 0 an unexpected one. `data.url` is present only with a valid CDK and an update; its absence is not a failure.
export const MIRRORCHYAN_RID = 'foundation-sunshine'
export const MIRRORCHYAN_BASE = 'https://mirrorchyan.com/api/resources'
export const MIRRORCHYAN_AGENT = 'foundation-sunshine-panel'
/** Where a person gets a CDK for this project (the project page of Mirror酱, opened in the browser). */
export const MIRRORCHYAN_CDK_URL = `https://mirrorchyan.com/zh/projects?rid=${MIRRORCHYAN_RID}`

/** The request URL. `cdk` is added only when given; this is for the native side and the tests, never for logging. */
export function mirrorchyanUrl({ currentVersion = '', cdk = '', channel = 'stable', os = 'windows', arch = 'amd64' } = {}) {
  const q = new URLSearchParams()
  q.set('current_version', String(currentVersion || ''))
  if (cdk) q.set('cdk', String(cdk))
  q.set('os', os === 'win' ? 'windows' : os)
  q.set('arch', arch === 'x64' ? 'amd64' : arch)
  q.set('channel', channel === 'beta' ? 'beta' : 'stable')
  q.set('user_agent', MIRRORCHYAN_AGENT)
  return `${MIRRORCHYAN_BASE}/${MIRRORCHYAN_RID}/latest?${q.toString()}`
}

/** The documented error codes (github.com/MirrorChyan/docs, ErrorCode.md) -> what happened. Anything else is `unknown`; a negative code is `server`. */
export const ERROR_KINDS = Object.freeze({
  1001: 'params', 7001: 'cdk-expired', 7002: 'cdk-invalid', 7003: 'cdk-limit', 7004: 'cdk-type', 7005: 'cdk-banned',
  8001: 'no-resource', 8002: 'params', 8003: 'params', 8004: 'params', 8009: 'cdk-test', 1: 'unknown',
})
export const errorKindOf = (code) => (Number(code) < 0 ? 'server' : ERROR_KINDS[Number(code)] || 'unknown')

/**
 * The answer as the updater uses it. -> { ok: true, version, channel, notes, downloadUrl, hasDownload, cdk: { state: 'valid' | 'none', expiresAt } }
 * or { ok: false, kind, code, message } (kind from ERROR_KINDS, `network` when there was no answer at all, `malformed` for a body that is not one). An answer with no `url` is still ok.
 */
export function parseMirrorAnswer(answer, { hadCdk = false } = {}) {
  if (!answer || typeof answer !== 'object') return { ok: false, kind: 'network', code: 0, message: '' }
  const status = Number(answer.status) || 200
  const body = answer.json !== undefined ? answer.json : answer.body
  if (!body || typeof body !== 'object' || typeof body.code !== 'number') return { ok: false, kind: status === 0 ? 'network' : 'malformed', code: 0, message: '' }
  if (body.code !== 0) return { ok: false, kind: errorKindOf(body.code), code: body.code, message: typeof body.msg === 'string' ? body.msg.slice(0, 120) : '' }
  const d = body.data && typeof body.data === 'object' ? body.data : {}
  const url = typeof d.url === 'string' && /^https:\/\//.test(d.url) ? d.url : ''
  const expires = Number(d.cdk_expired_time)
  return {
    ok: true, version: String(d.version_name || ''), channel: d.channel === 'beta' ? 'beta' : 'stable', notes: typeof d.release_note === 'string' ? d.release_note.slice(0, 20000) : '',
    downloadUrl: url, hasDownload: !!url,
    cdk: hadCdk && Number.isFinite(expires) && expires > 0 ? { state: 'valid', expiresAt: expires * (expires < 1e12 ? 1000 : 1) } : { state: hadCdk && url ? 'valid' : 'none', expiresAt: null },
  }
}

/**
 * The client behind an interface: `transport({ currentVersion, channel })` does the HTTP call on the native side with the stored CDK and resolves { status, json } (or rejects).
 *   check()  -> parseMirrorAnswer(...)    (a version check; with a CDK also the download address)
 *   cdkStatus() -> { state: 'none' | 'valid' | 'expired' | 'invalid' | 'limit' | 'banned' | 'type' | 'test' | 'unknown' | 'offline', expiresAt, kind }
 */
export function createMirrorChyanClient({ transport, hasCdk = async () => false }) {
  const run = async (args) => {
    try { return parseMirrorAnswer(await transport(args), { hadCdk: await hasCdk() }) } catch { return { ok: false, kind: 'network', code: 0, message: '' } }
  }
  return {
    check: (args = {}) => run({ currentVersion: '', channel: 'stable', ...args }),
    async cdkStatus(args = {}) {
      if (!(await hasCdk())) return { state: 'none', expiresAt: null, kind: '' }
      const r = await run({ currentVersion: '', channel: 'stable', ...args })
      if (r.ok) return { state: r.cdk.state === 'valid' ? 'valid' : 'unknown', expiresAt: r.cdk.expiresAt, kind: '' }
      const map = { 'cdk-expired': 'expired', 'cdk-invalid': 'invalid', 'cdk-limit': 'limit', 'cdk-banned': 'banned', 'cdk-type': 'type', 'cdk-test': 'test', network: 'offline' }
      return { state: map[r.kind] || 'unknown', expiresAt: null, kind: r.kind }
    },
  }
}
