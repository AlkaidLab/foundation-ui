<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import MIconButton from './MIconButton.vue'
import MButton from './MButton.vue'
import MBanner from './MBanner.vue'
import MItem from './MItem.vue'
import MGroup from './MGroup.vue'
import MFieldItem from './MFieldItem.vue'
import MField from './MField.vue'
import MPinPad from './MPinPad.vue'
import MChoiceItem from './MChoiceItem.vue'
import MRemoteAccess from './MRemoteAccess.vue'
import MGuideWebAccess from './MGuideWebAccess.vue'
import { createPairQr } from './usePairQr.js'
import { viviImage } from '../about/mascot.js'
import MProductHero from './MProductHero.vue'
import { aboutTexts } from '../about/texts.js'
import { errorTexts } from './errorTexts.js'
import { updateSourceTexts } from '../update/sourceTexts.js'
import { errorsNoticeSeen, markErrorsNoticeSeen } from '../telemetry/consent.js'
import MAppearance from './MAppearance.vue'
import MGuideMotion from './MGuideMotion.vue'
import MConnectPanel from './MConnectPanel.vue'
import MGuideAppsSheet from './MGuideAppsSheet.vue'
import MGuideTry from './MGuideTry.vue'
import MGuideHostDone from './MGuideHostDone.vue'
import MGuideUpdate from './MGuideUpdate.vue'
import MGuideAddress from './MGuideAddress.vue'
import { useReleaseAssets } from './useReleaseAssets.js'
import { readOs, writeOs } from '../clients/osChoice.js'
import { CONNECT_CHECKS, PIN_LENGTH, SKIP_DELAY_S, canPair, skipSecondsLeft, deviceOf, findNewClient, isLast, pickSession, qrPath, readProgress, sessionLine, startIndex, validateAccount, writeProgress } from './guideModel.js'
import { fillText, guideTexts } from './guideTexts.js'
import { HEARTBEAT_MAX, HEARTBEAT_S, deviceId, isPhoneLike, resumeIndex, unionDone } from './guideHost.js'
import { submitOnEnter } from './submitOnEnter.js'
import { PRODUCT, brandUrl } from '../about/data.js'

// One first-run flow for both products (the control panel's welcome and the Web UI's setup): ten screens at most, one thing on each, large type, a stepper, a small
// mascot beside the title, back and next, every step skippable. The account step is offered only where the product has no account yet.
// The product fills `state` with real data (or leaves a field out when it has none) and supplies the actions that differ as `callbacks`:
//   openLink(url), copy(text), createAccount({ username, password, confirm }) -> { ok, error?, leave? },
//   loadSetup(), saveSetup({ locale?, adapter, display }) -> { ok, error?, vdd? }, skipSetup(),
//   refreshAddresses(), refreshClients(), pair(pin, name) -> { ok, error? }, pairQr: { start, poll, cancel } (the QR window of the host: open only while the pair step is shown),
//   loadNetwork(), setUpnp(on) -> { ok, error? }, setPort(port) -> { ok, error? } (the base port, applied after a restart), openDiagnostics(), restartHost() -> { ok, error? }, refreshSessions(),
//   restoreApps() -> { ok, result: 'done' | 'none', error? }, openApps('scan' | 'add' | 'restore'),
//   loadUpdate(), setUpdateSource('auto' | 'cnb' | 'github' | 'mirror'), saveCdk(cdk) -> { ok } (the product keeps it and checks it once, then `state.update.status` holds the result), clearCdk().
// state: { locale: { choice ('system' or a code), resolved (the code the system's language gives), languages: [{ code, name }] } (the intro step; callbacks.setLocale(choice) applies it at once),
//   account: { exists }, setup: { completed, locale, showLanguage, adapters, displayDevices, adapter, display, vddReady },
//   host: { platform, name (the name clients list), addresses }, network: { port (saved), activePort (the host listens on it now), upnpActive, upnpSaved, loaded }, clients: [] | null, sessions: [] | null, pair: { name }, apps: { scanAvailable },
//   update: { source, cdk (false when the product cannot hold a CDK), available, hasCdk, status: { state, expiresAt, kind }, lastValid, busy } } (the update step: the product that has no update source skips it)
// Progress (step, device, finished) is kept under `storageKey`. The finish button is the "do not show again".
const props = defineProps({
  steps: { type: Array, required: true },
  state: { type: Object, required: true },
  callbacks: { type: Object, default: () => ({}) },
  locale: { type: String, default: 'en' },
  texts: { type: Object, default: null },
  storageKey: { type: String, required: true },
  storage: { type: Object, default: null },
  /** (text) => QR matrix ({ size, get(row, col) } or rows of booleans); drawn locally, nothing is fetched */
  qr: { type: Function, default: null },
  closable: { type: Boolean, default: true },
  /** ids of steps that cannot be skipped (the account step on the page that is served while the host has no account) */
  required: { type: Array, default: () => [] },
  pollMs: { type: Number, default: 2500 },
  /** seconds from the start of the flow in which 跳过 is shown but cannot be used (a person who clicks through at once skips the account and the setup by accident) */
  skipDelay: { type: Number, default: SKIP_DELAY_S },
  /** the version of the product the flow belongs to: closing, skipping or finishing stores it, so an upgrade shows the flow once per version (guideEntry) */
  version: { type: String, default: '' },
  /** 'fresh' (the first install: the whole flow) or 'upgrade' (an existing install that updated: what is new first, the steps already done left out by the product) */
  mode: { type: String, default: 'fresh' },
  /** what the host remembers of the guide (hostProgressOf): the steps done on any device; they are the progress, whatever this window stored */
  hostProgress: { type: Object, default: null },
  /** the person asked for the guide again (the help page, --start-guide): it opens at the first step; the steps already done stay open to jump back to */
  restart: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'finish', 'step'])

