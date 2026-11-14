<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MItem from './MItem.vue'
import MGroup from './MGroup.vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MBanner from './MBanner.vue'
import MFieldItem from './MFieldItem.vue'
import { BASE_PORT_MAX, BASE_PORT_MIN, DEFAULT_BASE_PORT, derivedPorts, formatHostAddress, portRunText, validateBasePort, webPort } from './hostAddress.js'
import { fillText } from './guideTexts.js'
import { STATUS_LOOK } from '../doctor/model.js'

// 「高级：端口」 of the address step: closed by default, an ordinary person never needs it. It shows the base port and every port the host counts from it (what to forward in a router or a
// firewall), and lets an advanced user change the base port. The host keeps it in `port`; a change is saved at once and applies after a restart, which is offered here.
//   T: the texts of the address step (T.address.port); port: the base port as saved; active: the one the host listens on now (0 when unknown); address: the recommended address (bare)
//   callbacks: savePort(port) -> { ok, error? }, restartHost() -> { ok, error? }, checkPorts()? -> { ok, items, worst, unsupported? } (the host's 体检 of the network group, guidePortCheck.js), openDiagnostics()?, reload() (reads the host's ports again: the restart is over when `active` is the saved port)
const props = defineProps({
  T: { type: Object, required: true },
  port: { type: Number, default: DEFAULT_BASE_PORT },
  active: { type: Number, default: 0 },
  address: { type: String, default: '' },
  callbacks: { type: Object, default: () => ({}) },
  /** the row starts open (a search result lands on it) */
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['saved'])
const P = computed(() => props.T.address.port)
const more = ref(props.open)
const draft = ref(String(props.port || DEFAULT_BASE_PORT))
const own = ref({ busy: false, restarting: false, failure: '', saved: 0 })
watch(() => props.port, (value) => { if (value) draft.value = String(value) })

const shown = computed(() => own.value.saved || props.port || DEFAULT_BASE_PORT)
const running = computed(() => props.active || shown.value)
const check = computed(() => validateBasePort(draft.value))
const error = computed(() => {
  if (check.value.ok) return check.value.port === shown.value && !own.value.saved ? P.value.same : ''
  return check.value.error === 'range' ? fillText(P.value.range, { min: BASE_PORT_MIN, max: BASE_PORT_MAX }) : P.value.format
})
const canSave = computed(() => check.value.ok && check.value.port !== shown.value && !own.value.busy)
const pending = computed(() => shown.value !== running.value)

// the port check is the host's own 体检 (network group), the same answer as on the diagnostics page; it is run on request, never by itself
const scan = ref({ busy: false, done: false, items: [], worst: 'skip', note: '' })
async function runCheck() {
  if (scan.value.busy) return
  scan.value = { ...scan.value, busy: true, note: '' }
  try {
    const r = (await props.callbacks.checkPorts?.()) || { ok: false }
    scan.value = r.ok ? { busy: false, done: true, items: r.items || [], worst: r.worst || 'skip', note: r.items?.length ? '' : P.value.checkNone } : { busy: false, done: true, items: [], worst: 'skip', note: r.unsupported ? P.value.checkUnsupported : P.value.checkFailed }
  } catch { scan.value = { busy: false, done: true, items: [], worst: 'skip', note: P.value.checkFailed } }
}

// the ports of the base port as the host listens on now, so the table says what is open today; after a change the new ones are in the restart note
const rows = computed(() => derivedPorts(running.value).map((p) => ({ ...p, name: P.value.roles[p.role] || p.role })))
const tcp = computed(() => rows.value.filter((r) => r.proto === 'tcp').sort((a, b) => a.port - b.port))
const udpRun = computed(() => portRunText(rows.value.filter((r) => r.proto === 'udp').map((r) => r.port)))
const udpNames = computed(() => rows.value.filter((r) => r.proto === 'udp').map((r) => r.name).join(' · '))

async function save() {
  if (!canSave.value) return
  own.value = { ...own.value, busy: true, failure: '' }
  try {
    const r = (await props.callbacks.savePort?.(check.value.port)) || { ok: false }
    if (r.ok) { own.value = { ...own.value, saved: check.value.port }; emit('saved', check.value.port) } else own.value = { ...own.value, failure: r.error || P.value.failed }
  } catch (e) { own.value = { ...own.value, failure: e?.message || P.value.failed } } finally { own.value = { ...own.value, busy: false } }
}
let alive = true
onBeforeUnmount(() => { alive = false })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function restart() {
  own.value = { ...own.value, restarting: true, failure: '' }
  try {
    const r = (await props.callbacks.restartHost?.()) || { ok: false }
    if (!r.ok) { own.value = { ...own.value, failure: r.error || P.value.failed }; return }
    // the host is away for a few seconds: ask for its ports until it runs the saved one (the WebUI panel itself moves to the new port, so a panel opened through the old one stops hearing)
    for (let i = 0; i < 30 && alive && props.active !== shown.value; i++) { await sleep(2000); try { await props.callbacks.reload?.() } catch { /* the host is still away */ } }
  } catch (e) { own.value = { ...own.value, failure: e?.message || '' } } finally { own.value = { ...own.value, restarting: false } }
}
</script>

<template>
  <MGroup class="m-guide__port" data-cfg="port">
    <MItem action icon="tune" :title="P.title" :aria-expanded="more" @click="more = !more">
      <template #trail><span class="m-webaccess__more">{{ more ? P.hide : P.show }}</span></template>
    </MItem>
    <template v-if="more">
      <div class="m-guide__ports">
        <p class="m-guide__text">{{ P.lead }}</p>
        <dl class="m-guide__portlist">
          <div class="is-base"><dt>{{ P.base }}</dt><dd class="m-dnum">{{ running }}</dd></div>
          <div v-for="r in tcp" :key="r.role"><dt>{{ r.name }}<small>{{ P.tcp }}<template v-if="!r.needed"> · {{ P.optional }}</template></small></dt><dd class="m-dnum">{{ r.port }}</dd></div>
          <div><dt>{{ udpNames }}<small>{{ P.udp }}</small></dt><dd class="m-dnum">{{ udpRun }}</dd></div>
        </dl>
      </div>
      <div v-if="callbacks.checkPorts" class="m-guide__portcheck">
        <div class="m-guide__portact">
          <MButton variant="tonal" size="sm" icon="troubleshoot" :loading="scan.busy" data-guide-port-check @click="runCheck">{{ scan.busy ? P.checking : scan.done ? P.checkAgain : P.check }}</MButton>
          <MButton v-if="scan.done && scan.worst !== 'pass' && callbacks.openDiagnostics" variant="text" size="sm" icon="health_and_safety" @click="callbacks.openDiagnostics()">{{ P.checkOpen }}</MButton>
        </div>
        <ul v-if="scan.items.length" class="m-guide__portresult" role="status">
          <li v-for="i in scan.items" :key="i.id" :class="`is-${i.status}`"><MIcon :name="(STATUS_LOOK[i.status] || STATUS_LOOK.skip).icon" fill /><span><b>{{ i.title }}</b><small v-if="i.detail">{{ i.detail }}</small></span></li>
        </ul>
        <p v-else-if="scan.note" class="m-guide__note" role="status"><MIcon name="info" />{{ scan.note }}</p>
      </div>
      <MFieldItem v-model="draft" type="number" :label="P.field" :min="BASE_PORT_MIN" :max="BASE_PORT_MAX" :error="error" autocomplete="off" data-cfg="port" />
      <div class="m-guide__portact">
        <MButton variant="tonal" size="sm" icon="check" :disabled="!canSave" :loading="own.busy" @click="save">{{ P.save }}</MButton>
        <span v-if="own.saved && !pending" class="m-guide__portok"><MIcon name="check_circle" />{{ P.saved }}</span>
      </div>
      <MBanner v-if="pending" tone="warn" icon="restart_alt" role="status">
        <b>{{ fillText(P.pendingTitle, { port: shown }) }}</b> {{ fillText(P.pendingText, { active: running, address: formatHostAddress(address || '192.168.1.5', shown), web: webPort(shown) }) }}
        <template #actions><MButton variant="text" size="sm" icon="restart_alt" :loading="own.restarting" @click="restart">{{ own.restarting ? P.restarting : P.restart }}</MButton></template>
      </MBanner>
      <p class="m-guide__note"><MIcon name="info" />{{ P.taken }}</p>
      <MBanner v-if="own.failure" tone="error" icon="error">{{ own.failure }}</MBanner>
    </template>
  </MGroup>
</template>
