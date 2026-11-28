// Component status: what both products show about the parts a stream depends on. The model is pure. A product reads its own sources
// (Tauri commands in the control panel, the host's HTTP routes in the Web UI), hands the answers over in the shapes below, and gets
// one row per component with a state, a version and a list of named checks. The same list is the result of the on-demand health check.
//
// state: ok | warn | error | missing | unknown ("unknown" = no answer, or the part does not exist on this system)
// check: { id, result: ok | warn | error | skip, value? }

// The components are the external ones: installed or updated separately from Sunshine, one card each (their version, their signature where it is known, whether they run, and the action
// that installs, updates or repairs them). What Sunshine has built in is not a component: the native DualSense path is the readiness line of the 手柄 page, the encoder is the 编码器 page,
// Sunshine itself is 关于 / 软件更新. Those checks stay (`FEED_IDS`) and feed their pages through `controller.feed(id)`.
export const COMPONENT_IDS = Object.freeze(['vdd', 'usb', 'vigem', 'mic', 'mouse', 'vulkan', 'dlssnr', 'rtxhdr', 'sparxie']) // sparxie stays on the component page, including when it is not installed, because that card is how it is installed
export const FEED_IDS = Object.freeze(['dualsense', 'encoder', 'host'])
/** The extension components: NVIDIA runtimes the person imports from a file they obtained themselves, each with the one DLL name it takes. */
export const EXTENSION_COMPONENTS = Object.freeze({ dlssnr: { dll: 'nvngx_dlssnr.dll', other: 'nvngx_truehdr.dll' }, rtxhdr: { dll: 'nvngx_truehdr.dll', other: 'nvngx_dlssnr.dll' } })
export const COMPONENT_ICONS = Object.freeze({ vdd: 'desktop_windows', usb: 'usb', vigem: 'gamepad', mic: 'mic', mouse: 'mouse', vulkan: 'hdr_on', dlssnr: 'wand_stars', rtxhdr: 'light_mode', sparxie: 'touch_app', dualsense: 'sports_esports', encoder: 'movie', host: 'cast_connected' })
// The component page and overview use the same icon and tone for each state.
const COMPONENT_STATE_APPEARANCE = {
  ok: { tone: 'ok', icon: 'check_circle' },
  warn: { tone: 'warn', icon: 'warning' },
  error: { tone: 'error', icon: 'error' },
  missing: { tone: 'neutral', icon: 'download' },
  unknown: { tone: 'neutral', icon: 'help' },
}
export const componentStateAppearance = (state) => Object.hasOwn(COMPONENT_STATE_APPEARANCE, state) ? COMPONENT_STATE_APPEARANCE[state] : COMPONENT_STATE_APPEARANCE.unknown
const RANK = { ok: 0, skip: 0, warn: 1, error: 2 }

const str = (v) => (v === null || v === undefined ? '' : String(v).trim())
const check = (id, result, value = '') => ({ id, result, ...(value !== '' ? { value: str(value) } : {}) })
const stateFrom = (checks) => (checks.reduce((worst, c) => Math.max(worst, RANK[c.result] ?? 0), 0) === 2 ? 'error' : checks.some((c) => c.result === 'warn') ? 'warn' : 'ok')
const unknownRow = (id, note = '') => ({ id, state: 'unknown', version: '', checks: [], note })
const missingRow = (id, checks = []) => ({ id, state: 'missing', version: '', checks, note: '' })
const finish = (id, checks, version = '', note = '') => ({ id, state: stateFrom(checks), version: str(version), checks, note })

/** Virtual display driver. raw: the answer of the VDD status (host `/api/vdd/status` or the panel's `get_vdd_status`). */
export function fromVdd(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('vdd')
  if (raw.installed === false) return missingRow('vdd', [check('installed', 'error')])
  const checks = [check('installed', 'ok')]
  checks.push(check('running', raw.running === false ? 'error' : raw.running === true ? 'ok' : 'skip'))
  checks.push(check('control', raw.control_available === false ? 'warn' : raw.control_available === true ? 'ok' : 'skip'))
  if (typeof raw.version_match === 'boolean') checks.push(check('version', raw.version_match ? 'ok' : 'warn', `${str(raw.installed_version)}${raw.version_match ? '' : ` → ${str(raw.bundled_version)}`}`))
  if (raw.problem_code_valid && Number(raw.problem_code) !== 0) checks.push(check('problem', 'error', raw.problem_code))
  else if (['failed', 'error', 'stopped'].includes(str(raw.state))) checks.push(check('state', 'error', raw.state))
  else if (str(raw.state) === 'degraded') checks.push(check('state', 'warn', raw.state))
  return finish('vdd', checks, raw.installed_version || raw.version)
}

