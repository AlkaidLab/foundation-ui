<script setup>
import { inject, ref } from 'vue'
import { useFabLift } from './useFabLift.js'

// The main action(s) of a page, shown in the dock at the bottom end of the content pane (MScene owns the dock). A page shown without a scene (the Web UI inside the control panel's frame) gets a dock of its own at
// the bottom end of the window, which lifts the same way.
const scene = inject('m-scene', null)
const own = ref(null)
const { lift } = useFabLift(own)
</script>

<template>
  <Teleport v-if="scene?.fabHost?.value" :to="scene.fabHost.value"><slot /></Teleport>
  <div v-else ref="own" class="m-fabdock" :style="{ '--m-fab-lift': `${lift}px` }"><slot /></div>
</template>
