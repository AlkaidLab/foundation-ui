<script setup>
import { computed } from 'vue'
import MItem from '../MItem.vue'
import MSeg from '../MSeg.vue'
import { developerTexts, fill } from '../../developer/texts.js'
import { devmodeTexts } from '../../devmode/texts.js'
import { SIMULATIONS, chooseSimulation, useHostSimulation } from '../useHostSimulation.js'

// 模拟主机状态: the choice is a segmented control whose selected segment is the simulation that is running (「未模拟」 when none); the value of the row says which one and for how long. Choosing one asks first
// (DevSimConfirm, which the page puts outside its group), choosing 「未模拟」 ends it without a question. The state is shared (useHostSimulation), so the banner and the chip agree with this row.
const props = defineProps({ locale: { type: String, default: 'zh' } })
const emit = defineEmits(['ask'])
const T = computed(() => developerTexts(props.locale))
const D = computed(() => devmodeTexts(props.locale))
const sim = useHostSimulation()
const kindLabel = (kind) => ({ offline: T.value.simulateOffline, stopped: T.value.simulateStopped, unresponsive: T.value.simulateUnresponsive }[kind] || '')
const options = computed(() => [{ value: '', label: D.value.simNone }, ...SIMULATIONS.map((kind) => ({ value: kind, label: D.value[`sim${kind[0].toUpperCase()}${kind.slice(1)}`] }))])
const value = computed(() => (sim.active.value ? fill(D.value.simActive, { kind: kindLabel(sim.kind.value), s: sim.remaining.value }) : D.value.simRow))
const choose = (kind) => { const todo = chooseSimulation(sim.kind.value, kind); if (todo === 'end') void sim.end(); else if (todo === 'ask') emit('ask', kind) }
</script>

<template>
  <MItem icon="science" :title="T.simulateHost" :value="value" stack data-dev="simulate-host" :data-sim="sim.kind.value || 'none'">
    <template #control><MSeg :options="options" :model-value="sim.kind.value" :label="T.simulateHost" size="sm" data-dev="simulate-seg" @update:model-value="choose" /></template>
  </MItem>
</template>
