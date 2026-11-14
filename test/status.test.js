import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { EXTENSION_COMPONENTS, fromSparxie, FEED_IDS, fromEnhancement, fromMouse, fromVigem, fromVulkan, COMPONENT_IDS, componentRow, createComponentStatus, fromDualsense, fromEncoder, fromHost, fromMic, fromUsb, fromVdd, healthResult, registerComponentStatus, statusTexts } from '../src/status/index.js'
import { CARD_META, DEFAULT_ORDER, buildCards, defaultVisible } from '../src/vue/homeCards.js'

const ok = (row, id) => row.checks.find((c) => c.id === id)?.result

test('virtual display: missing, running, degraded, problem code, version mismatch', () => {
  assert.equal(fromVdd(null).state, 'unknown')
  assert.equal(fromVdd({ installed: false }).state, 'missing')
  const good = fromVdd({ installed: true, running: true, control_available: true, state: 'ready', version: '2026.10.30' })
  assert.deepEqual([good.state, good.version], ['ok', '2026.10.30'])
  assert.equal(fromVdd({ installed: true, running: false, control_available: false, state: 'ready' }).state, 'error')
  assert.equal(fromVdd({ installed: true, running: true, control_available: true, state: 'degraded' }).state, 'warn')
  const bad = fromVdd({ installed: true, running: true, control_available: true, state: 'ready', problem_code_valid: true, problem_code: 43 })
  assert.equal(bad.state, 'error')
  assert.equal(bad.checks.find((c) => c.id === 'problem').value, '43')
  const old = fromVdd({ installed: true, running: true, control_available: true, state: 'ready', version_match: false, installed_version: '1.0', bundled_version: '1.2' })
  assert.deepEqual([old.state, old.checks.find((c) => c.id === 'version').value], ['warn', '1.0 → 1.2'])
})

test('USB/IP: unsupported is unknown, unsigned and wrong version are errors, not ready is a warning', () => {
  assert.equal(fromUsb({ supported: false }).state, 'unknown')
  assert.equal(fromUsb({ supported: true, installed: false }).state, 'missing')
  const good = fromUsb({ supported: true, installed: true, ready: true, version: '0.9.8.1', version_supported: true, signature: 'signed', signer: 'Microsoft' })
  assert.deepEqual([good.state, good.version], ['ok', '0.9.8.1'])
  assert.equal(fromUsb({ supported: true, installed: true, ready: true, version: '1', version_supported: true, signature: 'unsigned' }).state, 'error')
  const wrong = fromUsb({ supported: true, installed: true, ready: true, version: '0.9', pinned_version: '0.9.8.1', version_supported: false, signature: 'signed' })
  assert.deepEqual([wrong.state, wrong.checks.find((c) => c.id === 'version').value], ['error', '0.9 → 0.9.8.1'])
  assert.equal(fromUsb({ supported: true, installed: true, ready: false, version_supported: true, signature: 'signed' }).state, 'warn')
  assert.equal(ok(fromUsb({ supported: true, installed: true, vhci_residual: true, version_supported: true, ready: true, signature: 'signed' }), 'residual'), 'warn')
})

test('DualSense channel follows the host and the transport', () => {
  assert.equal(fromDualsense(undefined).state, 'unknown')
  assert.equal(fromDualsense({ state: 'ready', host: { reachable: true, tuning_available: true, native_compiled: true, native_active: true, active_controllers: 1 }, transport: { supported: true, installed: true, version_supported: true, ready: true, version: '0.9.8.1' } }).state, 'ok')
  assert.equal(fromDualsense({ state: 'native_absent', host: { reachable: true, tuning_available: true, native_compiled: false } }).state, 'warn')
  assert.equal(fromDualsense({ state: 'usbip_unsigned', host: { reachable: true, tuning_available: true, native_compiled: true }, transport: { supported: true, installed: true, version_supported: true, ready: true } }).state, 'error')
})

