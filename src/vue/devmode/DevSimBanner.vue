<script setup>
import { computed } from 'vue'
import MBanner from '../MBanner.vue'
import MButton from '../MButton.vue'
import { developerTexts, fill } from '../../developer/texts.js'
import { devmodeTexts } from '../../devmode/texts.js'
import { useHostSimulation } from '../useHostSimulation.js'

// The banner on 测试工具 while a simulation runs: which one, how long it still runs, and the way to end it.
const props = defineProps({ locale: { type: String, default: 'zh' } })
const T = computed(() => developerTexts(props.locale))
const D = computed(() => devmodeTexts(props.locale))
const sim = useHostSimulation()
const kindLabel = computed(() => ({ offline: T.value.simulateOffline, stopped: T.value.simulateStopped, unresponsive: T.value.simulateUnresponsive }[sim.kind.value] || ''))
</script>

<template>
  <MBanner v-if="sim.active.value" tone="warn" icon="science" data-dev="simulate-banner">
    <b>{{ fill(D.simBanner, { kind: kindLabel }) }}</b> · {{ fill(D.simBannerText, { s: sim.remaining.value }) }}
    <template #actions><MButton size="sm" variant="text" data-dev="simulate-end" @click="sim.end()">{{ T.simulateEnd }}</MButton></template>
  </MBanner>
</template>
