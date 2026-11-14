<script setup>
import { computed, ref } from 'vue'
import MBanner from './MBanner.vue'
import MGroup from './MGroup.vue'
import MSourceList from './MSourceList.vue'
import MFieldItem from './MFieldItem.vue'
import MButton from './MButton.vue'
import { updateSourceTexts } from '../update/sourceTexts.js'
import { cdkView } from '../update/cdkView.js'
import { MIRRORCHYAN_CDK_URL } from '../update/mirrorchyan.js'

// The update method step of the guide: the source (automatic by default), and for a Chinese interface the optional Mirror酱 CDK. The product keeps both (callbacks setUpdateSource, saveCdk, clearCdk).
const props = defineProps({ locale: { type: String, default: 'en' }, state: { type: Object, required: true }, callbacks: { type: Object, default: () => ({}) } })
const emit = defineEmits(['open-url'])

const U = computed(() => updateSourceTexts(props.locale))
const update = computed(() => props.state.update || {})
const zhUi = computed(() => /^zh/i.test(String(props.locale)))
const showCdk = computed(() => zhUi.value && update.value.cdk !== false) // Mirror酱 is a choice like the others; its CDK field appears only once it is the chosen source
const mirrorChosen = computed(() => showCdk.value && update.value.source === 'mirror')
// Mirror酱 is a choice like the others: offered to a Chinese interface, or when it is already the source (MSourceList)
const offerMirror = computed(() => showCdk.value || update.value.source === 'mirror')
const cdkDraft = ref('')
const cdkWorking = ref(false)
const cdkBusy = computed(() => !!update.value.busy || cdkWorking.value)
const cdkResult = computed(() => (update.value.hasCdk ? cdkView(update.value.status, U.value, { lastValid: update.value.lastValid }) : null))
const pickSource = (value) => { void props.callbacks.setUpdateSource?.(value) }
// entering a CDK checks it once and shows the result; a valid one makes Mirror酱 the source, since that is the only source that uses it
async function checkCdk() {
  const value = cdkDraft.value.trim()
  if (!value || cdkBusy.value) return
  cdkWorking.value = true
  try {
    const result = (await props.callbacks.saveCdk?.(value)) || { ok: false }
    if (result.ok) cdkDraft.value = ''
    if (result.ok && update.value.status?.state === 'valid') pickSource('mirror')
  } finally { cdkWorking.value = false }
}
async function removeCdk() { if (cdkBusy.value) return; cdkWorking.value = true; try { await props.callbacks.clearCdk?.() } finally { cdkWorking.value = false } }
</script>

<template>
  <MGroup role="radiogroup" :aria-label="U.source">
    <MSourceList :texts="U" :source="update.source" :mirror="offerMirror" @pick="pickSource" />
  </MGroup>
  <template v-if="mirrorChosen">
    <MGroup>
      <MFieldItem v-model="cdkDraft" type="password" :label="U.cdkOptional" :supporting="update.available === false ? U.unavailable : U.cdkHint" autocomplete="off" :disabled="update.available === false || cdkBusy" />
    </MGroup>
    <div class="m-guide__row">
      <MButton variant="tonal" icon="fact_check" :loading="cdkWorking" :disabled="!cdkDraft.trim() || update.available === false || cdkBusy" @click="checkCdk">{{ cdkWorking ? U.checking : U.check }}</MButton>
      <MButton variant="text" icon="link" @click="emit('open-url', MIRRORCHYAN_CDK_URL)">{{ U.getCdk }}</MButton>
      <MButton v-if="update.hasCdk" variant="text" icon="delete" :disabled="cdkBusy" @click="removeCdk">{{ U.clear }}</MButton>
    </div>
    <MBanner v-if="cdkResult" :tone="cdkResult.tone === 'ok' ? 'info' : cdkResult.tone === 'error' ? 'warn' : 'info'" :icon="cdkResult.tone === 'ok' ? 'check_circle' : 'info'">
      <b>{{ cdkResult.label }}</b><template v-for="line in cdkResult.lines" :key="line"><br>{{ line }}</template>
    </MBanner>
  </template>
</template>