test('the external components: ViGEmBus, the virtual mouse driver, the Vulkan HDR component; the signature of the USB/IP transport is in its card', () => {
  assert.deepEqual(COMPONENT_IDS, ['vdd', 'usb', 'vigem', 'mic', 'mouse', 'vulkan', 'dlssnr', 'rtxhdr', 'sparxie']) // sparxie: the component page card, including before it is installed
  for (const gone of ['dualsense', 'drivers', 'encoder', 'host']) assert.ok(!COMPONENT_IDS.includes(gone), `${gone} is not a component`)
  assert.deepEqual(FEED_IDS, ['dualsense', 'encoder', 'host'])
  assert.equal(fromVigem(null).state, 'unknown'); assert.equal(fromVigem({ installed: false }).state, 'missing')
  const vigem = fromVigem({ installed: true, version: '1.21.442.0' }); assert.deepEqual([vigem.state, vigem.version], ['ok', '1.21.442.0'])
  assert.equal(fromMouse({ installed: true, running: false, status_text: 'code 10' }).state, 'error'); assert.equal(fromMouse({ installed: true, running: true, config_enabled: true }).state, 'ok')
  assert.equal(fromMouse(null).state, 'unknown', 'a host that reports none: unknown, not a card with a made-up state')
  assert.equal(fromVulkan({ state: 'idle', artifacts_installed: false }).state, 'missing'); assert.equal(fromVulkan({ state: 'enabled', artifacts_installed: true, display_available: true }).state, 'ok')
  assert.equal(fromVulkan({ state: 'error', artifacts_installed: true }).state, 'error')
  const usb = fromUsb({ installed: true, ready: true, version: '0.9.8.1', version_supported: true, signature: 'signed', signer: 'Microsoft Windows Hardware' })
  assert.equal(usb.checks.find((c) => c.id === 'signed').value, 'Microsoft Windows Hardware')
  assert.equal(fromUsb({ installed: true, version: '1', signature: 'unsigned' }).state, 'error')
})

test('microphone, encoder and host', () => {
  assert.equal(fromMic({ state: 'idle', backend: 'vb_cable' }).state, 'ok')
  assert.equal(fromMic({ state: 'faulted' }).state, 'error')
  assert.equal(fromMic({ state: 'missing' }).state, 'missing')
  assert.equal(fromMic({ state: 'disabled' }).state, 'unknown')
  assert.equal(fromMic({ state: 'starting' }).state, 'warn')
  assert.equal(fromMic({}).state, 'unknown')
  assert.equal(fromEncoder(null).state, 'unknown')
  assert.equal(fromEncoder({ active: '' }).state, 'warn')
  const enc = fromEncoder({ active: 'NVENC', hevc: '4', av1: '1' })
  assert.deepEqual([enc.state, enc.checks.find((c) => c.id === 'codecs').value], ['ok', 'H.264 · HEVC'])
  assert.equal(fromHost({ reachable: false, version: '1' }).state, 'error')
  assert.equal(fromHost({ reachable: true, version: '1', update: 'available', next: '2' }).state, 'warn')
  assert.equal(fromHost({ reachable: true, version: '1', update: 'latest' }).state, 'ok')
  assert.equal(componentRow('nope', {}).state, 'unknown')
  assert.equal(componentRow('vdd', { get installed() { throw new Error('x') } }).state, 'unknown')
})

test('health result counts what passed and names what did not', () => {
  const row = fromVdd({ installed: true, running: false, control_available: true, state: 'ready' })
  const result = healthResult(row, 5)
  assert.deepEqual([result.at, result.state, result.passed, result.failed, result.total], [5, 'error', 2, ['running'], 3])
})

test('the controller reads its sources, checks on demand and keeps the result', async () => {
  let vdd = { installed: true, running: false, control_available: true, state: 'ready' }
  const status = createComponentStatus({ sources: { vdd: async () => vdd, usb: async () => { throw new Error('no answer') } }, actions: { vdd: { repair: { run() {} } } }, now: () => 7 })
  assert.equal(status.rows.value.length, COMPONENT_IDS.length)
  assert.equal(status.row('vdd').state, 'unknown')
  await status.refresh()
  assert.equal(status.row('vdd').state, 'error')
  assert.equal(status.row('usb').state, 'unknown')
  assert.equal(status.row('vdd').result, null)
  vdd = { installed: true, running: true, control_available: true, state: 'ready' }
  const result = await status.check('vdd')
  assert.deepEqual([result.state, result.at, status.row('vdd').state, status.row('vdd').checking], ['ok', 7, 'ok', false])
  assert.equal(status.row('vdd').hasSource, true)
  assert.equal(status.row('mic').hasSource, false)
  assert.ok(status.row('vdd').actions.repair)
  assert.equal(status.cardTitle('usb'), 'usbip-win2 USB/IP transport status')
})

test('texts: Chinese and English carry the same keys', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(statusTexts('zh')), keys(statusTexts('en')))
  assert.equal(statusTexts('zh').names.vdd, '基地虚拟显示器驱动')
  assert.equal(statusTexts('fr').title, 'Components')
  for (const id of COMPONENT_IDS) assert.ok(statusTexts('en').names[id])
})