const T = computed(() => guideTexts(props.locale, props.texts))
const progress = reactive(readProgress(props.storage, props.storageKey))
// the steps done on any device are the progress (the host keeps them); a position this window stored never sends the person ahead of them
progress.done = unionDone(progress.done, props.hostProgress?.done || [])
progress.visited = unionDone(progress.visited, progress.done)
if (props.restart) progress.closed = ''
// the language step goes away when the product has no language to offer (it was chosen before)
// There is no question about what is sent (11-11): error reports and usage statistics are both on and are told in one notice on the first screen; the switches are in 关于 › 隐私.
// A step list that an older product built may still carry a 'consent' step: it is never shown.
const flow = computed(() => props.steps.filter((s) => s.id !== 'consent'))
// an upgrade starts at the top, whatever an older run left behind; only the same upgrade pass that was left open continues where it was
const sameUpgrade = props.mode === 'upgrade' && progress.mode === 'upgrade' && progress.version === props.version && !progress.finished
if (props.mode === 'upgrade' && !sameUpgrade) { progress.visited = []; progress.done = []; progress.step = null; progress.finished = false }
const idx = ref(props.restart || (props.mode === 'upgrade' && !sameUpgrade) ? 0 : progress.done.length ? resumeIndex(flow.value, progress.done) : startIndex(flow.value, progress))
const current = computed(() => flow.value[idx.value] || flow.value[0])
const id = computed(() => current.value?.id)
const maxIdx = ref(Math.max(idx.value, ...progress.visited.map((v) => flow.value.findIndex((s) => s.id === v))))
const guideDevice = deviceId()
let beats = 0 // beats of the host heartbeat since the last step

function save(extra = {}) {
  Object.assign(progress, extra)
  progress.step = id.value
  if (props.version) { progress.mode = props.mode; progress.version = props.version }
  if (!progress.visited.includes(id.value)) progress.visited = [...progress.visited, id.value]
  writeProgress(props.storage, props.storageKey, progress)
  // the host keeps what every device shares: the steps done, finished, closed, and which device is running the guide now (none once it is closed or finished)
  const ended = progress.finished || progress.closed === (props.version || '-')
  beats = 0
  void props.callbacks.saveGuideProgress?.({ done: progress.done, finished: progress.finished, closed: progress.closed, active: ended ? null : { device: guideDevice, at: Date.now() / 1000 } })
}
function go(i) {
  const to = Math.max(0, Math.min(flow.value.length - 1, i))
  if (to > idx.value && !progress.done.includes(id.value)) progress.done = [...progress.done, id.value]
  idx.value = to
  maxIdx.value = Math.max(maxIdx.value, idx.value)
  save()
  emit('step', id.value)
}
const next = () => go(idx.value + 1)
// closing with the X counts as having seen this version's flow (an upgrade is shown once); a first install that was not finished still opens again where it was
function close() { save({ closed: props.version || '-' }); emit('close') }
const back = () => go(idx.value - 1)
/** `next` names what the person chose to do after finishing ('scan', 'add'): the product then goes there instead of back to the page. */
function finish(next = '') {
  if (!progress.done.includes(id.value)) progress.done = [...progress.done, id.value]
  save({ finished: true, closed: props.version || '-' }) // finishing counts as having seen this version, on every device
  emit('finish', typeof next === 'string' && next ? { next } : {})
}

/* ---------- step state ---------- */
const busy = ref(false)
const failure = ref('')
const form = reactive({ username: 'sunshine', password: '', confirm: '' })
const accountDone = ref(false)
const leaving = ref(false)
let leaveNow = null // what the product gives to go at once (the old 8 s countdown had 「立即跳转」; the redirect is 2 s now and the button stays)
const accountError = computed(() => (form.confirm && form.password !== form.confirm ? T.value.account.mismatch : ''))
const accountOk = computed(() => !validateAccount(form))

const choice = reactive({ locale: null, adapter: '', display: 'ZakoHDR', prep: 'ensure_only_display' })
const uniqueAdapters = computed(() => {
  const seen = new Set()
  return (props.state.setup?.adapters || []).filter((a) => { const n = a?.name ?? ''; if (seen.has(n)) return false; seen.add(n); return true })
})
const adapterOptions = computed(() => [{ value: '', label: T.value.setup.auto }, ...uniqueAdapters.value.map((a) => ({ value: a.name, label: a.name }))])
// the state of HDR on a display, as the host reports it (UNKNOWN, ENABLED, DISABLED), in words
const hdrStateText = (state) => { const names = T.value.setup.hdrState || {}; return names[String(state).toUpperCase()] || `HDR: ${state}` }
const displays = computed(() => (props.state.setup?.displayDevices || []).filter((d) => !/^FRIENDLY NAME:\s*Zako HDR\s*$/im.test(d?.data || '')).map((d) => {
  const data = d.data || ''
  const friendly = data.match(/FRIENDLY NAME:\s*(.*)/)?.[1]?.trim()
  const slot = data.match(/DISPLAY NAME:\s*.*?(DISPLAY\d+)/)?.[1]
  const hdr = data.match(/HDR STATE:\s*(\w+)/)?.[1]
  return { id: d.device_id, label: friendly ? (slot ? `${friendly} (${slot})` : friendly) : d.device_id, text: hdr ? hdrStateText(hdr) : '' }
}))
// the language of the intro: 跟随系统 (with the language it resolves to) first, then the languages the product offers; a pick applies at once (the product changes its locale, so the texts of the flow change as you look)
const languages = computed(() => (props.state.locale?.languages?.length ? props.state.locale.languages : [{ code: 'zh', name: '简体中文' }, { code: 'en', name: 'English' }]))
const languageName = (code) => languages.value.find((l) => l.code === code)?.name || code || ''
// the list is short at first: 跟随系统 · <what it resolves to>, then the likeliest (简体中文, English, the system's own language when it is another one, and the language chosen when it is not among them),
// and a 更多语言 row that shows the rest in place
const moreOpen = ref(false)
const likelyCodes = computed(() => {
  const have = new Set(languages.value.map((l) => l.code))
  const out = []
  const family = (c) => String(c).split(/[-_]/)[0]
  // the system's language is a row of its own only when it is another language (English (US) beside English would be the same row twice); the one chosen is always there
  for (const c of ['zh', 'en', props.state.locale?.resolved, localeChoice.value]) if (c && c !== 'system' && have.has(c) && !out.includes(c) && (c === localeChoice.value || !out.some((o) => family(o) === family(c)))) out.push(c)
  return out
})
const shownLanguages = computed(() => (moreOpen.value ? [...likelyCodes.value.map((c) => languages.value.find((l) => l.code === c)), ...languages.value.filter((l) => !likelyCodes.value.includes(l.code))] : likelyCodes.value.map((c) => languages.value.find((l) => l.code === c))))
const hasMoreLanguages = computed(() => languages.value.length > likelyCodes.value.length)
const followSystemTitle = computed(() => `${T.value.intro.followSystem} · ${languageName(props.state.locale?.resolved)}`)
const localeChoice = computed(() => props.state.locale?.choice || 'system')
const pickLocale = (value) => props.callbacks.setLocale?.(value)
const C = computed(() => errorTexts(props.locale))
const S = computed(() => updateSourceTexts(props.locale))
// the one-time notice that error reports and usage statistics are on: shown on the first screen until the person leaves it
const errorsNotice = ref(!errorsNoticeSeen())
const errorsParts = computed(() => C.value.errorsNotice.split('{link}'))
watch(id, (now, before) => { if (before === 'intro' && now !== 'intro') markErrorsNoticeSeen() })
onBeforeUnmount(() => { if (errorsNotice.value && id.value !== 'intro') markErrorsNoticeSeen() })
const setupDirty = computed(() => {
  const s = props.state.setup || {}
  return !s.completed || (choice.locale && choice.locale !== s.locale) || choice.adapter !== (s.adapter || '') || choice.display !== (s.display || (s.virtual === false ? displays.value[0]?.id || '' : 'ZakoHDR'))
})
const vddWarn = ref(false)

