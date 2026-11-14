<script setup>
import { computed, ref } from 'vue'
import MChipSet from '../MChipSet.vue'
import TestPatterns from './TestPatterns.vue'
import TestPacing from './TestPacing.vue'
import TestSync from './TestSync.vue'
import TestChannels from './TestChannels.vue'
import TestInput from './TestInput.vue'
import TestAwake from './TestAwake.vue'
import TestLatency from './TestLatency.vue'
import TestMic from './TestMic.vue'
import TestPad from './TestPad.vue'
import TestDisplay from './TestDisplay.vue'
import { testToolTexts } from '../../testtools/texts.js'

// 测试工具 (the toolbox, and the help rail of the Web UI): ten small tools that judge a stream from the window that runs them: 画面测试图, 帧率与卡顿, 音画同步, 声道, 键盘鼠标触控, 防休眠, 输入延迟, 麦克风电平, 手柄, 显示器信息. Whatever asks for a permission starts on a press; every tool lets go of its devices and listeners when it goes.
// One page, one tool at a time (ten tools: chips that wrap, a segmented bar no longer fits); each tool says in a line what it shows and what a fault looks like.
// hostRumble: (optional) `async ({ duration_ms }) => answer of POST /api/dualsense/rumble-test`; the 手柄 tool uses it to rumble a stream's virtual pad, which the browser cannot reach.
const props = defineProps({ locale: { type: String, default: 'en' }, hostRumble: { type: Function, default: null } })
const T = computed(() => testToolTexts(props.locale))
const tool = ref('patterns')
const TOOLS = [['patterns', 'grid_on'], ['pacing', 'speed'], ['sync', 'sync'], ['channels', 'speaker'], ['input', 'keyboard'], ['awake', 'bedtime'], ['latency', 'touch_app'], ['mic', 'mic'], ['pad', 'sports_esports'], ['display', 'desktop_windows']]
const options = computed(() => TOOLS.map(([value, icon]) => ({ value, icon, label: T.value.tools[value] })))
const parts = { patterns: TestPatterns, pacing: TestPacing, sync: TestSync, channels: TestChannels, input: TestInput, awake: TestAwake, latency: TestLatency, mic: TestMic, pad: TestPad, display: TestDisplay }
</script>

<template>
  <div class="m-tt">
    <MChipSet v-model="tool" :label="T.title" :options="options" />
    <component :is="parts[tool]" :key="tool" :T="T" :host-rumble="tool === 'pad' ? hostRumble : null" />
  </div>
</template>
