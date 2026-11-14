<script setup>
import { computed, ref } from 'vue'
import MButton from './MButton.vue'
import MBanner from './MBanner.vue'
import MItem from './MItem.vue'
import MGroup from './MGroup.vue'
import MIcon from './MIcon.vue'
import MDialog from './MDialog.vue'
import MBreakText from './MBreakText.vue'
import MChoiceCards from './MChoiceCards.vue'
import MChoiceItem from './MChoiceItem.vue'
import MValueItem from './MValueItem.vue'
import { qrPath } from './guideModel.js'
import { fillText } from './guideTexts.js'
import { WEB_ACCESS_SCOPES, accessPending, bindValid, scopeChange, scopeOf, webAddresses, webPortOf } from './webAccess.js'
import { webAccessTexts } from './webAccessTexts.js'

// Who may open the Web UI of this host (主机设置 › 网络 and a step of the first-run flow, one component for both products): the choice, the address a phone opens with a QR code and a copy
// button, and the bind address as an advanced row. A controlled component: the product keeps the values (`scope` is origin_web_ui_allowed, `bind` is bind_address) and saves them; the
// confirmation for the internet and the password rule are here, so every place asks the same way.
//   v-model:scope, v-model:bind    the values as the host's configuration keeps them
//   port: the base port (the Web UI is port + 1); listeners: the host's `/api/network/listeners` answer ({ active, saved, addresses })
//   password: false when no password is set (the internet is refused), true when one is, null when unknown
//   pending: the choice is saved but the host runs the old one (a restart applies it); `local` of the product when the host does not report it
//   qr: (text) => QR matrix, drawn locally; copy(text): the product's clipboard; advanced: show the bind row; busy: the product is saving
//   emits: restart (the person asked), password (go and set one)
const scope = defineModel('scope', { type: String, default: 'lan' })
const bind = defineModel('bind', { type: String, default: '' })
const props = defineProps({
  locale: { type: String, default: 'en' },
  port: { type: Number, default: 47989 },
  listeners: { type: Object, default: null },
  password: { type: Boolean, default: null },
  pending: { type: Boolean, default: false },
  qr: { type: Function, default: null },
  copy: { type: Function, default: null },
  advanced: { type: Boolean, default: true },
  /** the advanced row starts open (a search result for the bind address lands on it) */
  open: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  restarting: { type: Boolean, default: false },
  failure: { type: String, default: '' },
})
const emit = defineEmits(['restart', 'password'])
const T = computed(() => webAccessTexts(props.locale))

const current = computed(() => scopeOf(scope.value))
const options = computed(() => WEB_ACCESS_SCOPES.map((value) => ({ value, label: T.value.scopes[value], text: T.value.scopeText[value], icon: { pc: 'computer', lan: 'wifi', wan: 'public' }[value] })))
const choose = computed({
  get: () => current.value,
  set: (value) => {
    const change = scopeChange(current.value, value, { password: props.password })
    if (change.blocked) { needPassword.value = true; return }
    if (change.confirm) { asked.value = value; return }
    scope.value = value
  },
})
// the internet asks twice: what it opens (asked), then the note with what it costs (final); a No on either leaves the choice as it was
const asked = ref('')
const final = ref('')
const needPassword = ref(false)
const confirmed = () => { final.value = asked.value; asked.value = '' }
const confirmedFinal = () => { scope.value = final.value; final.value = '' }

/* ---------- the address a phone opens ---------- */
const addresses = computed(() => webAddresses(props.listeners?.addresses, { bind: bind.value, base: props.port }))
const picked = ref('')
const shown = computed(() => addresses.value.find((a) => a.address === picked.value) || addresses.value[0] || null)
const qr = computed(() => {
  if (!props.qr || !shown.value) return null
  try { const q = qrPath(props.qr(shown.value.url)); return q.d ? q : null } catch { return null }
})
const copied = ref('')
let timer = 0
async function copyText(text) {
  try {
    if (props.copy) await props.copy(text)
    else await globalThis.navigator?.clipboard?.writeText(text)
    copied.value = text; clearTimeout(timer); timer = setTimeout(() => { copied.value = '' }, 1600)
  } catch { /* the address stays visible */ }
}

/* ---------- the bind address (advanced) ---------- */
const more = ref(props.open)
const manual = ref(false)
const known = computed(() => (props.listeners?.addresses || []).filter((a) => a && a.address))
const bindChoice = computed({
  get: () => (manual.value || (bind.value && !known.value.some((a) => a.address === bind.value)) ? '__manual__' : bind.value || ''),
  set: (value) => { manual.value = value === '__manual__'; if (!manual.value) bind.value = value },
})
const bindOptions = computed(() => [{ value: '', label: T.value.bindAll }, ...known.value.map((a) => ({ value: a.address, label: a.name ? `${a.name} · ${a.address}` : a.address })), { value: '__manual__', label: T.value.bindManual }])
const bindCheck = (value) => (bindValid(value) ? '' : T.value.bindInvalid)
const restartNeeded = computed(() => props.pending || accessPending(props.listeners?.active, props.listeners?.saved))
</script>