// the system of the device to install on: the one chosen in this flow, else the one chosen last on the download page or in 连接设备 (the same memory), Android the first time
const device = ref(progress.device && deviceOf(progress.device) ? progress.device : readOs())
// the files of the recommended client (every architecture, CNB first for Chinese) come from the same release data as the download page and 连接设备
const releases = useReleaseAssets()
const deviceInfo = computed(() => deviceOf(device.value))
function pickDevice(value) { device.value = value; writeOs(value); save({ device: value }) }

const hostOs = computed(() => { const p = String(props.state.host?.platform || '').toLowerCase(); return p.startsWith('win') ? 'windows' : p.startsWith('mac') || p === 'darwin' ? 'macos' : p ? 'linux' : 'windows' })
const copied = ref('')
let copiedTimer = 0
async function copyText(text) {
  try {
    if (props.callbacks.copy) await props.callbacks.copy(text)
    else await globalThis.navigator?.clipboard?.writeText(text)
    copied.value = text
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = '' }, 1600)
  } catch { /* clipboard refused: the address stays visible */ }
}
const openLink = (url) => (props.callbacks.openLink ? props.callbacks.openLink(url) : globalThis.open?.(url, '_blank', 'noopener,noreferrer'))

const pin = ref('')
// the PIN is always typed by the person: it starts empty at every visit and after every answer, and only the keys of the pad (not a value put there) send it
const pinTyped = ref(false)
watch(pin, (value) => { if (!value) pinTyped.value = false })
const pairName = ref('')
const pairBaseline = ref(null)
const pairedClient = ref(null)
const pairError = ref('')
async function enterPair() {
  pairedClient.value = null; pairError.value = ''; pin.value = ''; pinTyped.value = false
  if (!pairName.value) pairName.value = props.state.pair?.name || ''
  await props.callbacks.refreshClients?.()
  pairBaseline.value = Array.isArray(props.state.clients) ? props.state.clients.map((c) => ({ ...c })) : null
}
watch(() => props.state.clients, (list) => {
  if (id.value !== 'pair' || pairedClient.value) return
  const found = findNewClient(pairBaseline.value, list)
  if (found) pairedClient.value = found
  else if (!pairBaseline.value && Array.isArray(list)) pairBaseline.value = list.map((c) => ({ ...c }))
}, { deep: true })
async function submitPin() {
  if (busy.value) return
  if (!pairName.value.trim()) { pairError.value = T.value.pair.nameMissing; return }
  if (!pinTyped.value || !canPair(pin.value, pairName.value)) return
  busy.value = true; pairError.value = ''
  try {
    const result = (await props.callbacks.pair?.(pin.value, pairName.value.trim())) || { ok: false }
    if (!result.ok) { pairError.value = result.error || T.value.pair.error; pin.value = ''; return }
    await props.callbacks.refreshClients?.()
    pairedClient.value = findNewClient(pairBaseline.value, props.state.clients) || { name: pairName.value.trim(), uuid: '' }
  } catch (error) {
    pairError.value = error?.message || T.value.pair.error
  } finally { busy.value = false }
}
const qrPair = props.callbacks.pairQr
  ? createPairQr({
    start: () => props.callbacks.pairQr.start(),
    poll: () => props.callbacks.pairQr.poll(),
    cancel: () => props.callbacks.pairQr.cancel(),
    render: async (url) => { const q = qrPath(props.qr(url)); if (!q.d) throw new Error('no code'); return q },
    onPaired: async () => {
      await props.callbacks.refreshClients?.()
      if (!pairedClient.value) pairedClient.value = findNewClient(pairBaseline.value, props.state.clients) || { name: '', uuid: '' }
    },
  })
  : null
const qrView = qrPair?.view || null
const hasQr = computed(() => !!qrPair && !!props.qr)
// on a phone or a small touch screen nobody can scan the screen they hold: the PIN comes first and the code second
const phone = typeof navigator !== 'undefined' && isPhoneLike({ userAgent: navigator.userAgent, coarse: !!globalThis.matchMedia?.('(pointer: coarse)').matches, width: globalThis.innerWidth || 1024 })
// the phone's own client cannot scan the screen the phone shows, so there the code is not made until the person asks for it (for another device): no pairing window is opened on the host for nothing
const showQr = ref(!phone)
const qrShown = computed(() => hasQr.value && showQr.value)
function revealQr() { showQr.value = true; void qrPair?.begin() }
function pairAnother() { pairedClient.value = null; pin.value = ''; pairName.value = ''; pairBaseline.value = Array.isArray(props.state.clients) ? props.state.clients.map((c) => ({ ...c })) : null; if (qrShown.value) void qrPair.begin() }

