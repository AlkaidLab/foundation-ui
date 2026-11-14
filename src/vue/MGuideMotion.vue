<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import MGroup from './MGroup.vue'
import MItem from './MItem.vue'
import MLoading from './MLoading.vue'
import { useAppearance } from './useAppearance.js'
import { appearanceTexts, motionSystemLabel } from './appearanceTexts.js'
import { systemReducedMotion, watchSystemMotion } from '../appearance/motion.js'

// The motion step of the first-run flow: the three choices of 个性化 › 动画 (跟随系统 preselected, saying what it means now; 完整; 减少), saved by the same appearance path, and a small
// sample under them that shows the real motion of the choice: a dot that runs from side to side and the busy indicator, moved by the same rules as the rest of the product (reduced: the dot rests, the indicator fades slowly).
const props = defineProps({ locale: { type: String, default: 'en' } })
const appearance = useAppearance()
const sysReduced = ref(systemReducedMotion())
const stopSysMotion = watchSystemMotion((v) => { sysReduced.value = v })
onBeforeUnmount(stopSysMotion)
const T = computed(() => appearanceTexts(props.locale))
const choices = computed(() => [['system', 'contrast', motionSystemLabel(T.value, sysReduced.value)], ['full', 'slow_motion_video', T.value.motionFull], ['reduced', 'speed', T.value.motionReduced]].map(([value, icon, label]) => ({ value, icon, label })))
</script>

<template>
  <MGroup role="radiogroup" :aria-label="T.motion">
    <MItem v-for="o in choices" :key="o.value" action role="radio" :icon="o.icon" :selected="appearance.state.motion === o.value" :aria-checked="appearance.state.motion === o.value" :title="o.label" @click="appearance.set({ motion: o.value })" />
  </MGroup>
  <div class="m-guide__motion" aria-hidden="true"><div class="m-guide__motion-track"><span class="m-guide__motion-dot"></span></div><MLoading size="40px" /></div>
</template>
