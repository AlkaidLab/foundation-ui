<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import MGroup from './MGroup.vue'
import MItem from './MItem.vue'
import MSwitchItem from './MSwitchItem.vue'
import MSection from './MSection.vue'
import MSeg from './MSeg.vue'
import MButton from './MButton.vue'
import MDialog from './MDialog.vue'
import MSheet from './MSheet.vue'
import MBanner from './MBanner.vue'
import MField from './MField.vue'
import MLoading from './MLoading.vue'
import DevHostSim from './devmode/DevHostSim.vue'
import DevSimConfirm from './devmode/DevSimConfirm.vue'
import DevSimBanner from './devmode/DevSimBanner.vue'
import { createChanger } from '../developer/optimistic.js'
import { ANIM_SCALES, LOG_LEVELS } from '../developer/flags.js'
import { developerTexts, fill } from '../developer/texts.js'
import { devmodeTexts } from '../devmode/texts.js'
import { developerOverlays } from '../developer/index.js'
import { ENDPOINTS, inspect, readablePath } from '../developer/apiInspector.js'
import { environmentRows, environmentText } from '../developer/envInfo.js'
import { KINDS, parseLog } from '../developer/slowLog.js'
import { useDeveloperMode } from './useDeveloperMode.js'
import { captionTexts } from '../nav/captionTexts.js'

// 开发者选项: a pushed page, reachable once developer mode is on (seven taps on the version). Groups of tools; every row says what it is and its state now; what changes data asks first.
// The product gives `tools` (only what exists in its environment: the panel gives all of it, the Web UI the part that works in a browser); a group with nothing in it is not drawn.
const props = defineProps({
  locale: { type: String, default: 'zh' },
  tools: { type: Object, default: () => ({}) },
  /** the proxy address the API inspector reads from */
  apiBase: { type: String, default: '' },
  /** groups that are pages of their own in the Panel's developer rail and are left out here: 'render' (功能开关), 'api' (API 检查器), 'env' (构建与组件), 'host' simulation (测试工具) */
  omit: { type: Array, default: () => [] },
})
const emit = defineEmits(['disabled', 'notify'])
const T = computed(() => developerTexts(props.locale))
const devT = computed(() => devmodeTexts(props.locale))
const dev = useDeveloperMode()
const overlays = developerOverlays()
const flags = reactive({ ...overlays.flags })
const setFlag = (patch) => { Object.assign(flags, overlays.set(patch)) }
const note = (message) => emit('notify', message)

// ---- state read from the product ----
// Every value is read on its own and shown when it arrives: a slow read (the environment, the log) never holds back the switches. A value that is not read yet is `null`, and its row shows the indicator, not a state it does not have.
const s = reactive({ env: null, debug: null, level: null, win: null, paletteN: null, telemetry: null, channel: null, version: '', slowCount: 0, reach: null, update: '' })
const tools = computed(() => props.tools || {})
const safe = async (fn, fallback = null) => { try { return await fn() } catch { return fallback } }
// a value whose read has not come back yet (a read that failed has come back: its row shows what it has, it does not wait for ever)
const unread = reactive({ debug: true, level: true, win: true, telemetry: true, channel: true })
// the changes in flight (a key per control) and the way a failed one is told
const pending = reactive({})
const createdChange = createChanger({ pending, fail: (error) => note(fill(T.value.failed, { message: error?.message || '' })) })
// a control the person has already changed keeps what they chose: a read that lands later does not put the old value back
const touched = new Set()
const change = (key, spec, reads = key) => { touched.add(reads); return createdChange(key, spec) }
onMounted(() => {
  const t = tools.value
  const read = (key, fn, set) => { if (!fn) { unread[key] = false; return } safe(fn).then((value) => { unread[key] = false; if (!touched.has(key)) set(value) }) }
  read('debug', t.debugOutput?.get, (debug) => { s.debug = debug })
  read('level', t.logLevel?.get, (level) => { s.level = level })
  read('win', t.window?.get, (win) => { s.win = win })
  read('palette', t.data?.paletteCount, (paletteN) => { s.paletteN = paletteN })
  read('telemetry', t.telemetry?.state, (telemetry) => { s.telemetry = telemetry })
  read('channel', t.update?.channel?.get, (channel) => { s.channel = channel })
  // the environment asks the host and the system for the components and takes seconds: only a page that draws it reads it
  if (!props.omit.includes('env')) read('env', t.environment, (env) => { s.env = env; s.version = env?.version || '' })
  if (t.logText) safe(t.logText, '').then((log) => { s.slowCount = log ? parseLog(log, { limit: 1000 }).length : 0 })
})