/** USB/IP transport. raw: the panel's `usbip_get_status`. */
export function fromUsb(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('usb')
  if (raw.supported === false) return unknownRow('usb', 'unsupported')
  if (raw.installed === false) return missingRow('usb', [check('installed', 'error')])
  const checks = [check('installed', 'ok')]
  checks.push(check('version', raw.version_supported === false ? 'error' : 'ok', raw.version_supported === false && raw.pinned_version ? `${str(raw.version)} → ${str(raw.pinned_version)}` : raw.version))
  checks.push(check('signed', raw.signature === 'signed' ? 'ok' : raw.signature === 'unsigned' || raw.signature === 'invalid' ? 'error' : 'skip', raw.signer))
  checks.push(check('ready', raw.ready === false ? 'warn' : raw.ready === true ? 'ok' : 'skip'))
  if (raw.vhci_residual) checks.push(check('residual', 'warn'))
  return finish('usb', checks, raw.version)
}

/** DualSense channel. raw: { state, host: { reachable, tuning_available, native_compiled, native_active, active_controllers }, transport } as the panel reads it. */
export function fromDualsense(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('dualsense')
  const host = raw.host || {}
  const checks = [
    check('host', host.reachable === false ? 'warn' : host.reachable ? 'ok' : 'skip'),
    check('tuning', host.tuning_available === false ? 'warn' : host.tuning_available ? 'ok' : 'skip'),
    check('native', host.native_compiled === false ? 'warn' : host.native_compiled ? 'ok' : 'skip'),
  ]
  const t = raw.transport
  if (t && t.supported !== false) checks.push(check('transport', t.installed === false ? 'warn' : t.version_supported === false ? 'error' : t.ready === false ? 'warn' : t.installed ? 'ok' : 'skip', t.version))
  const state = str(raw.state)
  if (['usbip_version', 'usbip_unsigned'].includes(state)) checks.push(check('state', 'error', state))
  if (Number(host.active_controllers) > 0 || host.native_active) checks.push(check('controllers', 'ok', host.active_controllers || ''))
  return finish('dualsense', checks, t?.version)
}

/** ViGEmBus, the virtual gamepad driver. raw: the panel's `get_vigem_status` { installed, version, status_text }. The driver is signed by its publisher; the panel reads no signer for it. */
export function fromVigem(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('vigem')
  if (raw.installed === false) return missingRow('vigem', [check('installed', 'error')])
  return finish('vigem', [check('installed', 'ok'), check('version', str(raw.version) ? 'ok' : 'skip', raw.version)], raw.version)
}

/** The Zako virtual mouse driver. raw: the panel's `get_vmouse_status` { installed, running, status_text, config_enabled }; null where the host does not report one. */
export function fromMouse(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('mouse')
  if (raw.installed === false) return missingRow('mouse', [check('installed', 'error')])
  return finish('mouse', [check('installed', 'ok'), check('running', raw.running === false ? 'error' : raw.running ? 'ok' : 'skip', raw.running === false ? raw.status_text : ''), check('enabled', raw.config_enabled === false ? 'warn' : raw.config_enabled ? 'ok' : 'skip')], raw.version)
}

/** The Vulkan HDR compatibility component. raw: the host's `/api/vulkan-hdr-bridge` { state: idle | enabled | validating | error | unavailable, artifacts_installed, display_available }. */
export function fromVulkan(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('vulkan')
  if (raw.artifacts_installed === false || raw.state === 'unavailable') return missingRow('vulkan', [check('artifacts', 'error')])
  const checks = [check('artifacts', 'ok'), check('display', raw.display_available === false ? 'warn' : raw.display_available ? 'ok' : 'skip')]
  if (raw.state === 'error') checks.push(check('state', 'error', 'error'))
  return finish('vulkan', checks)
}

