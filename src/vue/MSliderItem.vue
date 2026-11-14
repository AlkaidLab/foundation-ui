<script setup>
import { computed } from 'vue'
import MItem from './MItem.vue'
import MSlider from './MSlider.vue'
import MInfo from './MInfo.vue'

const model = defineModel({ type: [Number, Array], default: 0 })
const emit = defineEmits(['commit'])
const props = defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  icon: { type: String, default: '' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 1 },
  step: { type: Number, default: 0 },
  decimals: { type: Number, default: 2 },
  unit: { type: String, default: '' },
  log: { type: Boolean, default: false },
  /** the product slider: size m (40 px track, 44 px handle), inside icons at both ends where the caller names them (iconStart / iconEnd), a visible track, a value bubble, 自动 in the track (offText); xs and s are for a slider inside a tile or a table row */
  size: { type: String, default: 'm' },
  centered: { type: Boolean, default: false },
  center: { type: Number, default: null },
  iconStart: { type: String, default: '' },
  iconEnd: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  info: { type: String, default: '' },
  pin: { type: Object, default: null },
  /** text shown as the value instead of the number (a named step) */
  readoutText: { type: String, default: '' },
  /** name of the lowest position when it means "automatic" or "off": written in the empty track, so a slider at its start does not look broken */
  offText: { type: String, default: '' },
  marks: { type: Array, default: () => [] },
})
const fmt = (v) => `${Number(v).toFixed(props.decimals)}${props.unit}`
const readout = computed(() => props.readoutText || (Array.isArray(model.value) ? `${fmt(model.value[0])} – ${fmt(model.value[1])}` : fmt(model.value)))
</script>

<template>
  <MItem :title="title" :text="text" :icon="icon" :disabled="disabled" :pin="pin" stack>
    <template #trail><MInfo v-if="info" :text="info" /><span class="m-slider-value">{{ readout }}</span></template>
    <template #control>
      <MSlider
        v-model="model"
        :min="min" :max="max" :step="step" :decimals="decimals" :unit="unit" :log="log" :size="size"
        :centered="centered" :center="center" :icon-start="iconStart" :icon-end="iconEnd"
        :disabled="disabled" :label="title" :marks="marks" :bubble-text="readoutText" :off-text="offText"
        @commit="emit('commit', $event)"
      />
    </template>
  </MItem>
</template>

<style>
.m-slider-value { font: var(--m-label-large); font-variant-numeric: tabular-nums; color: var(--md-sys-color-primary-text); text-align: right; }
</style>