const onOff = (v) => (v ? T.value.on : T.value.off)
const has = (...path) => path.reduce((o, k) => (o ? o[k] : undefined), tools.value) !== undefined

// ---- confirmation of what changes data ----
const confirm = reactive({ open: false, title: '', text: '', label: '', run: null, danger: false })
const ask = (text, run, { label = T.value.confirmTitle, danger = false } = {}) => { Object.assign(confirm, { open: true, title: label, text, run, danger }) }
const confirmed = async () => { const run = confirm.run; confirm.open = false; if (run) await run() }

// ---- the sheets ----
const sheet = ref('')
const logRows = ref([])
const logFilter = ref('')
const logText = ref('')
async function openLog() { sheet.value = 'log'; logText.value = await safe(tools.value.logText, ''); logRows.value = parseLog(logText.value, { limit: 400 }); s.slowCount = parseLog(logText.value, { limit: 1000 }).length }
const shownLog = computed(() => (logFilter.value ? logRows.value.filter((r) => r.kind === logFilter.value) : logRows.value))
const logOptions = computed(() => [{ value: '', label: T.value.filterAll }, ...KINDS.map((k) => ({ value: k, label: T.value.kinds[k] }))])
const envRows = computed(() => environmentRows(s.env || {}))
async function copyText(text) { try { await navigator.clipboard.writeText(text); note(T.value.copied) } catch { /* the browser refused */ } }

const apiPath = ref('/api/config')
const apiResult = ref(null)
const apiBusy = ref(false)
async function readApi() { apiBusy.value = true; apiResult.value = await inspect({ base: props.apiBase, path: apiPath.value }); apiBusy.value = false }
const apiValid = computed(() => !!readablePath(apiPath.value))
const rawOutput = ref('')
async function reachAgain() { sheet.value = 'raw'; rawOutput.value = T.value.pending; const r = await safe(tools.value.host.reach, null); s.reach = r; rawOutput.value = r === null ? T.value.failed.replace('{message}', '') : (typeof r === 'string' ? r : JSON.stringify(r, null, 2)) }
const preview = ref('')
async function previewReport() { sheet.value = 'telemetry'; preview.value = T.value.pending; const p = await safe(tools.value.telemetry.preview, null); preview.value = p === null ? '' : (typeof p === 'string' ? p : JSON.stringify(p, null, 2)) }