const session = computed(() => pickSession(props.state.sessions))
const sessionsKnown = computed(() => Array.isArray(props.state.sessions))
const checks = reactive({ picture: false, mouse: false, keyboard: false, sound: false })
// the test tools (and the latency clock) run in the flow, in the stream's window: tried here, then back to the same step
const tryTool = ref('channels')
const restore = reactive({ busy: false, note: '', failed: false }); const restoreResult = ref(null)
async function restoreApps() {
  if (!props.callbacks.restoreApps) { props.callbacks.openApps?.('restore'); return }
  restore.busy = true; restore.note = ''; restore.failed = false
  try {
    const result = await props.callbacks.restoreApps()
    restore.failed = !result?.ok
    restore.note = result?.ok ? (result.result === 'none' ? T.value.connect.restoredNone : T.value.connect.restored) : (result?.error || T.value.connect.restoreFailed)
  } catch (error) {
    restore.failed = true; restore.note = error?.message || T.value.connect.restoreFailed
  } finally { restore.busy = false; await nextTick(); restoreResult.value?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }) } // the step is long: the answer is a banner under the button, scrolled into view
}
// the apps step stays in the flow: scanning and adding by hand open a sheet over it (MGuideAppsSheet; the product's callbacks scanGames and addGames); a host that cannot do that leaves for the apps page as before
const inFlowApps = computed(() => !!props.callbacks.scanGames && !!props.callbacks.addGames)
const appsSheet = ref('')
const appsAdded = ref(0)
function openTools() { finish('tools'); props.callbacks.openTools?.() }
function openApps(mode) {
  if (inFlowApps.value && (mode === 'scan' || mode === 'add')) { appsSheet.value = mode; return }
  finish(mode); props.callbacks.openApps?.(mode)
}

/* ---------- entering a step: load what it shows, poll what changes ---------- */
let timer = 0
function stopPoll() { clearInterval(timer); timer = 0 }
async function enter(stepId) {
  stopPoll(); qrPair?.stop(); busy.value = false; failure.value = ''; vddWarn.value = false
  if (stepId === 'setup') {
    await props.callbacks.loadSetup?.()
    const s = props.state.setup || {}
    if (choice.locale === null) choice.locale = s.locale === 'zh' || s.locale === 'en' ? s.locale : null
    choice.adapter = s.adapter || (uniqueAdapters.value.length === 1 ? uniqueAdapters.value[0].name : '')
    choice.display = s.display || (s.virtual === false ? displays.value[0]?.id || '' : 'ZakoHDR')
  } else if (stepId === 'address') {
    await Promise.all([props.callbacks.loadNetwork?.(), props.callbacks.refreshAddresses?.()])
  } else if (stepId === 'pair') {
    await enterPair()
    if (qrShown.value) void qrPair.begin()
    timer = setInterval(() => { if (!pairedClient.value && !document.hidden) props.callbacks.refreshClients?.() }, props.pollMs)
  } else if (stepId === 'remote') {
    await Promise.all([props.callbacks.loadNetwork?.(), props.callbacks.refreshAddresses?.()])
  } else if (stepId === 'update') {
    await props.callbacks.loadUpdate?.()
  } else if (stepId === 'connect') {
    await props.callbacks.refreshSessions?.()
    timer = setInterval(() => { if (!document.hidden) props.callbacks.refreshSessions?.() }, props.pollMs)
  }
}
watch(id, (value) => { if (value) void enter(value) }, { immediate: true })
onBeforeUnmount(() => { stopPoll(); qrPair?.stop(); clearTimeout(copiedTimer); clearInterval(skipTimer) })
// the first seconds of the flow: 跳过 counts down, then opens. 下一步 is not held back
const startedAt = Date.now()
const effectiveDelay = props.mode === 'upgrade' ? 0 : props.skipDelay
const skipLeft = ref(skipSecondsLeft(startedAt, startedAt, effectiveDelay))
let skipTimer = 0
if (skipLeft.value > 0) skipTimer = setInterval(() => { skipLeft.value = skipSecondsLeft(startedAt, Date.now(), effectiveDelay); if (skipLeft.value <= 0) clearInterval(skipTimer) }, 250)
// no pairing window stays open behind a hidden window
const onVisible = () => { if (id.value !== 'pair' || pairedClient.value || !qrShown.value) return; if (document.hidden) qrPair.stop(); else void qrPair.begin() }
// a guide that stays on one step (the client is being installed) keeps telling the host it runs here, so no other device opens its own meanwhile (the host forgets it after ACTIVE_WINDOW_S)
// (a hidden tab keeps beating: the person is at the client; a window left alone for half an hour stops, so a forgotten tab holds nobody back)
let beat = 0
const beatNow = () => { if (beats < HEARTBEAT_MAX && !progress.finished && progress.closed !== (props.version || '-')) { beats += 1; void props.callbacks.saveGuideProgress?.({ active: { device: guideDevice, at: Date.now() / 1000 } }) } }
onMounted(() => { document.addEventListener('visibilitychange', onVisible); void props.callbacks.saveGuideProgress?.({ done: progress.done, closed: progress.closed, active: { device: guideDevice, at: Date.now() / 1000 } }); beat = setInterval(beatNow, HEARTBEAT_S * 1000) })
onBeforeUnmount(() => { document.removeEventListener('visibilitychange', onVisible); clearInterval(beat) })

