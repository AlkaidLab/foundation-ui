<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import MButton from '../MButton.vue'
import MSheet from '../MSheet.vue'
import MGithubMark from '../MGithubMark.vue'
import { devmodeTexts, fillText } from '../../devmode/texts.js'
import { devReport, devProviders, closeDevSignIn } from './devReport.js'
import { useDevAccount } from './useDevAccount.js'
import { openAddress, copyText } from '../../devmode/handoff.js'

// F3: the GitHub device-code sign-in. The code and the polling are the Worker's (devmode/signin.js); without the backend the sheet says 未配置 and asks for nothing.
const props = defineProps({ locale: { type: String, default: 'zh' } })
const T = computed(() => devmodeTexts(props.locale))
const account = useDevAccount()
const backend = computed(() => account.backend())
const step = ref('idle') // idle | starting | code | denied | expired | offline | error | signed
const code = ref({ code: '', uri: '', ref: '', interval: 5, expiresAt: 0 })
const why = ref({ host: '', reason: '' }) // what an offline answer says: the host that was asked and the engine's words
const hint = ref('') // a failed open or copy: the person finishes by hand
const left = ref(0)
let timer = 0
let ticker = 0
const stop = () => { clearTimeout(timer); clearInterval(ticker) }
onBeforeUnmount(stop)

async function begin() {
  stop()
  step.value = 'starting'
  hint.value = ''
  const r = await account.flow.start()
  why.value = { host: r.host || '', reason: r.reason || '' }
  if (r.state !== 'code') { step.value = r.state === 'offline' ? 'offline' : 'error'; return }
  code.value = r
  step.value = 'code'
  left.value = Math.max(0, Math.round((r.expiresAt - Date.now()) / 1000))
  ticker = setInterval(() => { left.value = Math.max(0, Math.round((code.value.expiresAt - Date.now()) / 1000)) }, 1000)
  schedule(r.interval)
}
function schedule(seconds) {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const r = await account.flow.poll(code.value.ref)
    if (r.state === 'pending') return schedule(code.value.interval)
    if (r.state === 'slow') { code.value.interval += 5; return schedule(code.value.interval) }
    stop()
    why.value = { host: r.host || '', reason: r.reason || '' }
    if (r.state === 'signed') { account.set(r.session); step.value = 'signed' } else step.value = r.state === 'denied' ? 'denied' : r.state === 'expired' ? 'expired' : r.state === 'offline' ? 'offline' : 'error'
  }, seconds * 1000)
}
watch(() => devReport.signIn, (open) => { if (open) { if (account.signedIn.value) step.value = 'signed'; else step.value = 'idle' } else stop() })
const close = () => { stop(); closeDevSignIn() }
// A failed copy or open is said, never swallowed: the code stays selectable and the address stays in the button, so the person can finish by hand.
const copy = async () => { hint.value = (await copyText(code.value.code)) ? '' : T.value.siCopyFailed }
const openGithub = async () => { hint.value = (await openAddress(code.value.uri, { open: devProviders().openUrl })) ? '' : T.value.siOpenFailed }
const failDetail = computed(() => [why.value.host ? fillText(T.value.offlineHost, { host: why.value.host }) : '', why.value.reason].filter(Boolean).join(' · '))
const mm = computed(() => String(Math.floor(left.value / 60)))
const ss = computed(() => String(left.value % 60).padStart(2, '0'))
const stepNo = computed(() => (step.value === 'code' ? 2 : step.value === 'signed' ? 4 : 1))
const failText = computed(() => ({ denied: T.value.siDenied, expired: T.value.siExpired, offline: T.value.siOffline, error: T.value.siError }[step.value] || ''))
defineExpose({ step, begin })
</script>

<template>
  <MSheet :model-value="devReport.signIn" :title="T.siTitle" side="center" :close-label="T.close" @update:model-value="(v) => { if (!v) close() }">
    <div class="dm-signin" data-dev="signin">
      <div class="dm-gh"><span class="dm-gh__mark"><MGithubMark /></span><p class="dm-report__lead">{{ T.siLead }}</p></div>

      <template v-if="!backend.configured">
        <div class="dm-note dm-note--info" data-dev="signin-off"><MIcon name="info" fill /><span><b>{{ T.siOffTitle }}</b><br>{{ T.siOffText }}</span></div>
      </template>
      <template v-else-if="step === 'signed'">
        <div class="dm-done"><span class="dm-done__ico"><MIcon name="check" /></span><h3>{{ fillText(T.siDone, { login: account.login.value }) }}</h3><p>{{ T.siDoneText }}</p></div>
      </template>
      <template v-else>
        <div class="dm-steps3"><div :class="{ on: stepNo === 1 }"><b>1</b>{{ T.siStep1 }}</div><div :class="{ on: stepNo === 2 }"><b>2</b>{{ T.siStep2 }}</div><div><b>3</b>{{ T.siStep3 }}</div></div>
        <template v-if="step === 'code'">
          <div class="dm-field"><span class="dm-field__l">{{ T.siCodeHead }}</span><div class="dm-code-big"><span class="dm-code-big__v" data-selectable data-dev="signin-code">{{ code.code }}</span></div></div>
          <div class="dm-wait"><MIcon name="schedule" /><span class="dm-wait__t">{{ T.siWaiting }}<small>{{ T.siWaitingSub }} · {{ fillText(T.siExpiresIn, { m: mm, s: ss }) }}</small></span></div>
        </template>
        <div v-else-if="failText" class="dm-note dm-note--error" data-dev="signin-fail"><MIcon name="error" fill /><span class="dm-note__text"><span>{{ failText }}</span><small v-if="step === 'offline' && failDetail" class="dm-note__sub" data-dev="signin-fail-detail">{{ failDetail }}</small></span></div>
        <div v-if="hint" class="dm-note dm-note--error" data-dev="signin-hint"><MIcon name="error" fill /><span>{{ hint }}</span></div>
        <div class="dm-perms">
          <div class="dm-perm"><MIcon name="edit_note" /><span><b>{{ T.siPermIssues }}</b><small>{{ T.siPermIssuesSub }}</small></span></div>
          <div class="dm-perm"><MIcon name="inventory_2" /><span><b>{{ T.siPermRead }}</b><small>{{ T.siPermReadSub }}</small></span></div>
          <div class="dm-perm"><MIcon name="lock" /><span><small>{{ T.siPermNot }}</small></span></div>
        </div>
      </template>
    </div>
    <template #actions>
      <MButton variant="text" @click="close">{{ step === 'signed' ? T.done : T.cancel }}</MButton>
      <template v-if="backend.configured && step !== 'signed'">
        <MButton v-if="step === 'code'" variant="tonal" icon="content_copy" @click="copy">{{ T.siCopyCode }}</MButton>
        <MButton v-if="step === 'code'" icon="open_in_new" @click="openGithub">{{ T.siOpen }}</MButton>
        <MButton v-else :loading="step === 'starting'" icon="login" data-dev="signin-start" @click="begin">{{ failText ? T.siAgain : T.connect }}</MButton>
      </template>
    </template>
  </MSheet>
</template>