// ---- the rows ----
const animLabel = (v) => fill(T.value.animScaleState, { s: v, r: v === 1 ? T.value.animNormal : v > 1 ? T.value.animSlower : T.value.animFaster })
const animOptions = computed(() => ANIM_SCALES.map((v) => ({ value: v, label: `${v}×` })))
const levelOptions = LOG_LEVELS.map((v) => ({ value: v, label: v }))
const coverOptions = computed(() => Object.entries(T.value.coverModes).map(([value, label]) => ({ value, label })))
const channelOptions = computed(() => [{ value: 'stable', label: T.value.channelStable }, { value: 'beta', label: T.value.channelBeta }])
const dpiOptions = [125, 150, 200, 0]
const simulationAsked = ref('')
const simulateKind = (kind) => tools.value.host.simulate(kind)
const updateResult = ref('')
// A change is shown on the click; the product answers after, and a failure puts the control back (createChanger).
const setDebug = (v) => { const was = s.debug; return change('debug', { paint: () => { s.debug = v }, restore: () => { s.debug = was }, commit: () => tools.value.debugOutput.set(v), reconcile: async () => { s.debug = await tools.value.debugOutput.get() } }) }
const setLevel = (v) => { const was = s.level; return change('level', { paint: () => { s.level = v }, restore: () => { s.level = was }, commit: () => tools.value.logLevel.set(v), reconcile: async () => { s.level = await tools.value.logLevel.get() } }) }
const setCover = (v) => { const was = s.win; return change('cover', { paint: () => { s.win = { ...s.win, cover: v } }, restore: () => { s.win = was }, commit: () => tools.value.window.setCover(v) }, 'win') }
const setCloak = (v) => { const was = s.win; return change('cloak', { paint: () => { s.win = { ...s.win, coldCloak: v } }, restore: () => { s.win = was }, commit: () => tools.value.window.setCloak(v) }, 'win') }
function simulateDpi(pct) { ask(pct ? fill(T.value.simulateConfirm, { dpi: pct }) : T.value.simulateDpiBack, async () => { await safe(() => tools.value.window.simulateDpi(pct)); s.win = { ...s.win, simulated: pct } }) }
const setChannel = (v) => { const was = s.channel; return change('channel', { paint: () => { s.channel = v }, restore: () => { s.channel = was }, commit: () => tools.value.update.channel.set(v), reconcile: async () => { s.channel = await tools.value.update.channel.get() } }) }
async function checkUpdate() { updateResult.value = T.value.pending; const r = await safe(tools.value.update.check, null); updateResult.value = r ? (r.latest ? T.value.latest : fill(T.value.updateAvailable, { version: r.version })) : fill(T.value.failed, { message: '' }) }
const testing = ref(false)
async function sendTest() { if (testing.value || unread.telemetry || !consentOn.value) return; testing.value = true; const r = await safe(tools.value.telemetry.test, null); testing.value = false; note(r === null ? fill(T.value.failed, { message: '' }) : T.value.telemetrySent) }
const consentOn = computed(() => !!s.telemetry?.consent)
const reload = () => ask(T.value.reload, () => safe(tools.value.webview.reload))
const resetRows = computed(() => [
  tools.value.data?.clearPalette && { id: 'palette', title: T.value.clearPalette, value: s.paletteN === null ? '' : fill(T.value.clearPaletteState, { n: s.paletteN }), text: T.value.clearPaletteConfirm, run: async () => { await tools.value.data.clearPalette(); s.paletteN = 0 } },
  tools.value.data?.resetOnboarding && { id: 'onboarding', title: T.value.resetOnboarding, text: T.value.resetOnboardingConfirm, run: tools.value.data.resetOnboarding },
  tools.value.data?.resetOverview && { id: 'overview', title: T.value.resetOverview, text: T.value.resetOverviewConfirm, run: tools.value.data.resetOverview },
  tools.value.data?.resetAll && { id: 'all', title: T.value.resetAll, text: T.value.resetAllConfirm, danger: true, run: tools.value.data.resetAll },
].filter(Boolean))
const turnOff = () => { dev.disable(); emit('disabled') }
</script>

