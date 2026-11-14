<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { curvePaths } from './curve.js'
import { useDrawnPoints, useOnScreen } from './useOnScreen.js'

// A small area curve along the bottom edge of an info card (no axis, no numbers).
const props = defineProps({ points: { type: Array, default: () => [] } })
const root = ref(null)
const w = ref(240)
let ro = null
onMounted(() => { const read = () => { w.value = Math.max(40, Math.round(root.value.getBoundingClientRect().width)) }; if (typeof ResizeObserver === 'undefined') read(); else { ro = new ResizeObserver(read); ro.observe(root.value) } })
onBeforeUnmount(() => ro?.disconnect())
// drawn while it is seen, the same samples are not drawn again
const drawn = useDrawnPoints(() => props.points, useOnScreen(root))
const paths = computed(() => curvePaths(drawn.value, { w: w.value, h: 40, pad: 0.2 }))
</script>

<template>
  <svg ref="root" class="m-dspark" :viewBox="`0 0 ${w} 40`" preserveAspectRatio="none" aria-hidden="true"><path v-if="paths.area" class="m-dspark__area" :d="paths.area" /><path class="m-dspark__line" :d="paths.line" /></svg>
</template>