<template>
  <div class="m-webaccess" data-cfg="origin_web_ui_allowed">
    <MChoiceCards v-model="choose" :options="options" :label="T.label" :columns="3" :disabled="busy" />

    <MBanner v-if="current === 'pc'" tone="info" icon="computer">{{ T.pcOnly }}</MBanner>
    <section v-else class="m-webaccess__open" :aria-label="T.phoneTitle">
      <h3 class="m-webaccess__h">{{ T.phoneTitle }}</h3>
      <div v-if="addresses.length" class="m-webaccess__body" :class="{ 'has-qr': !!qr }">
        <figure v-if="qr" class="m-guide__qr m-webaccess__qr">
          <svg :viewBox="`0 0 ${qr.size} ${qr.size}`" shape-rendering="crispEdges" role="img" :aria-label="T.scan"><rect :width="qr.size" :height="qr.size" fill="#fff" /><path :d="qr.d" fill="#000" /></svg>
          <figcaption>{{ T.scan }}</figcaption>
        </figure>
        <MGroup class="m-webaccess__list">
          <MItem v-for="a in addresses" :key="a.address" class="m-webaccess__addr" :icon="shown && shown.address === a.address && qr ? 'qr_code_2' : 'lan'" :text="a.name" :action="addresses.length > 1 && !!qr" :selected="addresses.length > 1 && !!qr && !!shown && shown.address === a.address" :aria-label="addresses.length > 1 ? `${T.pick}: ${a.url}` : undefined" @click="picked = a.address">
            <template #title><MBreakText :text="a.url" /></template>
            <template #trail><MButton variant="tonal" size="sm" :icon="copied === a.url ? 'check' : 'content_copy'" @click.stop="copyText(a.url)">{{ copied === a.url ? T.copied : T.copy }}</MButton></template>
          </MItem>
        </MGroup>
      </div>
      <p v-else class="m-webaccess__note"><MIcon name="info" />{{ T.noAddress }}</p>
      <p class="m-webaccess__note"><MIcon name="wifi" />{{ T.sameWifi }}</p>
      <p class="m-webaccess__note"><MIcon name="lock" />{{ T.cert }}</p>
      <p v-if="current === 'wan'" class="m-webaccess__note"><MIcon name="router" />{{ fillText(T.forward, { port: webPortOf(port) }) }}</p>
    </section>
    <p class="m-webaccess__note"><MIcon name="cast_connected" />{{ T.streamNote }}</p>

    <MBanner v-if="restartNeeded" tone="warn" icon="restart_alt">
      <b>{{ T.restartTitle }}</b> {{ T.restartText }}
      <template #actions><MButton variant="text" size="sm" icon="restart_alt" :loading="restarting" @click="emit('restart')">{{ restarting ? T.restarting : T.restart }}</MButton></template>
    </MBanner>
    <MBanner v-if="failure" tone="error" icon="error">{{ failure }}</MBanner>

    <template v-if="advanced">
      <MGroup>
        <MItem action icon="tune" :title="T.advanced" :aria-expanded="more" @click="more = !more">
          <template #trail><span class="m-webaccess__more">{{ more ? T.advancedHide : T.advancedShow }}</span></template>
        </MItem>
        <template v-if="more">
          <MChoiceItem v-model="bindChoice" data-cfg="bind_address" :title="T.bind" icon="lan" :options="bindOptions" :help="T.bindText" :disabled="busy" />
          <MValueItem v-if="bindChoice === '__manual__'" v-model="bind" :label="T.bindField" :check="bindCheck" :empty-text="T.bindAuto" />
        </template>
      </MGroup>
    </template>

    <MDialog :model-value="!!asked" :title="T.confirmTitle" icon="warning" tone="warning" @update:model-value="asked = ''">
      <p>{{ T.confirmText }}</p>
      <template #actions>
        <MButton variant="text" @click="asked = ''">{{ T.confirmNo }}</MButton>
        <MButton @click="confirmed">{{ T.confirmYes }}</MButton>
      </template>
    </MDialog>
    <MDialog :model-value="!!final" class="m-webaccess__final" :title="T.finalTitle" icon="warning" tone="warning" @update:model-value="final = ''">
      <p>{{ T.finalText }}</p>
      <template #actions>
        <MButton variant="text" @click="final = ''">{{ T.confirmNo }}</MButton>
        <MButton variant="warning" @click="confirmedFinal">{{ T.finalYes }}</MButton>
      </template>
    </MDialog>
    <MDialog v-model="needPassword" :title="T.needTitle" icon="lock" tone="warning">
      <p>{{ T.needText }}</p>
      <template #actions>
        <MButton variant="text" @click="needPassword = false">{{ T.needOk }}</MButton>
        <MButton @click="needPassword = false; emit('password')">{{ T.needGo }}</MButton>
      </template>
    </MDialog>
  </div>
</template>
