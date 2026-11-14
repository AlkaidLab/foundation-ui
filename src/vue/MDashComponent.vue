<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import MChip from './MChip.vue'
import { COMPONENT_ICONS } from '../status/model.js'
import { registeredComponentStatus } from '../status/controller.js'
import { statusTexts } from '../status/texts.js'

// A component's state as a card of the home (add it from the catalogue). It reads the registered controller of the window; without one it
// shows the name and "unknown". The chevron opens the full page, the check button runs the on-demand check.
const props = defineProps({ id: { type: String, required: true } })
const status = registeredComponentStatus()
const T = computed(() => (status ? status.text() : statusTexts('en')))
const row = computed(() => status?.row(props.id) || { state: 'unknown', version: '', note: '', checks: [], result: null, checking: false })
const TONE = { ok: 'ok', warn: 'warn', error: 'error', missing: 'warn', unknown: 'neutral' }
const ICON = { ok: 'check_circle', warn: 'warning', error: 'error', missing: 'warning', unknown: 'help' }
const sub = computed(() => row.value.version || row.value.note || (row.value.state === 'unknown' ? T.value.unknownNote : ''))
const problems = computed(() => row.value.checks.filter((c) => c.result === 'error' || c.result === 'warn').length)
</script>

<template>
  <section class="m-dcard m-dcomp" :data-state="row.state">
    <header class="m-dcard__head">
      <MIcon class="m-dcard__icon" :name="COMPONENT_ICONS[id]" />
      <h3 class="m-dcard__title">{{ T.names[id] }}</h3>
      <button v-if="status?.openPage" type="button" class="m-dcard__more" :aria-label="T.title" :data-tip="T.title" @click="status.openPage()"><MIcon name="chevron_right" /></button>
    </header>
    <div class="m-dcard__body m-dcomp__body">
      <MChip :tone="TONE[row.state]" :icon="ICON[row.state]">{{ T.states[row.state] }}</MChip>
      <p class="m-dcomp__sub">{{ sub }}</p>
      <p v-if="problems" class="m-dcomp__sub">{{ T.checks[row.checks.find((c) => c.result === 'error' || c.result === 'warn').id] || '' }}</p>
      <button v-if="status" type="button" class="m-dpill m-dcomp__check" :disabled="row.checking" @click="status.check(id)"><MIcon name="monitor_heart" />{{ row.checking ? T.checking : T.check }}</button>
    </div>
  </section>
</template>
