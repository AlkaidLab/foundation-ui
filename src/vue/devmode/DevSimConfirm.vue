<script setup>
import { computed } from 'vue'
import MButton from '../MButton.vue'
import MDialog from '../MDialog.vue'
import { developerTexts, fill } from '../../developer/texts.js'
import { devmodeTexts } from '../../devmode/texts.js'
import { useHostSimulation } from '../useHostSimulation.js'

// The question before a simulation starts: what will happen, for how long, and the choice. `kind` is the simulation that was chosen ('' = no question open); the product's `simulate(kind)` does the work.
const props = defineProps({ locale: { type: String, default: 'zh' }, kind: { type: String, default: '' }, simulate: { type: Function, required: true } })
const emit = defineEmits(['close', 'notify'])
const T = computed(() => developerTexts(props.locale))
const D = computed(() => devmodeTexts(props.locale))
const sim = useHostSimulation()
const label = computed(() => ({ offline: T.value.simulateOffline, stopped: T.value.simulateStopped, unresponsive: T.value.simulateUnresponsive }[props.kind] || ''))
const open = computed({ get: () => !!props.kind, set: (v) => { if (!v) emit('close') } })
const text = computed(() => D.value[`simConfirm${props.kind[0]?.toUpperCase() || ''}${props.kind.slice(1)}`] || '')
async function start() {
  const kind = props.kind
  emit('close')
  try { await sim.start(kind, props.simulate) } catch (error) { emit('notify', `${D.value.simFailed}${error?.message ? `: ${error.message}` : ''}`) }
}
</script>

<template>
  <MDialog v-model="open" :title="fill(D.simConfirmTitle, { kind: label })" icon="science" tone="warning">
    <p data-dev="simulate-confirm-text">{{ text }}</p>
    <p class="dm-dim">{{ D.simConfirmTail }}</p>
    <template #actions><MButton variant="text" data-dev="simulate-cancel" @click="open = false">{{ T.cancel }}</MButton><MButton variant="filled" data-dev="simulate-start" @click="start">{{ D.simStart }}</MButton></template>
  </MDialog>
</template>