<template>
  <div class="m-devpage">
 <MSection v-if="has('debugOutput') || has('logLevel') || has('logText') || has('environment')" :title="T.groups.debug">
      <MGroup>
        <MSwitchItem v-if="has('debugOutput')" :model-value="!!s.debug" :pending="!!pending.debug || unread.debug" icon="bug_report" :title="T.debugOutput" :text="unread.debug ? '' : onOff(s.debug)" data-dev="debug-output" @update:model-value="setDebug" />
        <MItem v-if="has('logLevel')" icon="tune" :title="T.logLevel" :value="s.level || ''" stack data-dev="log-level"><template #control><MSeg :options="levelOptions" :model-value="s.level" :pending="!!pending.level || unread.level" size="sm" @update:model-value="setLevel" /></template></MItem>
        <MItem v-if="has('logText')" action icon="speed" :title="T.slowLog" :value="fill(T.slowLogCount, { n: s.slowCount })" data-dev="slow-log" @click="openLog" />
        <MItem v-if="has('environment') && !omit.includes('env')" action icon="info" :title="T.environment" :value="s.version" data-dev="environment" @click="sheet = 'env'" />
      </MGroup>
    </MSection>


    <MSection v-if="!omit.includes('render')" :title="T.groups.render">
      <MGroup>
        <MSwitchItem :model-value="flags.hud" icon="monitor_heart" :title="T.hud" :text="onOff(flags.hud)" data-dev="hud" @update:model-value="setFlag({ hud: $event })" />
        <MSwitchItem :model-value="flags.longTasks" icon="timer" :title="T.longTasks" :text="onOff(flags.longTasks)" data-dev="long-tasks" @update:model-value="setFlag({ longTasks: $event })" />
        <MSwitchItem :model-value="flags.outlines" icon="grid_view" :title="T.outlines" :text="onOff(flags.outlines)" data-dev="outlines" @update:model-value="setFlag({ outlines: $event })" />
        <MSwitchItem :model-value="flags.flashes" icon="bolt" :title="T.flashes" :text="flags.flashes ? T.flashesState : T.off" data-dev="flashes" @update:model-value="setFlag({ flashes: $event })" />
        <MSwitchItem :model-value="flags.mutations" icon="sync" :title="T.mutations" :text="onOff(flags.mutations)" data-dev="mutations" @update:model-value="setFlag({ mutations: $event })" />
        <MItem icon="slow_motion_video" :title="T.animScale" :value="animLabel(flags.animScale)" stack data-dev="anim-scale"><template #control><MSeg :options="animOptions" :model-value="flags.animScale" size="sm" @update:model-value="setFlag({ animScale: $event })" /></template></MItem>
      </MGroup>
    </MSection>

    <MSection v-if="has('window')" :title="T.groups.window">
      <MGroup>
        <MItem icon="aspect_ratio" :title="T.cover" :value="T.coverModes[s.win?.cover] || ''" :text="T.nextChange" stack data-dev="cover"><template #control><MSeg :options="coverOptions" :model-value="s.win?.cover" :pending="!!pending.cover || unread.win" size="sm" @update:model-value="setCover" /></template></MItem>
        <MSwitchItem :model-value="!!s.win?.coldCloak" :pending="!!pending.cloak || unread.win" icon="visibility_off" :title="T.coldCloak" :text="unread.win ? T.needsRestart : `${onOff(s.win?.coldCloak)} · ${T.needsRestart}`" data-dev="cold-cloak" @update:model-value="setCloak" />
        <MItem icon="display_settings" :title="T.simulateDpi" :value="fill(T.simulateDpiState, { dpi: s.win?.simulated || s.win?.dpi || 100 })" stack data-dev="simulate-dpi">
          <template #control><div class="m-devpage__row"><MButton v-for="p in dpiOptions" :key="p" size="sm" variant="tonal" @click="simulateDpi(p)">{{ p ? `${p}%` : T.simulateDpiBack }}</MButton></div></template>
        </MItem>
      </MGroup>
    </MSection>

    <MSection v-if="has('webview')" :title="T.groups.webview">
      <MGroup>
        <MItem v-if="has('webview', 'devtools')" action icon="code" :title="T.devtoolsPanel" data-dev="devtools-panel" @click="tools.webview.devtools('panel')" />
        <MItem v-if="has('webview', 'devtools')" action icon="language" :title="T.devtoolsWeb" data-dev="devtools-web" @click="tools.webview.devtools('web')" />
        <MItem v-if="has('webview', 'reload')" action icon="refresh" :title="T.reload" data-dev="reload" @click="reload" />
        <MItem v-if="has('webview', 'clearCache')" action icon="cleaning_services" :title="T.clearCache" data-dev="clear-cache" @click="ask(T.clearCacheConfirm, tools.webview.clearCache)" />
      </MGroup>
    </MSection>

    <MSection v-if="resetRows.length" :title="T.groups.data">
      <MGroup>
        <MItem v-for="r in resetRows" :key="r.id" action :icon="r.danger ? 'restart_alt' : 'delete'" :title="r.title" :value="r.value || ''" :data-dev="`reset-${r.id}`" @click="ask(r.text, r.run, { label: r.title, danger: r.danger })" />
      </MGroup>
    </MSection>

    <MSection v-if="has('host') && (!omit.includes('api') || !omit.includes('host'))" :title="T.groups.host">
      <MGroup>
        <MItem v-if="!omit.includes('api')" action icon="terminal" :title="T.api" :value="fill(T.apiState, { path: apiPath })" data-dev="api" @click="sheet = 'api'" />
        <MItem v-if="has('host', 'reach') && !omit.includes('host')" action icon="network_check" :title="T.reach" :value="s.reach ? fill(T.reachState, { state: s.reach.state || (s.reach.ok === false ? 'no' : 'ok') }) : ''" data-dev="reach" @click="reachAgain" />
        <DevHostSim v-if="has('host', 'simulate') && !omit.includes('host')" :locale="locale" @ask="simulationAsked = $event" />
      </MGroup>
    </MSection>

    <DevSimBanner v-if="has('host', 'simulate') && !omit.includes('host')" :locale="locale" />
    <DevSimConfirm v-if="has('host', 'simulate') && !omit.includes('host')" :locale="locale" :kind="simulationAsked" :simulate="simulateKind" @close="simulationAsked = ''" @notify="note" />

    <MSection v-if="has('telemetry') && !omit.includes('telemetry')" :title="T.groups.telemetry">
      <MGroup>
        <MItem action icon="visibility" :title="T.telemetryPreview" :value="T.telemetryPreviewState" data-dev="telemetry-preview" @click="previewReport" />
        <MItem v-if="has('telemetry', 'test')" action icon="send" :title="T.telemetryTest" :value="testing ? devT.testSending : !unread.telemetry && !consentOn ? T.telemetryConsentOff : ''" :disabled="!unread.telemetry && !consentOn" :aria-busy="testing || unread.telemetry || undefined" data-dev="telemetry-test" @click="sendTest"><template #trail><MLoading v-if="testing || unread.telemetry" size="24px" /></template></MItem>
        <MItem icon="fingerprint" :title="s.telemetry?.installId ? T.telemetryId : T.telemetryQueueTitle" :value="s.telemetry?.installId ? `${s.telemetry.installId} · ${fill(T.telemetryQueue, { n: s.telemetry?.queue ?? 0 })}` : fill(T.telemetryQueue, { n: s.telemetry?.queue ?? 0 })" data-dev="telemetry-id" />
      </MGroup>
    </MSection>

    <MSection v-if="has('update')" :title="T.groups.update">
      <MGroup>
        <MItem v-if="has('update', 'channel')" icon="update" :title="T.channel" :value="s.channel === 'beta' ? T.channelBeta : T.channelStable" stack data-dev="channel"><template #control><MSeg :options="channelOptions" :model-value="s.channel || 'stable'" :pending="!!pending.channel || unread.channel" size="sm" @update:model-value="setChannel" /></template></MItem>
        <MItem v-if="has('update', 'check')" action icon="system_update_alt" :title="T.checkUpdate" :value="updateResult || fill(T.checkUpdateState, { version: s.version })" data-dev="check-update" @click="checkUpdate" />
      </MGroup>
    </MSection>

    <div class="m-devpage__row m-devpage__off"><MButton variant="outlined" icon="power_settings_new" @click="turnOff">{{ T.turnOff }}</MButton></div>

    <MSheet :model-value="sheet === 'log'" :title="T.slowLog" side="end" :close-label="T.close" @update:model-value="(v) => { if (!v) sheet = '' }">
      <div class="m-devpage__tools"><MSeg :options="logOptions" :model-value="logFilter" size="sm" @update:model-value="logFilter = $event" /><MButton size="sm" variant="text" icon="refresh" @click="openLog">{{ T.refresh }}</MButton><MButton size="sm" variant="text" icon="content_copy" @click="copyText(logText)">{{ T.copy }}</MButton></div>
      <p v-if="!shownLog.length" class="m-devpage__empty">{{ T.noRows }}</p>
      <ul class="m-devpage__log" data-dev="log-rows"><li v-for="(r, i) in shownLog" :key="i" :class="`is-${r.kind}`"><time>{{ r.at.slice(11, 23) }}</time><b>{{ T.kinds[r.kind] }}</b><span>{{ r.label }}</span><em v-if="r.ms">{{ r.ms }} ms</em><small>{{ r.text }}</small></li></ul>
    </MSheet>

    <MSheet :model-value="sheet === 'env'" :title="T.envTitle" side="end" :close-label="T.close" @update:model-value="(v) => { if (!v) sheet = '' }">
      <div class="m-devpage__tools"><MButton size="sm" variant="tonal" icon="content_copy" @click="copyText(environmentText(s.env))">{{ T.environmentCopy }}</MButton><MButton v-if="tools.exportText" size="sm" variant="text" icon="download" @click="tools.exportText('environment.txt', environmentText(s.env))">{{ T.environmentExport }}</MButton></div>
      <dl class="m-devpage__env" data-dev="env-rows"><template v-for="[k, v] in envRows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></template></dl>
    </MSheet>

    <MSheet :model-value="sheet === 'api'" :title="T.api" side="end" :close-label="T.close" @update:model-value="(v) => { if (!v) sheet = '' }">
      <div class="m-devpage__tools"><MSeg :options="ENDPOINTS.map((e) => ({ value: e.path, label: e.note }))" :model-value="apiPath" size="sm" @update:model-value="apiPath = $event; readApi()" /></div>
      <div class="m-devpage__tools"><MField v-model="apiPath" :label="T.apiPath" /><MButton :disabled="!apiValid || apiBusy" icon="download" @click="readApi">{{ T.read }}</MButton></div>
      <MBanner tone="info" icon="visibility_off">{{ T.apiHidden }}</MBanner>
      <div v-if="apiResult" class="m-devpage__result" data-dev="api-result">
        <p class="m-devpage__meta"><b :class="apiResult.ok ? 'is-ok' : 'is-bad'">{{ apiResult.status || apiResult.error }}</b><span>{{ apiResult.ms }} ms</span><span v-if="apiResult.bytes !== undefined">{{ apiResult.bytes }} B</span><MButton size="sm" variant="text" icon="content_copy" @click="copyText(apiResult.body || '')">{{ T.copy }}</MButton></p>
        <pre v-if="apiResult.body !== undefined">{{ apiResult.body }}</pre>
      </div>
    </MSheet>

    <MSheet :model-value="sheet === 'raw'" :title="T.apiRaw" side="end" :close-label="T.close" @update:model-value="(v) => { if (!v) sheet = '' }"><pre class="m-devpage__pre" data-dev="raw-output">{{ rawOutput }}</pre></MSheet>
    <MSheet :model-value="sheet === 'telemetry'" :title="T.telemetryPreview" side="end" :close-label="T.close" @update:model-value="(v) => { if (!v) sheet = '' }"><div class="m-devpage__tools"><MButton size="sm" variant="text" icon="content_copy" @click="copyText(preview)">{{ T.copy }}</MButton></div><pre class="m-devpage__pre" data-dev="telemetry-payload">{{ preview }}</pre></MSheet>

    <MDialog v-model="confirm.open" :title="confirm.title" :icon="confirm.danger ? 'warning' : 'help'" :tone="confirm.danger ? 'warning' : 'info'">
      <p>{{ confirm.text }}</p>
      <template #actions><MButton variant="text" @click="confirm.open = false">{{ T.cancel }}</MButton><MButton :variant="confirm.danger ? 'filled' : 'tonal'" @click="confirmed">{{ T.yes }}</MButton></template>
    </MDialog>
  </div>
