<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import MSeg from '../MSeg.vue'
import MSwitch from '../MSwitch.vue'
import { fillText } from '../guideTexts.js'
import { AWAKE_OPTIONS, awakeLeft } from '../../testtools/logic.js'

// 防休眠: the Screen Wake Lock of the window while it is open (it ends when the window is hidden or closed, and is taken again when the window is shown), for a time or until switched off.
const props = defineProps({ T: { type: Object, required: true } })
const on = ref(false)
const choice = ref('60')
const left = ref(null)
const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
let lock = null
let startedAt = 0
let timer = 0
const minutes = computed(() => AWAKE_OPTIONS.find((o) => o.id === choice.value)?.minutes || 0)
const labelOf = (o) => (o.minutes === 0 ? props.T.awake.open : o.minutes >= 60 ? fillText(props.T.awake.hour, { n: o.minutes / 60 }) : fillText(props.T.awake.min, { n: o.minutes }))
const options = computed(() => AWAKE_OPTIONS.map((o) => ({ value: o.id, label: labelOf(o) })))
const clock = (s) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ''}${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
async function hold() { try { lock = await navigator.wakeLock.request('screen') } catch { lock = null } }
const again = () => { if (on.value && document.visibilityState === 'visible') hold() }
async function set(v) {
  on.value = v
  clearInterval(timer)
  if (v) {
    startedAt = Date.now(); await hold(); document.addEventListener('visibilitychange', again)
    timer = setInterval(() => { left.value = awakeLeft(startedAt, minutes.value); if (left.value === 0) set(false) }, 1000); left.value = awakeLeft(startedAt, minutes.value)
  } else { document.removeEventListener('visibilitychange', again); try { await lock?.release() } catch { /* already gone */ } lock = null; left.value = null }
}
onBeforeUnmount(() => { clearInterval(timer); document.removeEventListener('visibilitychange', again); lock?.release?.().catch(() => {}) })
</script>

<template>
  <section class="m-tt__tool">
    <p class="m-tt__note">{{ T.awake.note }}</p>
    <div class="m-tt__row"><b>{{ T.awake.hold }}</b><MSwitch :model-value="on" :label="T.awake.hold" :disabled="!supported" @update:model-value="set" /></div>
    <MSeg v-model="choice" :label="T.awake.for" :options="options" :disabled="on" />
    <p class="m-tt__note">{{ !supported ? T.awake.unsupported : on ? `${T.awake.held}${left !== null ? ` · ${fillText(T.awake.left, { t: clock(left) })}` : ''}` : '' }}</p>
  </section>
</template>
