<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import MSwitch from './MSwitch.vue'
import { displayTreeTexts } from '../settings/displayTreeTexts.js'

// The status card of HDR: one state (streaming in HDR, fallen back to SDR, unavailable, ready) with the reason when there is one, and the switch that allows HDR on the right.
// The state and the reason come from the host's report; nothing here is guessed.
const allow = defineModel({ type: Boolean, default: false })
const props = defineProps({
  /** 'running' | 'fallback' | 'off' | 'unavailable' | 'idle' | 'unknown' */
  state: { type: String, default: 'unknown' },
  /** 'no_client' | 'display' | 'codec' | 'encoder' | 'off' | '' */
  reason: { type: String, default: '' },
  /** a free text from the host that replaces the reason */
  detail: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  locale: { type: String, default: 'en' },
})
const t = computed(() => displayTreeTexts(props.locale).hdr)
const ICON = { running: 'hdr_on', fallback: 'hdr_off', off: 'hdr_off', unavailable: 'block', idle: 'hdr_on', unknown: 'help' }
const reasons = computed(() => ({ no_client: t.value.reasonNoClient, display: t.value.reasonDisplay, codec: t.value.reasonCodec, encoder: t.value.reasonEncoder, off: t.value.reasonOff }))
const title = computed(() => t.value[props.state] || t.value.unknown)
const text = computed(() => props.detail || reasons.value[props.reason] || '')
</script>

<template>
  <section class="m-hdrcard" :class="`is-${state}`" data-hdr-status>
    <span class="m-hdrcard__icon"><MIcon :name="ICON[state] || 'help'" fill /></span>
    <div class="m-hdrcard__body">
      <b class="m-hdrcard__title">{{ title }}</b>
      <span v-if="text" class="m-hdrcard__text">{{ text }}</span>
    </div>
    <label class="m-hdrcard__allow"><span>{{ t.allow }}</span><MSwitch v-model="allow" :label="t.allow" :disabled="disabled" /></label>
  </section>
</template>

<style>
.m-hdrcard { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: 28px; background: var(--m-card); }
.m-hdrcard__icon { flex: none; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 20px 12px 20px 12px; background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent); color: var(--md-sys-color-on-surface-variant); font-size: 30px; }
.m-hdrcard.is-running .m-hdrcard__icon { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
.m-hdrcard.is-fallback .m-hdrcard__icon { background: var(--md-sys-color-tertiary-container, var(--md-sys-color-secondary-container)); color: var(--md-sys-color-on-tertiary-container, var(--md-sys-color-on-secondary-container)); }
.m-hdrcard.is-unavailable .m-hdrcard__icon { background: color-mix(in srgb, var(--md-sys-color-error) 14%, transparent); color: var(--md-sys-color-error); }
.m-hdrcard__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.m-hdrcard__title { font: var(--m-title-medium, 600 16px/24px sans-serif); color: var(--md-sys-color-on-surface); }
.m-hdrcard__text { font: var(--m-body-medium, 400 14px/20px sans-serif); color: var(--md-sys-color-on-surface-variant); }
.m-hdrcard__allow { flex: none; display: flex; align-items: center; gap: 12px; font: var(--m-label-large, 500 14px/20px sans-serif); color: var(--md-sys-color-on-surface); }
@media (max-width: 480px) { .m-hdrcard { flex-wrap: wrap; } .m-hdrcard__allow { width: 100%; justify-content: space-between; } }
</style>
