<script setup>
import { onMounted, reactive, watch } from 'vue'
import MWebAccess from './MWebAccess.vue'
import { webAccessTexts } from './webAccessTexts.js'

// The Web UI access step of the first-run flow: the choice is saved the moment it is made (the host applies it after a restart), nothing changes unless the person picks another one.
//   state: { account: { exists }, network: { port }, host: { addresses }, webAccess: { scope, bind, active?, saved? } }
//   callbacks: loadNetwork(), loadWebAccess(), saveWebAccess({ origin_web_ui_allowed? , bind_address? }) -> { ok, error? }, restartHost() -> { ok, error? }, copy(text)
const props = defineProps({
  locale: { type: String, default: 'en' },
  state: { type: Object, required: true },
  callbacks: { type: Object, default: () => ({}) },
  qr: { type: Function, default: null },
})
const T = () => webAccessTexts(props.locale)
const own = reactive({ scope: 'lan', bind: '', saved: false, restarting: false, failure: '', ready: false })
const shown = () => props.state.webAccess || {}

async function save(key, value) {
  own.failure = ''
  try {
    const r = (await props.callbacks.saveWebAccess?.({ [key]: value })) || { ok: false }
    if (r.ok) own.saved = true; else own.failure = r.error || T().failed
  } catch (error) { own.failure = error?.message || T().failed }
}
watch(() => own.scope, (value) => { if (own.ready && value !== (shown().scope || 'lan')) void save('origin_web_ui_allowed', value) })
watch(() => own.bind, (value) => { if (own.ready && value !== (shown().bind || '')) void save('bind_address', value) })
async function restart() {
  own.restarting = true; own.failure = ''
  try { const r = (await props.callbacks.restartHost?.()) || { ok: false }; if (!r.ok) own.failure = r.error || T().failed } catch (error) { own.failure = error?.message || '' } finally { own.restarting = false }
}
onMounted(async () => {
  await Promise.all([props.callbacks.loadNetwork?.(), props.callbacks.loadWebAccess?.()])
  own.scope = shown().scope || 'lan'; own.bind = shown().bind || ''
  own.ready = true
})
</script>

<template>
  <MWebAccess v-model:scope="own.scope" v-model:bind="own.bind" :locale="locale" :port="state.network?.activePort || state.network?.port || 47989" :listeners="{ addresses: state.host?.addresses || [], active: shown().active, saved: shown().saved }" :password="state.account?.exists ?? null" :pending="own.saved" :qr="qr" :copy="callbacks.copy" :restarting="own.restarting" :failure="own.failure" :advanced="false" @restart="restart" />
</template>