/**
 * The overview state of the microphone from the host's microphone status (`/api/microphone/status`, the panel's `get_virtual_microphone_status`):
 * the host's own states describe the USB microphone only; VB-CABLE reports `ready`. Same rules as the panel's microphone page.
 */
export function microphoneState(status) {
  const s = status && typeof status === 'object' ? status : {}
  if (s.state === 'unsupported') return 'unsupported'
  if (!s.configured_backend) return 'unknown'
  if (s.configured_backend === 'disabled') return 'disabled'
  if (s.active_backend === 'vb_cable') return 'active'
  if (s.state === 'device_faulted') return 'faulted'
  const usb = s.active_backend === 'usbip_experimental' || s.active_backend === 'usbip'
  if (usb && s.active_backend) {
    return { creating: 'starting', enumerating: 'starting', destroying: 'stopping', remote_active: 'streaming', host_capturing: 'capturing' }[s.state] || 'idle'
  }
  if (s.error_code && !s.active_backend) return s.error_code === 'MIC_USBIP_COMPONENT_UNAVAILABLE' ? 'missing' : 'faulted'
  if (s.configured_backend === 'usbip_experimental' && !s.component_available) return 'missing'
  return 'waiting'
}

/** Microphone device. raw: { state: the overview state of the microphone page, backend } (see microphoneOverviewState). */
export function fromMic(raw) {
  if (!raw || typeof raw !== 'object' || !raw.state) return unknownRow('mic')
  const s = str(raw.state)
  if (s === 'unsupported' || s === 'unknown' || s === 'disabled') return unknownRow('mic', s)
  if (s === 'missing') return missingRow('mic', [check('component', 'error')])
  const bad = s === 'faulted'
  const transient = ['starting', 'stopping'].includes(s)
  return finish('mic', [check('component', 'ok'), check('device', bad ? 'error' : transient ? 'warn' : 'ok', raw.backend || s)])
}

/** Encoder. raw: { active, hevc, av1 } from the host configuration (`active_encoder`, `hevc_mode`, `av1_mode`); null when the host did not answer. */
export function fromEncoder(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('encoder')
  const active = str(raw.active)
  if (!active) return finish('encoder', [check('active', 'warn')])
  const codecs = []
  if (raw.hevc !== undefined && str(raw.hevc) !== '' && str(raw.hevc) !== '1') codecs.push('HEVC')
  if (raw.av1 !== undefined && str(raw.av1) !== '' && str(raw.av1) !== '1') codecs.push('AV1')
  return finish('encoder', [check('active', 'ok', active), ...(codecs.length ? [check('codecs', 'ok', ['H.264', ...codecs].join(' · '))] : [])], '', active)
}

/** The host. raw: { version, reachable, update: 'available' | 'latest' | 'error' | '', next, running } */
export function fromHost(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('host')
  if (raw.reachable === false) return finish('host', [check('reachable', 'error')], raw.version)
  const checks = [check('reachable', raw.reachable ? 'ok' : 'skip')]
  checks.push(check('update', raw.update === 'available' ? 'warn' : raw.update === 'latest' ? 'ok' : raw.update === 'error' ? 'warn' : 'skip', raw.update === 'available' ? raw.next : ''))
  return finish('host', checks, raw.version)
}

/**
 * DLSS NR and RTX HDR (extension components). raw: the answer of the panel's `native_component_get_status` for the component:
 * { state, installed, enabled, in_use, maintenance, host_supported, adapter_present, vc_runtime_present, runtime_present, runtime_sha256 }. The version of such a component is the digest of the
 * file the person imported (it is recorded at the import and compared on every start). null/absent source (the Web UI has none) is "unknown".
 */
