<script setup>
import MDashCard from './MDashCard.vue'
import MRoll from './MRoll.vue'

// Virtual display card: driver state, size and refresh, HDR, the client it follows, and the display drawn in its real aspect ratio.
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'desktop_windows' },
  stateLabel: { type: String, default: '' },
  tone: { type: String, default: '' },
  value: { type: String, default: '' },
  unit: { type: String, default: '' },
  sub: { type: String, default: '' },
  chips: { type: Array, default: () => [] },
  screen: { type: Object, default: null },
  chevron: { type: Boolean, default: true },
  chevronLabel: { type: String, default: '' },
})
const emit = defineEmits(['open'])
</script>

<template>
  <MDashCard :title="title" :icon="icon" :chevron="chevron" :chevron-label="chevronLabel" class="m-dinfo m-dvdd" @open="emit('open')">
    <template #head><span class="m-dchip m-dchip--status" :class="tone && `m-dchip--${tone}`"><i />{{ stateLabel }}</span></template>
    <div v-if="screen" class="m-dinfo__screen" aria-hidden="true"><span class="m-dinfo__display" :class="{ 'is-hdr': screen.hdr }" :style="{ aspectRatio: `${screen.w} / ${screen.h}` }"><i>{{ screen.w }}×{{ screen.h }}</i></span><span class="m-dinfo__stand" /></div>
    <div v-if="value" class="m-dinfo__value"><b class="m-dnum"><MRoll :text="value" /></b><small v-if="unit">{{ unit }}</small></div>
    <div v-if="sub" class="m-dinfo__sub">{{ sub }}</div>
    <div v-if="chips.length" class="m-dinfo__chips"><span v-for="(c, i) in chips" :key="i" class="m-dchip" :class="c.tone && `m-dchip--${c.tone}`">{{ c.label }}</span></div>
  </MDashCard>
</template>
