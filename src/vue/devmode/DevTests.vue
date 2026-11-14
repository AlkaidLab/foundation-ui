<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import MGroup from '../MGroup.vue'
import MItem from '../MItem.vue'
import MLoading from '../MLoading.vue'
import MSheet from '../MSheet.vue'
import DevHostSim from './DevHostSim.vue'
import DevSimBanner from './DevSimBanner.vue'
import DevSimConfirm from './DevSimConfirm.vue'
import { developerTexts } from '../../developer/texts.js'
import { devmodeTexts } from '../../devmode/texts.js'

// 测试工具 for the developers: what makes the surfaces of a failure appear without a failure (the error dialog, the host that is away) and the telemetry check. All of it goes through `tools` of the product.
// Every state shows on the click: a simulation is a selected segment with a banner (and asks first), a test event shows 「发送中」 on its own row and the answer in the same place.
const props = defineProps({
  locale: { type: String, default: 'zh' }, tools: { type: Object, default: () => ({}) }, triggerError: { type: Function, default: null }, consentOn: { type: Boolean, default: false },
  /** false while the answer about telemetry is not known yet: the row waits with its own indicator instead of looking switched off */
  consentReady: { type: Boolean, default: true },
})
const emit = defineEmits(['notify'])
const T = computed(() => developerTexts(props.locale))
const D = computed(() => devmodeTexts(props.locale))
const sheet = ref(false)
const payload = ref('')
const asked = ref('')
const sending = ref(false)
const answer = ref('')
let answerTimer = 0
onBeforeUnmount(() => clearTimeout(answerTimer))
const has = (...path) => path.reduce((o, k) => (o ? o[k] : undefined), props.tools) !== undefined
const simulate = (kind) => props.tools.host.simulate(kind)
async function preview() { sheet.value = true; payload.value = T.value.pending; try { const p = await props.tools.telemetry.preview(); payload.value = typeof p === 'string' ? p : JSON.stringify(p, null, 2) } catch { payload.value = '' } }
const testValue = computed(() => (sending.value ? D.value.testSending : answer.value || (!props.consentReady ? '' : props.consentOn ? '' : T.value.telemetryConsentOff)))
const testBlocked = computed(() => props.consentReady && !props.consentOn)
function settle(text) { answer.value = text; clearTimeout(answerTimer); answerTimer = setTimeout(() => { answer.value = '' }, 4000) }
async function sendTest() {
  if (sending.value || !props.consentReady || !props.consentOn) return
  sending.value = true; answer.value = ''
  try { await props.tools.telemetry.test(); settle(D.value.testSent); emit('notify', T.value.telemetrySent) } catch (error) { settle(D.value.testFailed); emit('notify', T.value.failed.replace('{message}', error?.message || '')) } finally { sending.value = false }
}
defineExpose({ sending })
</script>

<template>
  <div class="dm-col" data-dev="tests">
    <DevSimBanner :locale="locale" />
    <MGroup>
      <MItem v-if="triggerError" action icon="error" :title="D.testsError" :value="D.testsErrorSub" data-dev="trigger-error" @click="triggerError()" />
      <DevHostSim v-if="has('host', 'simulate')" :locale="locale" @ask="asked = $event" />
      <MItem v-if="has('telemetry', 'preview')" action icon="visibility" :title="T.telemetryPreview" :value="T.telemetryPreviewState" data-dev="telemetry-preview" @click="preview" />
      <MItem v-if="has('telemetry', 'test')" action icon="send" :title="T.telemetryTest" :value="testValue" :disabled="testBlocked" :aria-busy="sending || !consentReady || undefined" :data-state="sending ? 'sending' : answer ? 'answered' : 'idle'" data-dev="telemetry-test" @click="sendTest">
        <template #trail><MLoading v-if="sending || !consentReady" size="24px" /></template>
      </MItem>
    </MGroup>
    <DevSimConfirm :locale="locale" :kind="asked" :simulate="simulate" @close="asked = ''" @notify="(text) => emit('notify', text)" />
    <MSheet v-model="sheet" :title="T.telemetryPreview" side="end" :close-label="T.close"><pre class="dm-code">{{ payload }}</pre></MSheet>
  </div>
</template>