/* ---------- actions of the foot ---------- */
async function submitAccount() {
  if (busy.value || !accountOk.value) return
  busy.value = true; failure.value = ''
  try {
    const result = (await props.callbacks.createAccount?.({ ...form })) || { ok: false }
    if (!result.ok) { failure.value = result.error || ''; return }
    accountDone.value = true
    if (result.leave) { leaving.value = true; leaveNow = typeof result.now === 'function' ? result.now : null; const to = flow.value[idx.value + 1]; if (to) { progress.step = to.id; progress.visited = [...new Set([...progress.visited, id.value, to.id])]; writeProgress(props.storage, props.storageKey, progress) } return }
    next()
  } catch (error) { failure.value = error?.message || '' } finally { busy.value = false }
}
async function saveSetup() {
  if (busy.value) return
  if (!setupDirty.value) { next(); return }
  busy.value = true; failure.value = ''; vddWarn.value = false
  try {
    const payload = { adapter: choice.adapter, display: choice.display }
    if (choice.locale && choice.locale !== props.state.setup?.locale) payload.locale = choice.locale
    const result = (await props.callbacks.saveSetup?.(payload)) || { ok: false }
    if (result.ok) next()
    else { vddWarn.value = result.vdd === false; failure.value = result.vdd === false ? '' : (result.error || T.value.setup.error) }
  } catch (error) { failure.value = error?.message || T.value.setup.error } finally { busy.value = false }
}
// 跳到下一页: the next screen without doing what this one asks (the setup is marked as completed without changes, as 跳过 does for the whole flow)
async function skipStep() {
  if (busy.value || isLast(flow.value, idx.value)) return
  if (id.value === 'setup' && !props.state.setup?.completed) { try { await props.callbacks.skipSetup?.() } catch { /* the setup stays as it was */ } }
  next()
}
const showSkipStep = computed(() => !isLast(flow.value, idx.value) && ['setup', 'pair'].includes(id.value) && !(id.value === 'pair' && pairedClient.value) && !props.required.includes(id.value))
// what the last screen offers once the flow ends: the test tools, for a first try in the stream
const finishWithTools = computed(() => isLast(flow.value, idx.value) && !!props.callbacks.openTools)
// 跳过 leaves the rest of the flow (the flow is finished, as with 完成); a step that is required (the Web UI account) cannot be skipped, so 跳过 is not offered on it. The setup that
// would have been saved on its step is marked completed without changes, so the host does not ask for it again.
async function skip() {
  if (skipLeft.value > 0 || props.required.includes(id.value)) return
  const setupAhead = flow.value.findIndex((s) => s.id === 'setup') >= idx.value
  if (setupAhead && !props.state.setup?.completed) { try { await props.callbacks.skipSetup?.() } catch { /* the setup stays as it was */ } }
  finish()
}

const primary = computed(() => {
  const t = T.value
  switch (id.value) {
    case 'intro': return { label: t.intro.start, run: next, icon: 'arrow_forward' }
    case 'account': return accountDone.value ? (leaving.value && leaveNow ? { label: t.account.goNow, run: () => leaveNow(), icon: 'arrow_forward' } : { label: t.next, run: next, icon: 'arrow_forward', disabled: leaving.value, loading: leaving.value }) : { label: t.account.create, run: submitAccount, disabled: !accountOk.value, icon: 'login' }
    case 'setup': return { label: setupDirty.value ? t.setup.save : t.next, run: saveSetup, icon: 'arrow_forward' }
    case 'pair': return pairedClient.value ? { label: t.next, run: next, icon: 'arrow_forward' } : { label: t.pair.send, run: submitPin, disabled: !pinTyped || !canPair(pin.value, pairName.value), icon: 'link' }
    default: return isLast(flow.value, idx.value) ? { label: t.finish, run: () => finish(), icon: 'check' } : { label: t.next, run: next, icon: 'arrow_forward' }
  }
})
const showSkip = computed(() => !isLast(flow.value, idx.value) && id.value !== 'intro' && !props.required.includes(id.value) && !(id.value === 'account' && accountDone.value) && !(id.value === 'pair' && pairedClient.value))
const stepLine = computed(() => fillText(T.value.stepOf, { n: idx.value + 1, total: flow.value.length }))
const vivi = viviImage(64, typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1)
const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1
// the tagline of the first screen is the slogan of the About page (one string)
const slogan = computed(() => aboutTexts(props.locale).slogan)

const openFull = ref(false) // the notice is one line with its link; a button opens the rest where the line does not fit
const openClamped = ref(false)
let openObserver = null
const openRef = (el) => {
  openObserver?.disconnect(); openObserver = null
  if (!el || typeof ResizeObserver === 'undefined') return
  const measure = () => { if (!openFull.value) openClamped.value = el.scrollHeight > el.clientHeight + 1 }
  openObserver = new ResizeObserver(measure); openObserver.observe(el); measure()
}
onBeforeUnmount(() => openObserver?.disconnect())

// The edges of the scroll area say nothing while the content fits. When it scrolls, a hairline (outline-variant) shows at the foot while there is more below and under the header once it has
// scrolled: two one-pixel sentinels at the ends of the main area and an IntersectionObserver, no scroll listener (the CSS fades the lines in and out).
const topSentinel = ref(null)
const bottomSentinel = ref(null)
const below = ref(false)
const scrolled = ref(false)
let edgeObserver = null
let footObserver = null
const watchEdges = () => {
  edgeObserver?.disconnect()
  if (typeof IntersectionObserver === 'undefined' || !topSentinel.value || !bottomSentinel.value) return
  // where the footer is stuck over the page (a page, not the dialog) the foot of the content is the top of the footer
  const foot = document.querySelector('.m-guide__actions')
  const over = foot && getComputedStyle(foot).position === 'sticky' ? Math.round(foot.getBoundingClientRect().height) : 0
  edgeObserver = new IntersectionObserver((entries) => {
    for (const e of entries) { if (e.target === topSentinel.value) scrolled.value = !e.isIntersecting; else below.value = !e.isIntersecting }
  }, { rootMargin: `0px 0px -${over}px 0px` })
  edgeObserver.observe(topSentinel.value); edgeObserver.observe(bottomSentinel.value)
}
onMounted(() => {
  watchEdges()
  const foot = document.querySelector('.m-guide__actions')
  if (foot && typeof ResizeObserver !== 'undefined') { footObserver = new ResizeObserver(() => watchEdges()); footObserver.observe(foot) }
})
onBeforeUnmount(() => { edgeObserver?.disconnect(); footObserver?.disconnect() })
</script>

<template>
  <div class="m-guide" :data-step="id" :data-below="below || undefined" :data-scrolled="scrolled || undefined">
    <header class="m-guide__bar">
      <button v-if="idx > 0" type="button" class="m-page__back" :aria-label="T.back" :data-tip="T.back" @click="back"><MIcon name="arrow_back" /></button>
      <span class="m-guide__brand">{{ T.guide }}</span>
      <span class="m-guide__spacer" />
      <slot name="top" />
      <MIconButton v-if="closable" icon="close" :label="T.close" @click="close" />
    </header>

    <nav class="m-guide__steps" :aria-label="T.steps">
      <ol>
