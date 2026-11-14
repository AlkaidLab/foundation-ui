<script setup>
import { computed, ref } from 'vue'
import MChipSet from './MChipSet.vue'
import MLatencyClock from './MLatencyClock.vue'
import TestChannels from './testtools/TestChannels.vue'
import TestInput from './testtools/TestInput.vue'
import TestPad from './testtools/TestPad.vue'
import TestPacing from './testtools/TestPacing.vue'
import TestPatterns from './testtools/TestPatterns.vue'
import TestSync from './testtools/TestSync.vue'
import { testToolTexts } from '../testtools/texts.js'

// The test tools of 测试工具 and the latency clock, in place (the first stream check of the guide): the sound test, the keyboard, the mouse and touch, the gamepad, the test patterns, the frame rate and
// the A/V sync tool, and the clock. The same components as the Test tools page. `tool` is the tool shown; the guide sets it from the row of a check.
const tool = defineModel({ type: String, default: 'channels' })
const props = defineProps({ locale: { type: String, default: 'en' }, title: { type: String, default: '' }, clockLabel: { type: String, default: '' } })
const TT = computed(() => testToolTexts(props.locale))
const TOOLS = [['channels', 'speaker'], ['keyboard', 'keyboard'], ['mouse', 'mouse'], ['pad', 'sports_esports'], ['patterns', 'grid_on'], ['pacing', 'speed'], ['sync', 'sync'], ['clock', 'timer']]
const options = computed(() => TOOLS.map(([value, icon]) => ({ value, icon, label: value === 'clock' ? props.clockLabel : TT.value.tools[value] })))
const parts = { channels: TestChannels, keyboard: TestInput, mouse: TestInput, pad: TestPad, patterns: TestPatterns, pacing: TestPacing, sync: TestSync }
const root = ref(null)
defineExpose({ reveal: () => root.value?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }) })
</script>

<template>
  <div ref="root" class="m-guide__trybox">
    <MChipSet v-model="tool" :label="title" :options="options" />
    <div class="m-guide__try">
      <MLatencyClock v-if="tool === 'clock'" :locale="locale" />
      <component :is="parts[tool]" v-else :key="tool" :T="TT" v-bind="tool === 'keyboard' || tool === 'mouse' ? { part: tool } : {}" />
    </div>
  </div>
</template>
