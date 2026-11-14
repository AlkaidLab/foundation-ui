<script setup>
import { computed, reactive } from 'vue'
import MGroup from '../MGroup.vue'
import MItem from '../MItem.vue'
import MSwitchItem from '../MSwitchItem.vue'
import MSeg from '../MSeg.vue'
import { ANIM_SCALES } from '../../developer/flags.js'
import { developerTexts, fill } from '../../developer/texts.js'
import { developerOverlays } from '../../developer/index.js'
import { devmodeTexts } from '../../devmode/texts.js'

// 功能开关: the overlays and the animation speed of this window (the same ones the options page used to hold); they are kept in the window's storage and applied while developer mode is on.
const props = defineProps({ locale: { type: String, default: 'zh' } })
const T = computed(() => developerTexts(props.locale))
const D = computed(() => devmodeTexts(props.locale))
const overlays = developerOverlays()
const flags = reactive({ ...overlays.flags })
const set = (patch) => { Object.assign(flags, overlays.set(patch)) }
const onOff = (v) => (v ? T.value.on : T.value.off)
const animLabel = (v) => fill(T.value.animScaleState, { s: v, r: v === 1 ? T.value.animNormal : v > 1 ? T.value.animSlower : T.value.animFaster })
const animOptions = computed(() => ANIM_SCALES.map((v) => ({ value: v, label: `${v}×` })))
</script>

<template>
  <div class="dm-col" data-dev="flags">
    <MGroup>
      <MSwitchItem :model-value="flags.hud" icon="monitor_heart" :title="T.hud" :text="onOff(flags.hud)" data-dev="hud" @update:model-value="set({ hud: $event })" />
      <MSwitchItem :model-value="flags.longTasks" icon="timer" :title="T.longTasks" :text="onOff(flags.longTasks)" data-dev="long-tasks" @update:model-value="set({ longTasks: $event })" />
      <MSwitchItem :model-value="flags.outlines" icon="grid_view" :title="T.outlines" :text="onOff(flags.outlines)" data-dev="outlines" @update:model-value="set({ outlines: $event })" />
      <MSwitchItem :model-value="flags.flashes" icon="bolt" :title="T.flashes" :text="flags.flashes ? T.flashesState : T.off" data-dev="flashes" @update:model-value="set({ flashes: $event })" />
      <MSwitchItem :model-value="flags.mutations" icon="sync" :title="T.mutations" :text="onOff(flags.mutations)" data-dev="mutations" @update:model-value="set({ mutations: $event })" />
      <MItem icon="slow_motion_video" :title="T.animScale" :value="animLabel(flags.animScale)" stack data-dev="anim-scale"><template #control><MSeg :options="animOptions" :model-value="flags.animScale" size="sm" @update:model-value="set({ animScale: $event })" /></template></MItem>
    </MGroup>
    <p class="dm-dim dm-small">{{ D.flagsHint }}</p>
  </div>
</template>