test('every component is a catalogue card, off by default, with a title from the registered controller', () => {
  for (const id of COMPONENT_IDS) {
    assert.ok(CARD_META[`comp:${id}`], id)
    assert.ok(DEFAULT_ORDER.includes(`comp:${id}`), id)
    assert.equal(defaultVisible(CARD_META[`comp:${id}`].def), false)
  }
  const cards = buildCards({ hero: null }, { texts: {} })
  const usb = cards.find((c) => c.id === 'comp:usb')
  assert.deepEqual([usb.kind, usb.available, usb.data, usb.title], ['component', true, { id: 'usb' }, 'usbip-win2 USB/IP transport status'])
  registerComponentStatus(createComponentStatus({ locale: 'zh' }))
  assert.equal(buildCards({}, {}).find((c) => c.id === 'comp:mic').title, '虚拟麦克风设备状态')
  registerComponentStatus(null)
})

test('microphone overview state follows the host status', async () => {
  const { microphoneState } = await import('../src/status/index.js')
  assert.equal(microphoneState(null), 'unknown')
  assert.equal(microphoneState({ state: 'unsupported' }), 'unsupported')
  assert.equal(microphoneState({ configured_backend: 'disabled' }), 'disabled')
  assert.equal(microphoneState({ configured_backend: 'auto', active_backend: 'vb_cable', state: 'ready' }), 'active')
  assert.equal(microphoneState({ configured_backend: 'usbip_experimental', active_backend: 'usbip_experimental', state: 'remote_active' }), 'streaming')
  assert.equal(microphoneState({ configured_backend: 'usbip_experimental', active_backend: 'usbip_experimental', state: 'creating' }), 'starting')
  assert.equal(microphoneState({ configured_backend: 'usbip_experimental', active_backend: 'usbip_experimental', state: 'device_faulted' }), 'faulted')
  assert.equal(microphoneState({ configured_backend: 'usbip_experimental', component_available: false }), 'missing')
  assert.equal(microphoneState({ configured_backend: 'auto', error_code: 'MIC_USBIP_COMPONENT_UNAVAILABLE' }), 'missing')
  assert.equal(microphoneState({ configured_backend: 'auto', component_available: true }), 'waiting')
})

test('a source with read and fresh: the page reads the cheap one, the check asks again', async () => {
  const calls = []
  const status = createComponentStatus({ sources: { usb: { read: async () => { calls.push('read'); return { supported: true, installed: true, ready: true, version_supported: true, signature: 'signed' } }, fresh: async () => { calls.push('fresh'); return { supported: true, installed: false } } } } })
  await status.refresh(['usb'])
  assert.equal(status.row('usb').state, 'ok')
  await status.check('usb')
  assert.deepEqual(calls, ['read', 'fresh'])
  assert.equal(status.row('usb').state, 'missing')
})

test('DLSS NR and RTX HDR are extension components with the digest of the imported file as their version', () => {
  assert.deepEqual(Object.keys(EXTENSION_COMPONENTS), ['dlssnr', 'rtxhdr'])
  assert.equal(EXTENSION_COMPONENTS.dlssnr.dll, 'nvngx_dlssnr.dll'); assert.equal(EXTENSION_COMPONENTS.rtxhdr.dll, 'nvngx_truehdr.dll')
  assert.equal(EXTENSION_COMPONENTS.dlssnr.other, EXTENSION_COMPONENTS.rtxhdr.dll, 'each names the other one, so they are not mixed up')
  assert.equal(fromEnhancement('dlssnr', null).state, 'unknown', 'no source (the Web UI): unknown, never a made-up state')
  const missing = fromEnhancement('dlssnr', { installed: false, host_supported: true, adapter_present: true, vc_runtime_present: true, runtime_present: false })
  assert.deepEqual([missing.state, missing.version], ['missing', ''])
  const ok = fromEnhancement('rtxhdr', { installed: true, state: 'configured', adapter_present: true, vc_runtime_present: true, runtime_present: true, runtime_sha256: 'ABCDEF0123456789ABCDEF' })
  assert.deepEqual([ok.state, ok.version], ['ok', 'sha256:abcdef012345'])
  assert.equal(ok.checks.find((c) => c.id === 'digest').value, 'sha256:abcdef012345')
  assert.equal(fromEnhancement('rtxhdr', { installed: true, state: 'repair_required', adapter_present: true, runtime_present: true }).state, 'error')
  assert.equal(fromEnhancement('dlssnr', { installed: true, maintenance: true, adapter_present: true, runtime_present: true }).state, 'warn')
  assert.deepEqual(Object.keys(statusTexts('zh').ext.help), ['dlssnr', 'rtxhdr'])
  assert.ok(statusTexts('zh').ext.mixWarning.includes('{dll}') && statusTexts('en').ext.removeConfirm.includes('{name}'))
})

