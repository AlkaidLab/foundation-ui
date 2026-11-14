<script setup>
import { computed, ref } from 'vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MBanner from './MBanner.vue'
import MReachVerdict from './MReachVerdict.vue'
import MPublicEndpoints from './MPublicEndpoints.vue'
import { firewallCommand, reachView } from '../settings/reachability.js'
import { failureWords, reachTexts } from '../settings/reachTexts.js'
import { failureOf } from '../settings/remoteFlow.js'

// The remote access status card: for the internet path and the mesh path the verdict of the host's own check (a status with icon and colour), the evidence behind it, each
// reason as a sentence with the action that fixes it, the address a client should enter (with a copy button) and the port table, collapsed. Used at the top of 主机设置 › 网络,
// in the first-run step and anywhere else the check is shown. `report` is the normalized report (settings/reachability.js) or null.
//   status: 'idle' | 'loading' | 'ready' | 'unavailable' (the host has no such API) | 'error'
//   emits:  recheck, fix(action, row) -- upnp, forward, restart, mesh and origin are the product's to do; firewall and outside open here (a command to copy, a sentence)
const props = defineProps({
  report: { type: Object, default: null },
  status: { type: String, default: 'idle' },
  /** the HTTP status of the answer that was no report (useReachability's `view.http`) and why a request failed (`view.cause`): they decide what the failure says */
  http: { type: Number, default: 0 },
  cause: { type: String, default: '' },
  locale: { type: String, default: 'en' },
  platform: { type: String, default: 'windows' },
  copy: { type: Function, default: null },
  /** hide the title row (the host page already has its own heading) */
  bare: { type: Boolean, default: false },
  /** show one path only: 'public' or 'mesh' (the tutorial shows the check of the choice that is open) */
  only: { type: String, default: '' },
  /** the public endpoints in the configuration (`external_endpoints`, or the legacy `external_ip`) as one string; the editor is shown on the internet path when `addressEditable` */
  endpoints: { type: String, default: '' },
  addressEditable: { type: Boolean, default: false },
  addressBusy: { type: Boolean, default: false },
  /** the accessible name of the card where a page lists it as a setting */
  label: { type: String, default: '' },
})
const emit = defineEmits(['recheck', 'fix', 'save-address'])
const addressField = ref(null)
const T = computed(() => reachTexts(props.locale))
const fail = computed(() => failureWords(failureOf({ status: props.status, http: props.http, cause: props.cause }), props.locale))
const view = computed(() => reachView(props.report, props.locale))
const open = ref('')
const copied = ref('')
let timer = 0
async function copyText(text) {
  try {
    if (props.copy) await props.copy(text)
    else await globalThis.navigator?.clipboard?.writeText(text)
    copied.value = text; clearTimeout(timer); timer = setTimeout(() => { copied.value = '' }, 1600)
  } catch { /* the text stays visible */ }
}
function fix(path, row) {
  const key = `${path.id}:${row.code}`
  if (row.action === 'address') { addressField.value?.focus(); return }
  if (row.action === 'use-wan') { const wan = props.report?.public?.router; if (wan?.wanClass === 'public' && wan.wanIp) addressField.value?.fill(wan.wanIp); addressField.value?.focus(); return }
  if (row.action === 'firewall' || row.action === 'outside') { open.value = open.value === key ? '' : key; return }
  emit('fix', row.action, row)
}
const command = computed(() => firewallCommand(props.report, props.platform === 'windows' ? 'windows' : 'linux'))
const base = computed(() => (props.report?.ports || []).find((p) => p.role === 'http')?.port || '')
const loading = computed(() => props.status === 'loading')
</script>