export function fromEnhancement(id, raw) {
  if (!raw || typeof raw !== 'object') return unknownRow(id)
  const digest = str(raw.runtime_sha256).toLowerCase()
  const short = digest ? `sha256:${digest.slice(0, 12)}` : ''
  const checks = [
    check('adapter', raw.adapter_present === false ? 'error' : raw.adapter_present ? 'ok' : 'skip'),
    check('vcruntime', raw.vc_runtime_present === false ? 'warn' : raw.vc_runtime_present ? 'ok' : 'skip'),
    check('runtime', raw.runtime_present === false ? 'error' : raw.runtime_present ? 'ok' : 'skip'),
  ]
  if (!raw.installed) return { ...missingRow(id, raw.host_supported === false ? [check('host', 'error')] : checks), note: '' }
  checks.push(check('digest', digest ? 'ok' : 'skip', short))
  const state = str(raw.state)
  if (raw.maintenance || ['maintenance_other', 'pending_removal'].includes(state)) checks.push(check('maintenance', 'warn', state))
  else if (['repair_required', 'degraded', 'unavailable'].includes(state)) checks.push(check('state', state === 'degraded' ? 'warn' : 'error', state))
  if (raw.in_use) checks.push(check('inuse', 'skip'))
  return finish(id, checks, short)
}

/** What a Sparxie dependency row shows beside its name. Free space reads as GB. The host's English sentences are not shown: the name says what passed, and a failure becomes '@<id>', which the page turns into its own words. The OS build and the runtime versions stay as the host gives them. */
const sparxieDetail = (id, result, detail) => {
  if (id === 'disk') { const n = Number(detail); return Number.isFinite(n) && n > 0 ? `${(n / 1024 ** 3).toFixed(1)} GB` : '' }
  if (result === 'error') return `@${id}`
  if (id === 'admin' || id === 'quarantine') return ''
  return detail || ''
}

/** Sparxie touch launcher, an extension component the person installs on their own: the component-page card, including when it is not installed. An absent source (no product wired it) stays unknown and is not drawn.
 *  raw: the host's Sparxie status { installed, running, version, runtime?, store: { state: 'data' | 'empty' | 'unused' | 'unreadable' } }. */
export function fromSparxie(raw) {
  if (!raw || typeof raw !== 'object') return unknownRow('sparxie')
  const deps = Array.isArray(raw.dependencies) ? raw.dependencies : []
  const checks = deps.filter((d) => d && d.id).map((d) => { const result = d.result === 'error' ? 'error' : d.result === 'ok' ? 'ok' : d.result === 'warn' ? 'warn' : 'skip'; return check(d.id, result, sparxieDetail(d.id, result, d.detail)) })
  if (raw.installed === false) return missingRow('sparxie', checks)
  checks.unshift(check('launcher', 'ok'))
  const storeState = raw.store && typeof raw.store === 'object' ? raw.store.state : ''
  checks.push(check('config', storeState === 'unreadable' ? 'error' : 'ok'))
  return finish('sparxie', checks, raw.version)
}

export const ADAPTERS = Object.freeze({ sparxie: fromSparxie, vdd: fromVdd, usb: fromUsb, vigem: fromVigem, mouse: fromMouse, vulkan: fromVulkan, dualsense: fromDualsense, mic: fromMic, encoder: fromEncoder, dlssnr: (raw) => fromEnhancement('dlssnr', raw), rtxhdr: (raw) => fromEnhancement('rtxhdr', raw), host: fromHost })

/** One row for a component from the product's raw answer. */
export function componentRow(id, raw) {
  const adapter = ADAPTERS[id]
  if (!adapter) return unknownRow(id)
  try { return adapter(raw) } catch { return unknownRow(id) }
}

/** The result of the health check: the row's checks, a state and the ids that did not pass. */
export function healthResult(row, at = Date.now()) {
  const failed = row.checks.filter((c) => c.result === 'error' || c.result === 'warn').map((c) => c.id)
  const passed = row.checks.filter((c) => c.result === 'ok').length
  return { at, state: row.state, passed, failed, total: row.checks.filter((c) => c.result !== 'skip').length, checks: row.checks }
}

/** Order of severity for sorting problems first. */
export const stateRank = (state) => ({ error: 0, missing: 1, warn: 2, unknown: 3, ok: 4 }[state] ?? 5)