test('Sparxie is missing until it is installed, and the card says to choose a package', () => {
  assert.equal(fromSparxie(null).state, 'unknown')
  const missing = fromSparxie({ installed: false, dependencies: [{ id: 'os', result: 'ok', detail: '26300' }, { id: 'webview2', result: 'error', detail: 'missing' }] })
  assert.equal(missing.state, 'missing')
  assert.equal(missing.checks.find((c) => c.id === 'webview2').result, 'error')
  const ok = fromSparxie({ installed: true, running: false, version: '0.1.0-preview.9', store: { state: 'data' }, dependencies: [{ id: 'os', result: 'ok', detail: '26300' }] })
  assert.equal(ok.state, 'ok'); assert.equal(ok.version, '0.1.0-preview.9')
  assert.equal(fromSparxie({ installed: true, version: '1.4.2', store: { state: 'unused' } }).state, 'ok', 'a config file that is not created yet is not a fault')
  assert.equal(fromSparxie({ installed: true, version: '1.4.2', store: { state: 'unreadable' } }).state, 'error')
  const vue = fs.readFileSync(new URL('../src/vue/MComponentStatus.vue', import.meta.url), 'utf8')
  assert.ok(vue.includes("r.id !== 'sparxie' || r.hasSource"))
  assert.ok(vue.includes('T.sparxie.bring'))
  assert.equal(statusTexts('zh').sparxie.bring.includes('选择'), true)
  assert.equal(statusTexts('en').sparxie.fromFile.length > 0, true)
})

test('an install\'s progress is the card\'s own state: it ends with the install, whichever reads were still on their way (fast and slow installs)', async () => {
  for (const readDelay of [0, 30]) {
    // a source whose answer is slow to arrive: a read that began while the install ran comes back after it ended
    const answers = [{ installed: false }, { installed: true, version: '1.0' }]
    let n = 0
    const status = createComponentStatus({ sources: { sparxie: async () => { const own = answers[Math.min(n++, 1)]; await new Promise((r) => setTimeout(r, readDelay)); return own } } })
    status.setProgress('sparxie', { stage: '正在解压', percent: 40 })
    assert.deepEqual(status.row('sparxie').progress, { stage: '正在解压', percent: 40 })
    const early = status.refresh(['sparxie'])
    status.setProgress('sparxie', { stage: '正在解压', percent: 85 })
    const late = status.refresh(['sparxie'])
    status.setProgress('sparxie', null)
    await Promise.all([early, late])
    assert.equal(status.row('sparxie').progress, null, 'a finished install leaves no progress line')
    assert.equal(status.row('sparxie').state, 'ok', 'the read that began last is the one that counts')
  }
})

test('a source cannot put a progress line on the card: only the running action can', async () => {
  const status = createComponentStatus({ sources: { sparxie: async () => ({ installed: true, version: '1.0', progress: { stage: 'x', percent: 1 } }) } })
  await status.refresh(['sparxie'])
  assert.equal(status.row('sparxie').progress, null)
})

test('answers that arrive out of order: the read that began last wins, also for a check', async () => {
  const releases = []
  const status = createComponentStatus({ sources: { vdd: () => new Promise((resolve) => releases.push(resolve)) } })
  const first = status.refresh(['vdd'])
  const second = status.check('vdd')
  releases[1]({ installed: true, driver_state: 'ok', version: 'new' })
  await second
  releases[0]({ installed: false })
  await first
  assert.equal(status.row('vdd').loaded, true)
  assert.notEqual(status.row('vdd').state, 'missing', 'the older answer did not overwrite the newer one')
})

test('the Sparxie card offers 打开 Sparxie only once Sparxie is installed', async () => {
  const { readFileSync } = await import('node:fs')
  const vue = readFileSync(new URL('../src/vue/MComponentStatus.vue', import.meta.url), 'utf8')
  assert.ok(vue.includes("const gone = (row, kind) => ['remove', 'open'].includes(kind) && (kind === 'remove' || row.id === 'sparxie')"), 'a missing Sparxie has no open button; other cards keep their 打开 link')
  assert.equal(statusTexts('zh').sparxie.open, '打开 Sparxie')
  assert.ok(statusTexts('en').sparxie.openFailed && statusTexts('zh').sparxie.alreadyOpen)
})