<template>
  <section class="m-reach" :aria-busy="loading" :aria-label="label || undefined">
    <header v-if="!bare" class="m-reach__head">
      <span class="m-ico m-reach__headico" data-tone="0"><MIcon name="router" fill /></span>
      <div class="m-reach__headtext">
        <h3>{{ T.title }}</h3>
        <small>{{ view?.checkedAt ? T.checkedAt.replace('{time}', view.checkedAt) : T.notChecked }}</small>
      </div>
      <MButton variant="tonal" size="sm" icon="refresh" :loading="loading" @click="emit('recheck')">{{ loading ? T.checking : T.recheck }}</MButton>
    </header>
    <div v-else class="m-reach__bar">
      <small>{{ view?.checkedAt ? T.checkedAt.replace('{time}', view.checkedAt) : T.notChecked }}</small>
      <MButton variant="tonal" size="sm" icon="refresh" :loading="loading" @click="emit('recheck')">{{ loading ? T.checking : T.recheck }}</MButton>
    </div>

    <MBanner v-if="status === 'unavailable' || status === 'error'" class="m-reach__fail" :tone="status === 'error' ? 'error' : 'info'" :icon="status === 'error' ? 'error' : 'info'">
      <b>{{ fail.title }}</b> {{ fail.why }} <span v-if="fail.next">{{ fail.next }}</span>
      <template v-if="status === 'error'" #actions><MButton variant="text" size="sm" icon="refresh" @click="emit('recheck')">{{ T.recheck }}</MButton></template>
    </MBanner>

    <template v-if="view">
      <article v-for="path in view.paths.filter((p) => !only || p.id === only)" :key="path.id" class="m-reach__path" :class="`is-${path.tone}`" :data-path="path.id" :data-verdict="path.verdict">
        <MReachVerdict :path="path" :locale="locale" :copy="copy" />

        <ul v-if="path.adapters?.length" class="m-reach__adapters">
          <li v-for="(a, i) in path.adapters" :key="i"><MIcon :name="a.up ? 'check_circle' : 'info'" /><span>{{ a.name }}</span><small>{{ a.up ? T.up : T.down }}<template v-if="a.address"> · {{ a.address }}</template></small></li>
        </ul>

        <MPublicEndpoints v-if="path.id === 'public' && addressEditable" ref="addressField" :saved="endpoints" :results="path.endpoints" :locale="locale" :busy="addressBusy" :checking="loading" @save="(v) => emit('save-address', v)" @check="emit('recheck')" />

        <ul v-if="path.reasons.length" class="m-reach__reasons">
          <li v-for="row in path.reasons" :key="row.code" :class="`is-${row.kind}`">
            <MIcon :name="row.kind === 'good' ? 'check_circle' : row.kind === 'note' ? 'info' : 'warning'" />
            <span class="m-reach__reason">{{ row.text }}</span>
            <MButton v-if="row.action" variant="tonal" size="sm" @click="fix(path, row)">{{ row.actionLabel }}</MButton>
            <div v-if="open === `${path.id}:${row.code}`" class="m-reach__fix">
              <template v-if="row.action === 'firewall'">
                <p>{{ platform === 'windows' ? T.fixFirewall : T.fixFirewallLinux }}</p>
                <div v-if="command" class="m-reach__cmd"><code>{{ command }}</code><MButton variant="tonal" size="sm" :icon="copied === command ? 'check' : 'content_copy'" @click="copyText(command)">{{ copied === command ? T.copied : T.copy }}</MButton></div>
              </template>
              <p v-else>{{ T.fixOutside }}</p>
            </div>
          </li>
        </ul>
      </article>

      <details v-if="view.portRows.length" class="m-reach__ports">
        <summary><MIcon name="keyboard_arrow_down" />{{ T.ports }}<small v-if="base">{{ T.portsHint.replace('{base}', base) }}</small></summary>
        <table>
          <thead><tr><th>{{ T.colRole }}</th><th>{{ T.colProto }}</th><th>{{ T.colInternal }}</th><th>{{ T.colListen }}</th><th>{{ T.colFirewall }}</th></tr></thead>
          <tbody>
            <tr v-for="p in view.portRows" :key="`${p.proto}${p.port}`" :data-role="p.role">
              <td>{{ p.name }}<small v-if="p.note"> · {{ p.note }}</small></td><td>{{ p.proto }}</td><td>{{ p.port }}</td>
              <td :class="`is-${p.state}`">{{ p.stateWord }}</td>
              <td :class="`is-${p.firewall}`">{{ p.firewallWord }}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </template>
  </section>
</template>
