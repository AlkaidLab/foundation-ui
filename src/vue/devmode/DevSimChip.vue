<script setup>
import { computed } from 'vue'
import MChip from '../MChip.vue'
import MButton from '../MButton.vue'
import { developerTexts, fill } from '../../developer/texts.js'
import { devmodeTexts } from '../../devmode/texts.js'
import { useHostSimulation } from '../useHostSimulation.js'

// In the header of every developer page (the `actions` slot of MPage) while a simulation runs: a chip with the simulation and the time left, and the way to end it. It leaves with the simulation.
// In a narrow window the header has room for the chip only: the button goes (the banner of 测试工具 carries 「结束模拟」, and so does the chip on the offline page, which has the room).
const props = defineProps({ locale: { type: String, default: 'zh' } })
const T = computed(() => developerTexts(props.locale))
const D = computed(() => devmodeTexts(props.locale))
const sim = useHostSimulation()
// the short names (the segments' own words): the chip is small, the banner and the row say 「主机离线」 in full
const kindLabel = computed(() => ({ offline: D.value.simOffline, stopped: D.value.simStopped, unresponsive: D.value.simUnresponsive }[sim.kind.value] || ''))
</script>

<template>
  <span v-if="sim.active.value" class="dm-simchip" data-dev="simulate-chip">
    <MChip tone="warn" icon="science">{{ fill(D.simChip, { kind: kindLabel, s: sim.remaining.value }) }}</MChip>
    <MButton size="sm" variant="tonal" data-dev="simulate-chip-end" @click="sim.end()">{{ T.simulateEnd }}</MButton>
  </span>
</template>
