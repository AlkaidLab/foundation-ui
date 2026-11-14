import { reactive } from 'vue'
import { mergeRects } from '../../devmode/shot.js'
import { collectAllRects } from '../../devmode/frameRects.js'
import { withCarriedLogs } from '../../devmode/feedback.js'
import { maskCapture, paintMasks } from '../../devmode/shotCanvas.js'

// The state of the report and sign-in sheets of the developer-mode flows. The product registers what only it can give (the screenshot, the log text, the environment, saving a file, opening an address),
// anything can open the sheets (the error dialog, the Issue page, the context menu), and one DevReportHost mounted at the root draws them.
//   The screenshot is redacted before the sheet exists: the marked boxes (data-redact) are measured around the capture and painted over (shot.js, shotCanvas.js); `shotBase` is that automatic result and the original is never kept.
//   The person adds boxes by hand on top of shotBase (`shotManual`); `shot` is always the exact image that will be sent. An automatic box cannot be removed.
//   providers: { mask(png, cssRects, view) and paint(png, rects) replace the canvas work (tests); capture() -> Uint8Array | null (PNG), logs() -> string, env() -> string, hostNames() -> string[], save(name, bytes, mime), openUrl(url), anon(report) -> 'sent' | 'queued' | 'rejected' | 'limited' }
const providers = {}
export const devReport = reactive({ open: false, kind: 'feedback', error: null, repo: '', shot: null, shotBase: null, shotAuto: [], shotManual: [], shotSize: null, shotFailed: false, shotMaskFailed: false, logs: '', env: '', signIn: false, token: 0, draft: { title: '', description: '' } })
export const registerDevReport = (next = {}) => { Object.assign(providers, next) }
export const devProviders = () => providers

async function safe(fn, fallback) { try { return (await fn?.()) ?? fallback } catch { return fallback } }

/** Opens the report. The screenshot and the log are taken now, before the sheet is drawn, so the screenshot shows the window as it was when it failed. */
export async function openDevReport({ kind = 'feedback', error = null, repo = '', draft = null, carriedLogs = '', carriedLabel = '' } = {}) {
  if (devReport.open) return
  devReport.kind = kind
  devReport.error = error
  devReport.repo = repo
  devReport.draft = { title: String(draft?.title || ''), description: String(draft?.description || '') }
  const view = () => ({ width: globalThis.innerWidth || 0, height: globalThis.innerHeight || 0, dpr: globalThis.devicePixelRatio || 1 })
  const boxes = async () => (typeof document === 'undefined' ? [] : (providers.collect || collectAllRects)(document, view()))
  // the boxes are measured before and after the capture (the window may move a little while it is taken); both count
  const before = await boxes()
  const [raw, logs, env] = await Promise.all([safe(providers.capture, null), safe(providers.logs, ''), safe(providers.env, '')])
  const rects = mergeRects([...before, ...(await boxes())])
  const masked = raw && raw.length ? await (providers.mask || maskCapture)(raw, rects, view()) : null
  devReport.shotBase = masked ? masked.bytes : null
  devReport.shot = masked ? masked.bytes : null
  devReport.shotAuto = masked ? masked.regions : []
  devReport.shotManual = []
  devReport.shotSize = masked ? { width: masked.width, height: masked.height } : null
  devReport.shotMaskFailed = !!(raw && raw.length && !masked)
  devReport.shotFailed = !devReport.shot
  // the log of the window as it is now, and the lines the error report carried from the time of the error
  devReport.logs = withCarriedLogs(logs, carriedLogs, carriedLabel)
  devReport.env = env
  devReport.token += 1
  devReport.open = true
}
export const closeDevReport = () => { devReport.open = false }

// the hand-drawn boxes: always painted on shotBase, so the automatic ones stay whatever is done here
let paintToken = 0
async function repaint() {
  const token = (paintToken += 1)
  const done = devReport.shotManual.length ? await (providers.paint || paintMasks)(devReport.shotBase, devReport.shotManual) : { bytes: devReport.shotBase }
  if (token !== paintToken) return
  if (done) devReport.shot = done.bytes
  else { devReport.shot = null; devReport.shotMaskFailed = true }
}
export async function addManualMask(rect) {
  const size = devReport.shotSize
  if (!size || !devReport.shotBase) return
  const x = Math.max(0, Math.round(rect.x)), y = Math.max(0, Math.round(rect.y))
  const w = Math.min(size.width - x, Math.round(rect.w)), h = Math.min(size.height - y, Math.round(rect.h))
  if (w < 4 || h < 4) return
  devReport.shotManual = [...devReport.shotManual, { x, y, w, h, kind: 'manual' }]
  await repaint()
}
export async function undoManualMask() { if (!devReport.shotManual.length) return; devReport.shotManual = devReport.shotManual.slice(0, -1); await repaint() }
export async function clearManualMasks() { if (!devReport.shotManual.length) return; devReport.shotManual = []; await repaint() }
export const openDevSignIn = () => { devReport.signIn = true }
export const closeDevSignIn = () => { devReport.signIn = false }
