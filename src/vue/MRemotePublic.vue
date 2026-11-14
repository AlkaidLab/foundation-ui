<script setup>
import MBreakText from './MBreakText.vue'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MBanner from './MBanner.vue'
import MField from './MField.vue'
import MProgress from './MProgress.vue'
import MDialog from './MDialog.vue'
import { pickLanAddresses, portText, remotePorts, upnpState } from './guideModel.js'
import { fillText } from './guideTexts.js'
import { formatHostAddress } from './hostAddress.js'
import { remoteTexts } from './remoteTexts.js'
import { failureWords, reachTexts } from '../settings/reachTexts.js'
import { clockText, publicAddress, validateEndpoint } from '../settings/reachability.js'
import { RESTART_INTERVAL_MS, RESTART_TIMEOUT_MS, endpointFor, failureOf, portResults, portRun, testOutcome, upnpOutcome, watchRestart } from '../settings/remoteFlow.js'

// Remote access over the internet as a flow in which every step says what happened: turn UPnP on, restart the host and prove that it restarted, read what the router did, test a public
// address, and, when UPnP does not work, forward the ports by hand. The first-run step, 主机设置 › 网络 and 帮助 show this one component (MRemoteAccess holds it).
//   state:     { network: { port, upnpActive, upnpSaved, loaded, endpoints }, host: { platform, addresses }, reach: { report, status, http, cause } }
//   callbacks: loadNetwork(), setUpnp(on) -> { ok, error? }, restartHost() -> { ok, error? }, probeHost() -> { ok, startedAt? } (a cheap read of the host: the proof of the restart),
//              setPublicEndpoints(value), checkReach(force, { test }), openSetting(key), openLink(url), copy(text); restartTimeoutMs / restartIntervalMs tune the wait (90 s, 1.5 s)
const props = defineProps({
  locale: { type: String, default: 'en' },
  state: { type: Object, default: () => ({}) },
  callbacks: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['mesh'])
const T = computed(() => remoteTexts(props.locale))
const F = computed(() => T.value.flow)
const R = computed(() => reachTexts(props.locale))

const net = computed(() => props.state.network || {})
const up = computed(() => upnpState(net.value))
const reach = computed(() => props.state.reach || { report: null, status: 'idle', http: 0, cause: '' })
const report = computed(() => reach.value.report)
const failure = computed(() => failureOf(reach.value))
const failText = computed(() => failureWords(failure.value, props.locale))

/* ---------- state of the flow ---------- */
const phase = ref('idle') // idle | restarting | restarted | timeout
const away = ref(false)
const restartOut = ref(null)
const restartStart = ref('')
const note = ref('')
const busy = reactive({ upnp: false, test: false, save: false })
const confirm = ref(false)
let alive = true
onBeforeUnmount(() => { alive = false })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const runReach = (force = true, options) => props.callbacks.checkReach?.(force, options)

async function setUpnp(on) {
  busy.upnp = true; note.value = ''
  try {
    const r = (await props.callbacks.setUpnp?.(on)) || { ok: false }
    if (!r.ok) note.value = r.error || R.value.failed
    await props.callbacks.loadNetwork?.()
    if (r.ok && up.value.pending) phase.value = 'idle'
  } catch (error) { note.value = error?.message || R.value.failed } finally { busy.upnp = false }
}
const askUpnp = () => { if (up.value.on) void setUpnp(false); else confirm.value = true }
const confirmUpnp = () => { confirm.value = false; void setUpnp(true) }

async function restartAndWatch() {
  note.value = ''; away.value = false; restartOut.value = null; phase.value = 'restarting'
  const probe = props.callbacks.probeHost
  let before = ''
  if (probe) { try { before = (await probe())?.startedAt || '' } catch { /* the host is already away: the restart is seen as it comes back */ } }
  restartStart.value = before
  let asked
  try { asked = (await props.callbacks.restartHost?.()) || { ok: false } } catch (error) { asked = { ok: false, error: error?.message } }
  if (!asked.ok) { phase.value = 'idle'; note.value = asked.error || R.value.failed; return }
  if (!probe) { restartOut.value = { phase: 'timeout', reason: 'never-left', waitedMs: 0 }; phase.value = 'timeout'; return }
  await waitForHost(probe, before)
}
async function watchAgain() {
  phase.value = 'restarting'; away.value = false
  await waitForHost(props.callbacks.probeHost, restartStart.value)
}
async function waitForHost(probe, before) {
  const out = await watchRestart({ probe: () => probe(), before, sleep, cancelled: () => !alive, timeoutMs: props.callbacks.restartTimeoutMs || RESTART_TIMEOUT_MS, intervalMs: props.callbacks.restartIntervalMs || RESTART_INTERVAL_MS, onPhase: (p) => { if (p === 'away') away.value = true } })
  if (!alive || out.phase === 'cancelled') return
  restartOut.value = out
  if (out.phase !== 'back') { phase.value = 'timeout'; return }
  phase.value = 'restarted'
  try { await props.callbacks.loadNetwork?.() } catch { /* the check below says what it could not read */ }
  await runReach(true)
}
const postponed = ref(false)

/* ---------- the result of UPnP ---------- */
const outcome = computed(() => upnpOutcome(report.value))
const ranNow = computed(() => up.value.on && !up.value.pending && phase.value !== 'restarting')
const outcomeShown = computed(() => ranNow.value && failure.value.kind === 'ok' && report.value)
const portsText = computed(() => {
  const o = outcome.value
  const tcp = portRun(o.mapped.filter((m) => m.proto === 'tcp').map((m) => m.port))
  const udp = portRun(o.mapped.filter((m) => m.proto === 'udp').map((m) => m.port))
  return [tcp && `${tcp} TCP`, udp && `${udp} UDP`].filter(Boolean).join(' · ')
})
const missingText = computed(() => outcome.value.missing.map((m) => `${m.proto.toUpperCase()} ${m.port}`).join(', '))
const wanWarn = computed(() => {
  const o = outcome.value
  if (o.kind === 'no-answer' || !o.wan) return ''
  return o.wanClass === 'cgnat' ? fillText(F.value.outcome.cgnat, { wan: o.wan }) : o.wanClass === 'private' ? fillText(F.value.outcome.private, { wan: o.wan }) : ''
})
const failed = computed(() => !!outcomeShown.value && ['no-answer', 'none', 'partial'].includes(outcome.value.kind))
const outcomeText = computed(() => {
  const o = outcome.value
  const t = F.value.outcome[o.kind] || F.value.outcome.unknown
  return { ...t, text: fillText(t.text, { ports: portsText.value, mapped: portsText.value, missing: missingText.value }) }
})

/* ---------- test a public address ---------- */
const saved = computed(() => String(net.value.endpoints || '').split(/[,\s]+/).filter(Boolean))
const addr = ref(saved.value[0] || '')
watch(saved, (list) => { if (!addr.value && list[0]) addr.value = list[0] })
const tested = ref('')
const check = computed(() => (addr.value.trim() ? validateEndpoint(addr.value.trim()) : null))
const addrError = computed(() => (check.value && !check.value.ok ? R.value.address.errors[check.value.error] || R.value.address.errors.format : ''))
const wan = computed(() => (report.value?.public?.router.wanClass === 'public' ? report.value.public.router.wanIp : ''))
const endpoint = computed(() => endpointFor(report.value, tested.value))
const result = computed(() => (tested.value ? testOutcome(endpoint.value) : null))
const ignored = computed(() => !!tested.value && !busy.test && reach.value.status === 'ready' && !endpoint.value)
async function runTest() {
  if (!check.value?.ok || busy.test) return
  busy.test = true; tested.value = ''
  try { await runReach(true, { test: check.value.text }); tested.value = check.value.text } finally { busy.test = false }
}
async function saveUse(thenTest) {
  if (!check.value?.ok) return
  busy.save = true; note.value = ''
  try {
    const r = (await props.callbacks.setPublicEndpoints?.(check.value.text)) || { ok: false }
    if (!r.ok) { note.value = r.error || R.value.address.failed; return }
    await props.callbacks.loadNetwork?.()
    if (thenTest) { busy.test = true; try { await runReach(true); tested.value = check.value.text } finally { busy.test = false } }
  } catch (error) { note.value = error?.message || R.value.address.failed } finally { busy.save = false }
}
const isSaved = computed(() => !!check.value?.ok && saved.value.includes(check.value.text))
const E = computed(() => R.value.endpoint.errors)
const testView = computed(() => {
  const o = result.value
  const e = endpoint.value
  if (!o || o.kind === 'not-run' || !e) return null
  const t = F.value.test
  const a = tested.value
  const port = o.port || e.httpsPort
  switch (o.kind) {
    case 'reached': return { tone: 'ok', icon: 'check_circle', title: fillText(t.reached.title, { addr: a }), how: fillText(t.how, { addr: o.address || a, port, ms: o.latencyMs }), proves: fillText(t.reached.proves, { port }), limit: t.reached.limit }
    case 'reached-inside': return { tone: 'info', icon: 'info', title: fillText(t['reached-inside'].title, { scope: t.scopes[o.scope] || '' }), how: fillText(t.how, { addr: o.address || a, port, ms: o.latencyMs }), proves: t['reached-inside'].proves }
    case 'unresolved': return { tone: 'error', icon: 'error', title: fillText(t.unresolved.title, { addr: a }), next: t.unresolved.next }
    case 'other-device': return { tone: 'error', icon: 'error', title: fillText(t['other-device'].title, { addr: a }), next: t['other-device'].next }
    default: return { tone: 'error', icon: 'error', title: fillText(t.failed.title, { addr: a, word: E.value[o.error] || E.value.failed }), how: fillText(t.howFailed, { addr: a, port }), next: fillText(t.next[o.error] || t.next.failed, { port }), hairpin: o.hairpinLimit ? t.hairpin : '' }
  }
})
const rows = computed(() => (report.value ? portResults(report.value, result.value) : []))
const PORT_ROLE = computed(() => R.value.roles)
const rowTest = (row) => {
  if (!row.testable) return { word: F.value.test.table.untested, tone: 'quiet' }
  const o = row.test
  if (!o) return { word: '—', tone: 'quiet' }
  return o.kind === 'reached' ? { word: R.value.endpoint.reached, tone: 'ok' } : o.kind === 'reached-inside' ? { word: F.value.test.scopes[o.scope] || '', tone: 'quiet' } : { word: E.value[o.error] || E.value.failed, tone: 'error' }
}
const routerWord = (row) => (row.mapped === true ? F.value.test.table.yes : row.mapped === false ? F.value.test.table.no : F.value.test.table.silent)
const hostWord = (row) => (row.listening === true ? F.value.test.table.listening : row.onDemand ? F.value.test.table.onDemand : row.listening === false ? F.value.test.table.closed : '—')

/* ---------- success ---------- */
const done = computed(() => !!report.value && (report.value.public.verdict === 'verified' || result.value?.kind === 'reached'))
// the client types the HTTP port too when the host's base port is not the default: the host tested the address on that port (a typed host:port keeps its own)
const doneAddress = computed(() => formatHostAddress(result.value?.kind === 'reached' ? tested.value : publicAddress(report.value), base.value))
const copied = ref('')
let timer = 0
async function copyText(text) {
  try {
    if (props.callbacks.copy) await props.callbacks.copy(text)
    else await globalThis.navigator?.clipboard?.writeText(text)
    copied.value = text; clearTimeout(timer); timer = setTimeout(() => { copied.value = '' }, 1600)
  } catch { /* the text stays visible */ }
}
onBeforeUnmount(() => clearTimeout(timer))

/* ---------- forward by hand ---------- */
const meshAddresses = computed(() => (report.value?.mesh.adapters || []).flatMap((a) => a.addresses))
const lan = computed(() => {
  const list = pickLanAddresses(props.state.host?.addresses, { exclude: meshAddresses.value, lanOnly: true })
  return (list.find((a) => a.rank === 0) || list[0])?.address || ''
})
const base = computed(() => report.value?.ports.find((p) => p.role === 'http')?.port || remotePorts(net.value.port).base)
const ports = computed(() => {
  const list = report.value?.ports || []
  if (!list.length) {
    const p = remotePorts(net.value.port)
    return { tcp: p.tcp.map((e) => ({ text: String(e.port), needed: e.needed })), udp: p.udp.map((e) => ({ text: portText(e), needed: true })) }
  }
  const tcp = list.filter((p) => p.proto === 'tcp').sort((a, b) => a.port - b.port).map((p) => ({ text: String(p.port), needed: p.role !== 'web' }))
  return { tcp, udp: [{ text: portRun(list.filter((p) => p.proto === 'udp').map((p) => p.port)), needed: true }] }
})
const manualOpen = ref(false)
watch(failed, (value) => { if (value) manualOpen.value = true }, { immediate: true })
const manual = ref(null)
function toManual() { manualOpen.value = true; manual.value?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }) }
const startedText = computed(() => clockText(restartOut.value?.startedAt) || '')
const timeoutText = computed(() => {
  const o = restartOut.value
  if (!o || o.phase !== 'timeout') return null
  return { title: fillText(F.value.timeout.title, { s: Math.round(Math.max(o.waitedMs, 0) / 1000) || RESTART_TIMEOUT_MS / 1000 }), why: F.value.timeout[o.reason], next: F.value.timeout.next[o.reason] }
})
defineExpose({ toManual })
</script>