<!-- one segment per step of THIS flow (a step left out has none); every step reached before can be clicked to go back to it -->
        <li v-for="(s, i) in flow" :key="s.id">
          <button type="button" class="m-guide__seg" :class="{ 'is-done': i < idx || progress.done.includes(s.id), 'is-now': i === idx }" :disabled="i > maxIdx || busy" :aria-current="i === idx ? 'step' : undefined" :aria-label="T.titles[s.id]" :data-tip="T.titles[s.id]" @click="go(i)" />
        </li>
      </ol>
      <p class="m-guide__stepof" aria-live="polite">{{ stepLine }}</p>
    </nav>

    <main class="m-guide__main">
      <div ref="topSentinel" class="m-guide__sentinel" aria-hidden="true" />
      <section :key="id" class="m-guide__content">
        <header v-if="id !== 'intro'" class="m-guide__head">
          <span class="m-guide__avatar" aria-hidden="true"><img :src="vivi.src" alt="" width="48" height="48"></span>
          <div class="m-guide__headtext">
            <h1 class="m-guide__title">{{ T.titles[id] }}</h1>
            <p v-if="T.leads[id]" class="m-guide__lead">{{ T.leads[id] }}</p>
          </div>
        </header>

        <div class="m-guide__body">
          <!-- the first screen says it plainly: open source and free, and not for sale (the wording of MAA and ZZZ OneDragon, by name and licence) -->
          <aside v-if="id === flow[0]?.id && id !== 'whatsnew'" class="m-guide__open" :class="{ 'is-open': openFull }" role="note">
            <MIcon name="info" />
            <p :ref="openRef">{{ T.openSource.text }}</p>
            <a :href="PRODUCT.repo" target="_blank" rel="noopener noreferrer" @click.prevent="openLink(PRODUCT.repo)">{{ T.openSource.link }}</a>
            <button v-if="openClamped || openFull" type="button" class="m-guide__openmore" :aria-expanded="openFull" :aria-label="openFull ? T.openSource.less : T.openSource.more" :data-tip="openFull ? T.openSource.less : T.openSource.more" @click="openFull = !openFull"><MIcon :name="openFull ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" /></button>
          </aside>
          <!-- 0 intro: the project, the plain notice (above) and the language -->
          <template v-if="id === 'intro'">
            <!-- the hero of the About page: 薇薇, the name, the slogan, on the card colour -->
            <MProductHero class="m-guide__herocard" :slogan="slogan" :mascot="72" />
            <h2 class="m-guide__sub">{{ T.language }}</h2>
            <!-- an airy list; the rest opens in place from a text button under it -->
            <MGroup class="m-guide__langs" role="radiogroup" :aria-label="T.language">
              <MItem action role="radio" icon="language" :title="followSystemTitle" data-locale="system" :selected="localeChoice === 'system'" :aria-checked="localeChoice === 'system'" @click="pickLocale('system')"><template #trail><MIcon v-if="localeChoice === 'system'" name="check" /></template></MItem>
              <MItem v-for="l in shownLanguages" :key="l.code" action role="radio" :title="l.name" :data-locale="l.code" :selected="localeChoice === l.code" :aria-checked="localeChoice === l.code" @click="pickLocale(l.code)"><template #trail><MIcon v-if="localeChoice === l.code" name="check" /></template></MItem>
            </MGroup>
            <div v-if="hasMoreLanguages" class="m-guide__more">
              <MButton variant="text" :icon="moreOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" data-locale-more :aria-expanded="moreOpen" @click="moreOpen = !moreOpen">{{ moreOpen ? T.intro.fewerLanguages : T.intro.moreLanguages }}</MButton>
            </div>
          </template>

          <!-- 2 account -->
          <template v-else-if="id === 'account'">
            <form id="m-guide-account" class="m-guide__form" novalidate @submit.prevent="submitAccount" @keydown="submitOnEnter">
              <MGroup>
                <MFieldItem v-model="form.username" :label="T.account.username" autocomplete="username" :disabled="accountDone" />
                <MFieldItem v-model="form.password" type="password" :label="T.account.password" autocomplete="new-password" required :disabled="accountDone" :supporting="[T.account.note, T.account.local].filter(Boolean).join(' ')" />
                <MFieldItem v-model="form.confirm" type="password" :label="T.account.confirm" autocomplete="new-password" required :disabled="accountDone" :error="accountError" :supporting="!accountError && form.confirm && form.password ? T.account.match : ''" />
              </MGroup>
            </form>
            <MBanner v-if="failure" tone="error" icon="error">{{ failure }}</MBanner>
            <MBanner v-if="accountDone" tone="info" icon="check_circle">{{ T.account.done }}</MBanner>
          </template>

          <!-- 4 graphics card and display (and what happens to the other displays while streaming) -->
          <template v-else-if="id === 'setup'">
            <MGroup v-if="uniqueAdapters.length">
              <MChoiceItem v-model="choice.adapter" icon="developer_board" :title="T.setup.gpu" :options="adapterOptions" :cancel-label="T.close" />
            </MGroup>
            <p v-else class="m-guide__note"><MIcon name="info" />{{ T.setup.none }}</p>
            <h2 class="m-guide__label">{{ T.setup.display }}</h2>
            <MGroup role="radiogroup" :aria-label="T.setup.display">
              <MItem v-if="state.setup?.virtual !== false" action role="radio" icon="tv" :selected="choice.display === 'ZakoHDR'" :aria-checked="choice.display === 'ZakoHDR'" :title="T.setup.virtual" :text="T.setup.virtualNote" @click="choice.display = 'ZakoHDR'" />
              <MItem v-for="d in displays" :key="d.id" action role="radio" icon="desktop_windows" :selected="choice.display === d.id" :aria-checked="choice.display === d.id" :title="d.label" :text="d.text || T.setup.physical" @click="choice.display = d.id" />
            </MGroup>
            <p v-if="choice.display === 'ZakoHDR' && state.setup?.win10" class="m-guide__note" data-note="win10-hdr"><MIcon name="info" />{{ T.setup.hdrWin10 }}</p>
            <MBanner v-if="vddWarn" tone="warn" icon="warning">{{ T.setup.vddNeeded }}</MBanner>
            <MBanner v-if="failure" tone="error" icon="error">{{ failure }}</MBanner>
          </template>

          <!-- 3 appearance and motion: the same components as the 个性化 page, live in this window -->
          <MAppearance v-else-if="id === 'appearance'" :locale="locale" compact essential :show-icons="false" />
          <MGuideMotion v-else-if="id === 'motion'" :locale="locale" />

          <!-- what is new: the first screen of an upgrade -->
          <template v-else-if="id === 'whatsnew'">
            <MGroup>
              <MItem v-for="item in T.whatsnew.items" :key="item.title" :icon="item.icon" :title="item.title" :text="item.text" />
            </MGroup>
            <p v-if="T.whatsnew.note" class="m-guide__note"><MIcon name="info" />{{ T.whatsnew.note }}</p>
          </template>

          <!-- the end of the host part: it is ready; the clients to get for the devices one will play on -->
          <MGuideHostDone v-else-if="id === 'hostdone'" :T="T" :locale="locale" @open-url="openLink" />

          <!-- 5 install the client: the one view of 连接设备 and the download page for every system (the chips, the recommended client with its QR code for a phone, its files in one column, the other clients) -->
          <template v-else-if="id === 'install'">
            <MConnectPanel class="m-guide__install" :os="device" :locale="locale" :qr="props.qr" :assets-of="releases.assetsOf" :version-of="releases.versionOf" no-downloads-link @update:os="pickDevice" @open-url="openLink" />
            <p v-if="deviceInfo?.lanNote" class="m-guide__note"><MIcon name="wifi" />{{ T.install.permission }}</p>
          </template>

          <!-- 6 pair from an installed client: it finds this computer by itself; else the address, picked by the way the client connects -->
          <MGuideAddress v-else-if="id === 'address'" :T="T" :addresses="state.host?.addresses" :host-name="state.host?.name || ''" :network="state.network || {}" :copied="copied" :pair-qr="hasQr && !phone ? qrView : null" :callbacks="callbacks" @copy="copyText" @qr-begin="qrPair?.begin()" @qr-stop="qrPair?.stop()" />

          <!-- 7 pair: the QR code and the PIN side by side (the QR opens a pairing window on the host only while this step is shown) -->
          <template v-else-if="id === 'pair'">
            <MGroup v-if="pairedClient" role="status">
              <MItem icon="check_circle" :title="pairedClient.name ? fillText(T.pair.ok, { name: pairedClient.name }) : T.pair.qrPaired">
                <template #trail><MButton variant="tonal" icon="person_add" @click="pairAnother">{{ T.pair.another }}</MButton></template>
              </MItem>
            </MGroup>
            <div v-else class="m-guide__pair" :class="{ 'has-qr': qrShown, 'is-pin-first': phone }">
              <section v-if="qrShown" class="m-guide__pair-card m-guide__pair-qr" :aria-label="T.pair.qr">
                <h2 class="m-guide__label">{{ T.pair.qr }}</h2>
                <figure v-if="qrView.state === 'ready'" class="m-guide__qr m-guide__qr--pair">
                  <svg :viewBox="`0 0 ${qrView.image.size} ${qrView.image.size}`" shape-rendering="crispEdges" role="img" :aria-label="T.pair.qr"><rect :width="qrView.image.size" :height="qrView.image.size" fill="#fff" /><path :d="qrView.image.d" fill="#000" /></svg>
                  <figcaption>{{ fillText(T.pair.qrSeconds, { n: qrView.seconds }) }}<code v-if="qrView.address" class="m-guide__qraddr">{{ qrView.address }}</code></figcaption>
                </figure>
                <p v-else-if="qrView.state === 'loading'" class="m-guide__note"><MIcon name="sync" />{{ T.pair.qrLoading }}</p>
                <template v-else>
                  <p class="m-guide__note"><MIcon name="info" />{{ qrView.state === 'expired' ? T.pair.qrExpired : T.pair.qrError }}</p>
                  <MButton variant="tonal" icon="refresh" @click="qrPair.begin()">{{ T.pair.qrRefresh }}</MButton>
                </template>
                <p class="m-guide__note"><MIcon name="qr_code_scanner" />{{ T.pair.scanHow }}</p>
                <p class="m-guide__note"><MIcon name="lock" />{{ T.pair.qrNote }}</p>
              </section>
              <div v-if="qrShown" class="m-guide__pair-or" aria-hidden="true"><span>{{ T.pair.or }}</span></div>
              <section class="m-guide__pair-card m-guide__pair-pin" :aria-label="T.pair.byPin">
                <h2 v-if="qrShown" class="m-guide__label">{{ T.pair.byPin }}</h2>
                <MField v-model="pairName" :label="T.pair.name" :disabled="busy" @keydown.enter="submitPin" />
                <MPinPad v-model="pin" :length="PIN_LENGTH" :label="T.pair.pin" :disabled="busy" @update:model-value="pinTyped = true" @complete="submitPin" />
                <p v-if="busy" class="m-guide__note"><MIcon name="sync" />{{ T.pair.waiting }}</p>
                <p v-else class="m-guide__note"><MIcon name="info" />{{ T.pair.hint }}</p>
                <MBanner v-if="pairError" tone="error" icon="error">{{ pairError }}</MBanner>
                <MButton v-if="hasQr && !qrShown" class="m-guide__showqr" variant="text" icon="qr_code_2" @click="revealQr">{{ T.pair.showQr }}</MButton>
              </section>
            </div>
            <p v-if="!Array.isArray(state.clients)" class="m-guide__note"><MIcon name="info" />{{ T.pair.unavailable }}</p>
          </template>

          <!-- 8 who may open the Web UI and 9 remote access (both optional) -->
          <MGuideWebAccess v-else-if="id === 'webaccess'" :locale="locale" :state="state" :callbacks="callbacks" :qr="qr" />
          <MRemoteAccess v-else-if="id === 'remote'" :locale="locale" :state="state" :callbacks="callbacks" />

          <!-- 9 first stream check: what to confirm, and the test tools to try it with, in place -->
          <template v-else-if="id === 'connect'">
            <div v-if="sessionsKnown" class="m-guide__live" :class="{ 'is-on': !!session }" role="status">
              <MIcon :name="session ? 'cast_connected' : 'sensors'" />
              <span>{{ session ? fillText(T.connect.live, { line: sessionLine(session) }) : T.connect.waiting }}</span>
            </div>
            <p v-else class="m-guide__note"><MIcon name="info" />{{ T.connect.noDetect }}</p>
            <h2 class="m-guide__label">{{ T.connect.check }}</h2>
            <MGroup>
              <MItem v-for="c in CONNECT_CHECKS" :key="c.id" action role="checkbox" :aria-checked="checks[c.id]" :icon="c.icon" :selected="checks[c.id]" :title="T.connect.checks[c.id]" :text="T.connect.hints[c.id]" @click="checks[c.id] = !checks[c.id]">
                <template #trail><MIcon :name="checks[c.id] ? 'check_circle' : 'radio_button_unchecked'" :fill="checks[c.id]" /></template>
              </MItem>
            </MGroup>
            <h2 class="m-guide__label">{{ T.connect.tryTitle }}</h2>
            <p class="m-guide__text">{{ T.connect.tryText }}</p>
            <MGuideTry v-model="tryTool" :locale="locale" :title="T.connect.tryTitle" :clock-label="T.connect.clock" />
            <h2 class="m-guide__label">{{ T.connect.noDesktop }}</h2>
            <MGroup>
              <MItem wrap icon="build" :title="callbacks.restoreApps ? T.connect.restore : T.connect.openApps" :text="`${T.connect.restoreNote} ${T.connect.refreshClient}`">
                <template #trail><MButton variant="tonal" :icon="callbacks.restoreApps ? 'restart_alt' : 'apps'" :loading="restore.busy" @click="restoreApps">{{ callbacks.restoreApps ? T.connect.restore : T.connect.openApps }}</MButton></template>
              </MItem>
            </MGroup>
            <div v-if="restore.note" ref="restoreResult" class="m-guide__result" :class="{ 'is-bad': restore.failed }" role="status"><MBanner :tone="restore.failed ? 'error' : 'info'" :icon="restore.failed ? 'error' : 'check_circle'">{{ restore.note }}</MBanner></div>
          </template>

          <!-- 10 add games -->
          <template v-else-if="id === 'apps'">
            <MGroup>
              <MItem action icon="search" :title="T.apps.scan" :text="state.apps?.scanAvailable ? T.apps.scanText : T.apps.scanOnly" :disabled="!state.apps?.scanAvailable" @click="openApps('scan')" />
              <MItem action icon="add_circle" :title="T.apps.manual" :text="T.apps.manualText" @click="openApps('add')" />
            </MGroup>
            <MBanner v-if="appsAdded" tone="info" icon="check_circle">{{ fillText(T.apps.added, { n: appsAdded }) }}</MBanner>
          </template>

          <!-- 11 update method -->
          <MGuideUpdate v-else-if="id === 'update'" :locale="locale" :state="state" :callbacks="callbacks" @open-url="openLink" />
          <!-- the last page of the guide: one quiet line under the step, the project's two doors outside GitHub (the website follows the language) -->
          <p v-if="isLast(flow, idx)" class="m-guide__follow" data-follow>{{ T.follow }}<a :href="brandUrl('bilibili', locale)" target="_blank" rel="noopener noreferrer" @click.prevent="openLink(brandUrl('bilibili', locale))">{{ T.followBilibili }}</a><span aria-hidden="true"> · </span><a :href="brandUrl('site', locale)" target="_blank" rel="noopener noreferrer" @click.prevent="openLink(brandUrl('site', locale))">{{ T.followSite }}</a></p>
        </div>
      </section>
      <div ref="bottomSentinel" class="m-guide__sentinel" aria-hidden="true" />
    </main>

    <!-- the first screen's plain notes, at the foot where they are seen without scrolling and are not a question: the program is free (and what to do if it was paid for), how to support it, and, once, that error reports are on -->
    <div v-if="id === 'intro'" class="m-guide__notes" data-guide-notes>
      <p data-note="free">{{ S.freeNotice }}</p>
      <p data-note="support">{{ S.supportLine }}</p>
      <p v-if="errorsNotice" data-note="errors">{{ errorsParts[0] }}<button v-if="callbacks.openPrivacy" type="button" class="m-guide__notelink" data-note-link @click="callbacks.openPrivacy()">{{ C.errorsNoticeLink }}</button><template v-else>{{ C.errorsNoticeLink }}</template>{{ errorsParts[1] }}</p>
    </div>

    <footer class="m-guide__actions">
      <!-- the first screens say where the person is at the foot, where the left of the footer would be empty -->
      <span v-if="id === 'intro'" class="m-guide__footstep" aria-hidden="true">{{ stepLine }}</span>
      <MButton v-if="idx > 0" class="m-guide__prev" variant="text" size="lg" icon="arrow_back" :disabled="busy" :aria-label="T.back" :title="T.back" @click="back"><span class="m-guide__lbl">{{ T.back }}</span></MButton>
      <MButton v-if="showSkip" variant="text" size="lg" icon="skip_next" :disabled="busy || skipLeft > 0" @click="skip">{{ skipLeft > 0 ? fillText(T.skipIn, { n: skipLeft }) : T.skip }}</MButton>
      <MButton v-if="showSkipStep" class="m-guide__skipstep" variant="text" size="lg" icon="arrow_forward" :disabled="busy" :aria-label="T.skipStep" :title="T.skipStep" @click="skipStep"><span class="m-guide__lbl" :class="{ 'is-long': T.skipStep.length > 8 }">{{ T.skipStep }}</span></MButton>
      <MButton v-if="finishWithTools" variant="tonal" size="lg" icon="build" :disabled="busy" :aria-label="T.finishTools" :title="T.finishTools" @click="openTools"><span class="m-guide__lbl" :class="{ 'is-long': T.finishTools.length > 12 }">{{ T.finishTools }}</span></MButton>
      <MButton size="lg" :icon="primary.icon" :loading="busy || primary.loading" :disabled="primary.disabled || busy" @click="primary.run">{{ primary.label }}</MButton>
    </footer>

    <!-- the game library scan and adding by hand: a sheet over the apps step; closing it returns to the flow -->
    <MGuideAppsSheet v-model="appsSheet" :T="T" :callbacks="callbacks" @added="appsAdded += $event" />
  </div>
</template>
