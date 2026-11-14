<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import MSlider from './MSlider.vue'
import { displayTreeTexts } from '../settings/displayTreeTexts.js'

// 显示模式 as one card: a live value line (resolution · refresh rate · scaling) and a slider for each. The resolution slider only has the stops the display supports
// and snaps to them; the refresh-rate stops are the rates that resolution supports. Releasing a slider asks the product to apply the value to the display now
// (`apply`); the card shows that it is applying, applied or failed. A product that cannot change the display (a browser) shows the values and says so.
const model = defineModel({ type: Object, default: () => ({ resolution: '', refresh: 0, scale: 100 }) })
const props = defineProps({
  /** the resolutions the display supports, ascending: ['1920x1080', '2560x1440', …] */
  resolutions: { type: Array, default: () => [] },
  /** the refresh rates (Hz) the chosen resolution supports, ascending */
  refreshes: { type: Array, default: () => [] },
  scales: { type: Array, default: () => [100, 125, 150, 175, 200, 225, 250, 275, 300] },
  /** name of the display the card applies to */
  target: { type: String, default: '' },
  streaming: { type: Boolean, default: false },
  /** '' | 'applying' | 'applied' | 'failed' */
  state: { type: String, default: '' },
  error: { type: String, default: '' },
  /** the product can change the display (the control panel); false: values are shown, sliders are off */
  live: { type: Boolean, default: true },
  locale: { type: String, default: 'en' },
})
const emit = defineEmits(['apply'])
const t = computed(() => displayTreeTexts(props.locale).mode)
const size = (value) => String(value || '').replace(/x/i, ' × ')
const resIndex = computed({
  get: () => Math.max(0, props.resolutions.indexOf(model.value.resolution)),
  set: (i) => { model.value = { ...model.value, resolution: props.resolutions[i] ?? model.value.resolution } },
})
const rateIndex = computed({
  get: () => Math.max(0, props.refreshes.findIndex((r) => Math.abs(r - model.value.refresh) < 0.5)),
  set: (i) => { model.value = { ...model.value, refresh: props.refreshes[i] ?? model.value.refresh } },
})
const scaleIndex = computed({
  get: () => Math.max(0, props.scales.indexOf(model.value.scale)),
  set: (i) => { model.value = { ...model.value, scale: props.scales[i] ?? model.value.scale } },
})
const hz = (value) => `${Math.round(Number(value) * 100) / 100} ${t.value.unit}`
const line = computed(() => [size(model.value.resolution), model.value.refresh ? hz(model.value.refresh) : '', `${model.value.scale}%`].filter(Boolean).join(' · '))
const status = computed(() => (props.state === 'applying' ? t.value.applying : props.state === 'applied' ? t.value.applied : props.state === 'failed' ? t.value.failed.replace('{error}', props.error) : !props.live ? t.value.sliderHost : ''))
const commit = (kind) => emit('apply', { kind, ...model.value })
</script>

<template>
  <section class="m-modecard" :class="{ 'is-off': !live }" aria-live="polite">
    <header class="m-modecard__head">
      <b class="m-modecard__line" data-live-line>{{ line }}</b>
      <span v-if="target" class="m-modecard__target">{{ (streaming ? t.targetStream : t.target).replace('{name}', target) }}</span>
    </header>
    <div class="m-modecard__row">
      <MIcon name="aspect_ratio" /><span class="m-modecard__name">{{ t.resolution }}</span>
      <MSlider v-model="resIndex" :min="0" :max="Math.max(1, resolutions.length - 1)" :step="1" size="m" :label="t.resolution" :disabled="!live || resolutions.length < 2" @commit="commit('resolution')" />
      <span class="m-modecard__val">{{ size(model.resolution) }}</span>
    </div>
    <div class="m-modecard__row">
      <MIcon name="speed" /><span class="m-modecard__name">{{ t.refresh }}</span>
      <MSlider v-model="rateIndex" :min="0" :max="Math.max(1, refreshes.length - 1)" :step="1" size="m" :label="t.refresh" :disabled="!live || refreshes.length < 2" @commit="commit('refresh')" />
      <span class="m-modecard__val">{{ model.refresh ? hz(model.refresh) : '—' }}</span>
    </div>
    <div class="m-modecard__row">
      <MIcon name="format_size" /><span class="m-modecard__name">{{ t.scale }}</span>
      <MSlider v-model="scaleIndex" :min="0" :max="scales.length - 1" :step="1" size="m" :label="t.scale" :disabled="!live" @commit="commit('scale')" />
      <span class="m-modecard__val">{{ model.scale }}%</span>
    </div>
    <footer v-if="status" class="m-modecard__status" :class="`is-${state || 'info'}`"><MIcon :name="state === 'failed' ? 'error' : state === 'applied' ? 'check_circle' : state === 'applying' ? 'sync' : 'info'" />{{ status }}</footer>
  </section>
</template>

<style>
.m-modecard { display: flex; flex-direction: column; gap: 12px; padding: 16px 20px 14px; border-radius: 28px; background: var(--m-card); }
.m-modecard__head { display: flex; flex-direction: column; gap: 2px; }
.m-modecard__line { font: var(--m-headline-small, 600 24px/32px sans-serif); font-variant-numeric: tabular-nums; color: var(--md-sys-color-on-surface); }
.m-modecard__target { font: var(--m-body-medium, 400 14px/20px sans-serif); color: var(--md-sys-color-on-surface-variant); }
.m-modecard__row { display: grid; grid-template-columns: 24px 88px minmax(0, 1fr) 96px; align-items: center; gap: 12px; color: var(--md-sys-color-on-surface-variant); }
.m-modecard__name { font: var(--m-label-large, 500 14px/20px sans-serif); color: var(--md-sys-color-on-surface); }
.m-modecard__val { font: var(--m-label-large, 500 14px/20px sans-serif); font-variant-numeric: tabular-nums; text-align: right; color: var(--md-sys-color-on-surface); }
.m-modecard__status { display: flex; align-items: center; gap: 8px; font: var(--m-body-medium, 400 14px/20px sans-serif); color: var(--md-sys-color-on-surface-variant); }
.m-modecard__status.is-failed { color: var(--md-sys-color-error); }
.m-modecard__status.is-applied { color: var(--md-sys-color-primary-text); }
@media (max-width: 560px) { .m-modecard__row { grid-template-columns: 24px minmax(0, 1fr) auto; } .m-modecard__row .m-slider { grid-column: 1 / -1; grid-row: 2; } .m-modecard__name { grid-column: 2; } .m-modecard__val { grid-column: 3; grid-row: 1; } }
</style>