</template>

<style>
.m-devpage { display: flex; flex-direction: column; gap: 16px; padding-bottom: 24px; }
.m-devpage__row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.m-devpage__off { margin-top: 8px; }
.m-devpage__tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.m-devpage__empty { color: var(--md-sys-color-on-surface-variant); margin: 12px 0; }
.m-devpage__log { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; font: 12px/1.45 ui-monospace, Consolas, monospace; }
.m-devpage__log li { display: grid; grid-template-columns: 92px 56px minmax(0, 1fr) auto; gap: 4px 8px; align-items: baseline; padding: 4px 8px; border-radius: 8px; background: var(--md-sys-color-surface-container); }
.m-devpage__log li small { grid-column: 2 / -1; color: var(--md-sys-color-on-surface-variant); overflow-wrap: anywhere; }
.m-devpage__log li.is-stall, .m-devpage__log li.is-frame { background: color-mix(in srgb, var(--md-sys-color-error-container) 55%, var(--md-sys-color-surface-container)); }
.m-devpage__log em { font-style: normal; font-variant-numeric: tabular-nums; }
.m-devpage__env { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 16px; margin: 0; }
.m-devpage__env dt { color: var(--md-sys-color-on-surface-variant); }
.m-devpage__env dd { margin: 0; overflow-wrap: anywhere; }
.m-devpage__pre, .m-devpage__result pre { margin: 0; padding: 12px; border-radius: 12px; background: var(--md-sys-color-surface-container); color: var(--md-sys-color-on-surface); font: 12px/1.5 ui-monospace, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 60vh; overflow: auto; }
.m-devpage__meta { display: flex; gap: 12px; align-items: center; margin: 12px 0 8px; font-variant-numeric: tabular-nums; }
.m-devpage__meta .is-ok { color: var(--md-sys-color-primary-text, var(--md-sys-color-primary)); }
.m-devpage__meta .is-bad { color: var(--md-sys-color-error); }
</style>