<template>
  <div class="m-rf">
    <MBanner tone="warn" icon="warning"><b>{{ T.risksTitle }}</b><ul class="m-remote__risks"><li v-for="risk in T.risks" :key="risk">{{ risk }}</li></ul></MBanner>

    <section v-if="done" class="m-rf__done" data-state="done">
      <span class="m-ico m-rf__doneico" data-tone="0"><MIcon name="check_circle" fill /></span>
      <div class="m-rf__donebody">
        <h3>{{ F.done.title }}</h3>
        <p v-if="doneAddress">{{ F.done.text }}</p>
        <div v-if="doneAddress" class="m-rf__addr"><code><MBreakText :text="doneAddress" /></code><MButton variant="tonal" size="sm" :icon="copied === doneAddress ? 'check' : 'content_copy'" @click="copyText(doneAddress)">{{ copied === doneAddress ? R.copied : R.copy }}</MButton></div>
        <small v-if="report?.public.verdict === 'verified'">{{ F.done.hostSaid }}</small>
      </div>
    </section>

    <MBanner v-if="failure.kind !== 'ok'" class="m-reach__fail" :tone="failure.kind === 'old-host' ? 'info' : 'error'" :icon="failure.kind === 'old-host' ? 'info' : 'error'" data-state="check-failed">
      <b>{{ failText.title }}</b> {{ failText.why }} <span v-if="failText.next">{{ failText.next }}</span>
      <template v-if="failure.kind === 'failed-run'" #actions><MButton variant="text" size="sm" icon="refresh" :loading="reach.status === 'loading'" @click="runReach(true)">{{ R.recheck }}</MButton></template>
    </MBanner>

    <ol class="m-rf__steps">
      <!-- 1 · UPnP -->
      <li class="m-rf__step" :class="{ 'is-done': up.on && !up.pending && phase !== 'restarting', 'is-warn': up.pending || phase === 'timeout', 'is-run': phase === 'restarting' }" :style="{ order: 1 }" data-step="upnp">
        <header>
          <span class="m-rf__badge"><MIcon :name="phase === 'restarting' ? 'sync' : phase === 'timeout' ? 'error' : up.on && !up.pending ? 'check_circle' : up.pending ? 'restart_alt' : 'power_settings_new'" fill /></span>
          <div><h3>{{ F.steps.upnp }}</h3><p>{{ T.upnpLead }}</p></div>
          <MButton :variant="up.on ? 'text' : 'filled'" :icon="up.on ? 'toggle_on' : 'power_settings_new'" :loading="busy.upnp" :disabled="!up.known || phase === 'restarting'" @click="askUpnp">{{ up.on ? T.upnpTurnOff : T.upnpTurnOn }}</MButton>
        </header>
        <p class="m-rf__line"><MIcon :name="up.on && !up.pending ? 'check_circle' : 'info'" />{{ !up.known ? F.upnp.unknown : up.pending ? (up.on ? F.upnp.pending : F.upnp.pendingOff) : up.on ? F.upnp.on : F.upnp.off }}</p>

        <div v-if="up.pending && phase === 'idle' && !postponed" class="m-rf__sub" data-state="restart-ask">
          <b>{{ F.restartAsk.title }}</b><p>{{ F.restartAsk.text }}</p>
          <div class="m-rf__actions"><MButton icon="restart_alt" @click="restartAndWatch">{{ F.restartAsk.now }}</MButton><MButton variant="text" @click="postponed = true">{{ F.restartAsk.later }}</MButton></div>
        </div>
        <div v-else-if="up.pending && phase === 'idle'" class="m-rf__actions"><MButton variant="tonal" icon="restart_alt" @click="restartAndWatch">{{ F.restartAsk.now }}</MButton></div>

        <div v-if="phase === 'restarting'" class="m-rf__sub" data-state="restarting">
          <b>{{ F.restarting.title }}</b><MProgress :label="F.restarting.title" />
          <p>{{ away ? F.restarting.away : F.restarting.wait }}</p>
        </div>
        <div v-else-if="phase === 'restarted'" class="m-rf__sub is-ok" data-state="restarted">
          <b><MIcon name="check_circle" fill />{{ F.restarted.title }}</b>
          <p>{{ fillText(F.restarted.proofs[restartOut?.proof] || F.restarted.proofs['went-away'], { time: startedText }) }}</p>
          <template v-if="reach.status === 'loading'"><MProgress :label="F.checkingRouter" /><p>{{ F.checkingRouter }}</p></template>
        </div>
        <div v-else-if="phase === 'timeout' && timeoutText" class="m-rf__sub is-bad" data-state="restart-timeout">
          <b><MIcon name="error" fill />{{ timeoutText.title }}</b><p>{{ timeoutText.why }}</p><p>{{ timeoutText.next }}</p>
          <div class="m-rf__actions"><MButton variant="tonal" icon="refresh" @click="watchAgain">{{ F.timeout.again }}</MButton><MButton variant="text" icon="restart_alt" @click="restartAndWatch">{{ F.timeout.retry }}</MButton></div>
        </div>
      </li>

      <!-- 2 · what UPnP did -->
      <li v-if="outcomeShown || (ranNow && reach.status === 'loading' && phase !== 'restarted')" class="m-rf__step" :class="{ 'is-done': outcome.kind === 'mapped', 'is-bad': failed }" :style="{ order: 2 }" :data-step="'result'" :data-kind="outcomeShown ? outcome.kind : 'loading'">
        <template v-if="outcomeShown">
          <header>
            <span class="m-rf__badge"><MIcon :name="outcome.kind === 'mapped' ? 'check_circle' : failed ? 'error' : 'help'" fill /></span>
            <div><h3>{{ outcomeText.title }}</h3><p>{{ outcomeText.text }}</p></div>
          </header>
          <p v-if="outcomeText.next" class="m-rf__line"><MIcon name="arrow_forward" />{{ outcomeText.next }}</p>
          <p v-if="wanWarn" class="m-rf__line is-warn"><MIcon name="warning" />{{ wanWarn }}</p>
          <div v-if="outcome.kind !== 'mapped'" class="m-rf__actions">
            <MButton variant="tonal" icon="refresh" :loading="reach.status === 'loading'" @click="runReach(true)">{{ F.outcome.recheck }}</MButton>
            <MButton v-if="failed" variant="text" icon="rule" @click="toManual">{{ F.outcome.toManual }}</MButton>
            <MButton v-if="wanWarn" variant="text" icon="hub" @click="emit('mesh')">{{ F.outcome.toMesh }}</MButton>
          </div>
        </template>
        <template v-else><header><span class="m-rf__badge"><MIcon name="sync" fill /></span><div><h3>{{ F.checkingRouter }}</h3></div></header><MProgress :label="F.checkingRouter" /></template>
      </li>

      <!-- 3 · forward by hand: after UPnP failed it comes before the test -->
      <li ref="manual" class="m-rf__step m-rf__manual" :class="{ 'is-bad': failed }" :style="{ order: failed ? 3 : 5 }" data-step="manual">
        <details :open="manualOpen" @toggle="manualOpen = $event.target.open">
          <summary><span class="m-rf__badge"><MIcon name="rule" fill /></span><div><h3>{{ T.manualTitle }}</h3></div><MIcon class="m-rf__chev" name="keyboard_arrow_down" /></summary>
          <p class="m-remote__p">{{ fillText(T.manualLead, { base }) }}</p>
          <svg class="m-remote__art" viewBox="0 0 480 120" role="img" :aria-label="`${T.routerArt.pc} · ${T.routerArt.router} · ${T.routerArt.net}`" focusable="false">
            <g class="ra-node"><rect x="14" y="30" width="96" height="60" rx="14" /><text x="62" y="66" text-anchor="middle">{{ T.routerArt.pc }}</text></g>
            <g class="ra-node ra-mid"><rect x="192" y="30" width="96" height="60" rx="14" /><text x="240" y="66" text-anchor="middle">{{ T.routerArt.router }}</text></g>
            <g class="ra-node"><rect x="370" y="30" width="96" height="60" rx="14" /><text x="418" y="66" text-anchor="middle">{{ T.routerArt.net }}</text></g>
            <path class="ra-link" d="M110 60H192M288 60H370" /><path class="ra-head" d="M184 54L192 60L184 66M362 54L370 60L362 66" />
            <g class="ra-rule"><rect x="150" y="96" width="180" height="20" rx="10" /><text x="240" y="110" text-anchor="middle">{{ T.routerArt.rule }}</text></g>
          </svg>
          <ol class="m-remote__steps"><li v-for="(step, i) in T.routerSteps" :key="i"><b>{{ i + 1 }}</b><span>{{ step }}</span></li></ol>
          <dl class="m-remote__ports">
            <div><dt>{{ T.target }}</dt><dd><i class="m-remote__chip is-target">{{ lan || T.targetUnknown }}</i></dd></div>
            <div><dt>{{ T.tcp }}</dt><dd><i v-for="p in ports.tcp" :key="p.text" class="m-remote__chip" :class="{ 'is-opt': !p.needed }">{{ p.text }}<small v-if="!p.needed"> · {{ T.optional }}</small></i></dd></div>
            <div><dt>{{ T.udp }}</dt><dd><i v-for="p in ports.udp" :key="p.text" class="m-remote__chip">{{ p.text }}</i></dd></div>
          </dl>
          <p class="m-remote__note"><MIcon name="info" />{{ T.managementNote }}</p>
        </details>
      </li>

      <!-- 4 · test a public address -->
      <li class="m-rf__step" :class="{ 'is-done': result?.kind === 'reached', 'is-bad': testView?.tone === 'error' }" :style="{ order: 4 }" data-step="test">
        <header>
          <span class="m-rf__badge"><MIcon :name="busy.test ? 'sync' : result?.kind === 'reached' ? 'check_circle' : testView?.tone === 'error' ? 'error' : 'language'" fill /></span>
          <div><h3>{{ F.steps.test }}</h3><p>{{ F.test.lead }}</p></div>
        </header>
        <div class="m-rf__form">
          <MField v-model="addr" :label="F.test.label" :placeholder="F.test.placeholder" :error="addrError" :disabled="busy.test" />
          <MButton icon="fact_check" :loading="busy.test" :disabled="!check?.ok" @click="runTest">{{ busy.test ? F.test.running : F.test.run }}</MButton>
        </div>
        <div v-if="wan || saved.length" class="m-rf__quick">
          <MButton v-if="wan && addr !== wan" variant="tonal" size="sm" icon="router" @click="addr = wan">{{ fillText(F.test.useWan, { wan }) }}</MButton>
          <MButton v-for="s in saved.filter((x) => x !== addr)" :key="s" variant="tonal" size="sm" icon="history" @click="addr = s">{{ fillText(F.test.useSaved, { value: s }) }}</MButton>
        </div>

        <div v-if="testView" class="m-rf__sub" :class="`is-${testView.tone}`" data-state="test-result" :data-kind="result.kind">
          <b><MIcon :name="testView.icon" fill />{{ testView.title }}</b>
          <p v-if="testView.how">{{ testView.how }}</p>
          <p v-if="testView.proves"><MIcon name="check" />{{ testView.proves }}</p>
          <p v-if="testView.limit"><MIcon name="info" />{{ testView.limit }}</p>
          <p v-if="testView.next"><MIcon name="arrow_forward" />{{ testView.next }}</p>
          <p v-if="testView.hairpin" class="m-rf__limit"><MIcon name="info" />{{ testView.hairpin }}</p>
          <div v-if="result.kind === 'reached' && !isSaved" class="m-rf__actions"><MButton variant="tonal" icon="save" :loading="busy.save" @click="saveUse(false)">{{ F.test.saveUse }}</MButton></div>
          <p v-else-if="result.kind === 'reached'" class="m-rf__line is-ok"><MIcon name="check_circle" />{{ F.test.saved }}</p>
        </div>
        <div v-else-if="ignored" class="m-rf__sub is-info" data-state="test-unsupported">
          <b><MIcon name="info" fill />{{ F.test.notSupported }}</b>
          <div class="m-rf__actions"><MButton variant="tonal" icon="save" :loading="busy.save" @click="saveUse(true)">{{ F.test.saveTest }}</MButton></div>
        </div>

        <div v-if="rows.length && tested" class="m-rf__table" data-state="port-results">
          <table>
            <thead><tr><th>{{ F.test.table.role }}</th><th>{{ F.test.table.port }}</th><th>{{ F.test.table.router }}</th><th>{{ F.test.table.host }}</th><th>{{ F.test.table.test }}</th></tr></thead>
            <tbody>
              <tr v-for="row in rows" :key="row.key" :data-role="row.role">
                <td>{{ PORT_ROLE[row.role]?.name || row.role }}</td>
                <td>{{ row.proto.toUpperCase() }} {{ row.port }}</td>
                <td :class="row.mapped === true ? 'is-ok' : row.mapped === false && row.needed ? 'is-bad' : 'is-quiet'">{{ row.needed ? routerWord(row) : F.test.table.web }}</td>
                <td :class="row.listening === false && !row.onDemand ? 'is-bad' : ''">{{ hostWord(row) }}</td>
                <td :class="`is-${rowTest(row).tone}`">{{ rowTest(row).word }}</td>
              </tr>
            </tbody>
          </table>
          <small>{{ F.test.tableNote }}</small>
        </div>
      </li>
    </ol>

    <MBanner v-if="note" tone="error" icon="error">{{ note }}</MBanner>

    <MDialog v-model="confirm" :title="T.confirmTitle" icon="warning" tone="warning">
      <p>{{ T.confirmText }}</p>
      <template #actions>
        <MButton variant="text" @click="confirm = false">{{ T.confirmNo }}</MButton>
        <MButton @click="confirmUpnp">{{ T.confirmYes }}</MButton>
      </template>
    </MDialog>
  </div>
</template>
