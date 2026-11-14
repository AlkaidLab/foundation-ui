<script setup>
import { computed, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import MConnectPanel from './MConnectPanel.vue'
import { JOURNEY_STEPS, journeyAfterCount, journeyOpened, journeyStale, readJourney, writeJourney } from './journey.js'
import MOsChips from './MOsChips.vue'
import { readOs, writeOs } from '../clients/osChoice.js'
import { connectTexts } from '../clients/recommend.js'

/**
 * The first card of the overview while the host has no paired client: choose the device, install the client, pair, done, as one horizontal stepper on one card. The step
 * moves on by itself when the host sees a pairing (the count of paired clients goes up). It can be closed; with a client paired it is the compact pairing tile again.
 */
const props = defineProps({
  storageKey: { type: String, default: 'home' },
  locale: { type: String, default: 'en' },
  qr: { type: Function, default: null },
  pairQr: { type: Object, default: null },
  canPin: { type: Boolean, default: true },
  count: { type: Number, default: 0 },
  latest: { type: String, default: '' },
  live: { type: Boolean, default: true },
  assetsOf: { type: Function, default: null },
  versionOf: { type: Function, default: null },
})
const emit = defineEmits(['act'])
const T = computed(() => connectTexts(props.locale))
const state = ref(readJourney(props.storageKey))
const save = () => writeJourney(props.storageKey, state.value)
const set = (patch) => { state.value = { ...state.value, ...patch }; save() }
if (props.live) { state.value = journeyOpened(state.value); save() }
const stale = computed(() => props.live && journeyStale(state.value))
watch(() => props.count, (n) => { if (props.live) { state.value = journeyAfterCount(state.value, n); save() } }, { immediate: true })
const go = (step) => set({ step: Math.max(0, Math.min(JOURNEY_STEPS - 1, step)) })
// the system is the one the person last chose anywhere (the dialog, the download tile), Android the first time
const os = computed({ get: () => state.value.os || readOs(), set: (o) => { writeOs(o); set({ os: o }) } })
const pick = (o) => { writeOs(o); set({ os: o, step: 1 }) }
</script>

<template>
  <section class="m-dcard m-journey">
    <header class="m-journey__head">
      <ol class="m-journey__steps" :aria-label="T.journey">
        <li v-for="(label, i) in T.steps" :key="i" :class="{ 'is-on': state.step === i, 'is-done': state.step > i }" :aria-current="state.step === i ? 'step' : undefined"><b>{{ state.step > i ? '✓' : i + 1 }}</b><span>{{ label }}</span></li>
      </ol>
      <button type="button" class="m-journey__close" :aria-label="T.dismiss" @click="emit('act', 'journey-dismiss')"><MIcon name="close" /></button>
    </header>
    <p v-if="stale" class="m-journey__stale"><MIcon name="lightbulb" /><span>{{ T.stale }}</span><button type="button" class="m-conn__link" @click="emit('act', 'journey-dismiss')">{{ T.moveOut }}</button></p>
    <div class="m-journey__body">
      <div v-if="state.step === 0" class="m-journey__pick">
        <h3>{{ T.stepDevice }}</h3>
        <MOsChips :model-value="os" big :locale="locale" :label="T.osChoice" @update:model-value="pick" />
      </div>
      <template v-else-if="state.step === 1">
        <MConnectPanel v-model:os="os" view="install" hide-choice :locale="locale" :qr="qr" :assets-of="assetsOf" :version-of="versionOf" @open-url="(u) => emit('act', 'open-url', u)" @open-downloads="emit('act', 'open', 'downloads')" />
        <footer class="m-journey__nav"><button type="button" class="m-dpill" @click="go(0)">{{ T.back }}</button><button type="button" class="m-dpill m-dpill--fill" @click="go(2)">{{ T.installed }}</button></footer>
      </template>
      <template v-else-if="state.step === 2">
        <MConnectPanel v-model:os="os" view="pair" hide-choice :locale="locale" :qr="qr" :pair-qr="pairQr" :can-pin="canPin" :count="count" :latest="latest" :active="live"
          @pair-pin="(e) => emit('act', 'pair-pin', e)" @pair-qr-begin="emit('act', 'pair-qr-begin')" @pair-qr-stop="emit('act', 'pair-qr-stop')" />
        <footer class="m-journey__nav"><button type="button" class="m-dpill" @click="go(1)">{{ T.back }}</button></footer>
      </template>
      <div v-else class="m-journey__done">
        <MIcon name="check_circle" fill />
        <h3>{{ T.pairedMany }}</h3>
        <p v-if="latest">{{ T.pairedNow.replace('{name}', latest) }}</p>
        <button type="button" class="m-dpill m-dpill--fill" @click="emit('act', 'journey-dismiss')">{{ T.finish }}</button>
      </div>
    </div>
  </section>
</template>
