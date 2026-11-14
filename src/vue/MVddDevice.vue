<script setup>
import { computed } from 'vue'
import MButton from './MButton.vue'
import MIcon from './MIcon.vue'
import MSwitch from './MSwitch.vue'
import { displayTreeTexts } from '../settings/displayTreeTexts.js'

// The device card of 基地虚拟显示器: the driver (state, installed and included version, install or repair), whether the display exists now (create or close it), and the switch that keeps it
// enabled. Everything else about the display lives where it belongs (modes, calibration, scaling); the card only links there.
const keep = defineModel('keep', { type: Boolean, default: false })
const props = defineProps({
  /** 'ready' | 'degraded' | 'missing' | 'unknown' | 'checking' */
  state: { type: String, default: 'unknown' },
  installedVersion: { type: String, default: '' },
  bundledVersion: { type: String, default: '' },
  /** the display exists now; null when the host does not say */
  active: { type: Boolean, default: null },
  busy: { type: Boolean, default: false },
  canInstall: { type: Boolean, default: true },
  /** the keep switch can be saved from here (the tray owns the key; a browser may only show it) */
  canKeep: { type: Boolean, default: true },
  keepBusy: { type: Boolean, default: false },
  statusText: { type: String, default: '' },
  locale: { type: String, default: 'en' },
})
const emit = defineEmits(['install', 'recheck', 'create', 'close'])
const t = computed(() => displayTreeTexts(props.locale).device)
const ready = computed(() => props.state === 'ready' || props.state === 'degraded')
const icon = computed(() => ({ ready: 'check_circle', degraded: 'build', missing: 'download', checking: 'sync', unknown: 'help' }[props.state] || 'help'))
const title = computed(() => (props.state === 'checking' ? t.value.checking : t.value[props.state] || t.value.unknown))
const versions = computed(() => [props.installedVersion && t.value.version.replace('{installed}', props.installedVersion), props.bundledVersion && t.value.bundled.replace('{bundled}', props.bundledVersion)].filter(Boolean).join(' · '))
</script>

<template>
  <section class="m-vdddev" :class="`is-${state}`" data-vdd-device>
    <header class="m-vdddev__head">
      <span class="m-vdddev__icon"><MIcon :name="icon" fill /></span>
      <div class="m-vdddev__body">
        <b class="m-vdddev__title">{{ title }}</b>
        <span v-if="versions || statusText" class="m-vdddev__text">{{ versions || statusText }}</span>
      </div>
      <div class="m-vdddev__actions">
        <MButton v-if="state === 'missing' || state === 'degraded'" icon="download" :loading="busy" :disabled="!canInstall" @click="emit('install')">{{ state === 'missing' ? t.install : t.repair }}</MButton>
        <MButton variant="tonal" icon="refresh" :disabled="busy" @click="emit('recheck')">{{ t.recheck }}</MButton>
      </div>
    </header>
    <div v-if="ready" class="m-vdddev__live">
      <span class="m-vdddev__dot" :class="{ 'is-live': active }" aria-hidden="true" />
      <span class="m-vdddev__state">{{ active === null ? '' : active ? t.exists : t.notCreated }}</span>
      <span class="m-vdddev__spacer" />
      <MButton v-if="active === false" size="sm" variant="tonal" icon="add" :disabled="busy" @click="emit('create')">{{ t.create }}</MButton>
      <MButton v-if="active" size="sm" variant="tonal" icon="close" :disabled="busy" @click="emit('close')">{{ t.close }}</MButton>
    </div>
    <label v-if="ready" class="m-vdddev__keep">
      <span class="m-vdddev__keeptext"><b>{{ t.keep }}</b><small>{{ canKeep ? t.keepText : t.trayOnly }}</small></span>
      <MSwitch v-model="keep" :label="t.keep" :disabled="!canKeep || keepBusy" />
    </label>
  </section>
</template>

<style>
.m-vdddev { display: flex; flex-direction: column; gap: 12px; padding: 16px 20px; border-radius: 28px; background: var(--m-card); }
.m-vdddev__head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.m-vdddev__icon { flex: none; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 20px 12px 20px 12px; background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent); color: var(--md-sys-color-on-surface-variant); font-size: 30px; }
.m-vdddev.is-ready .m-vdddev__icon { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
.m-vdddev.is-degraded .m-vdddev__icon, .m-vdddev.is-missing .m-vdddev__icon { background: color-mix(in srgb, var(--md-sys-color-error) 14%, transparent); color: var(--md-sys-color-error); }
.m-vdddev__body { flex: 1 1 160px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.m-vdddev__title { font: var(--m-title-medium, 600 16px/24px sans-serif); color: var(--md-sys-color-on-surface); }
.m-vdddev__text { font: var(--m-body-medium, 400 14px/20px sans-serif); color: var(--md-sys-color-on-surface-variant); font-variant-numeric: tabular-nums; }
.m-vdddev__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.m-vdddev__live { display: flex; align-items: center; gap: 10px; padding-top: 4px; border-top: 1px solid var(--md-sys-color-outline-variant); padding-top: 12px; font: var(--m-body-medium, 400 14px/20px sans-serif); color: var(--md-sys-color-on-surface); }
.m-vdddev__dot { width: 10px; height: 10px; border-radius: 50%; background: var(--md-sys-color-outline); }
.m-vdddev__dot.is-live { background: var(--md-sys-color-primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--md-sys-color-primary) 22%, transparent); }
.m-vdddev__spacer { flex: 1 1 auto; }
.m-vdddev__keep { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.m-vdddev__keeptext { display: flex; flex-direction: column; gap: 2px; font: var(--m-title-small, 600 14px/20px sans-serif); color: var(--md-sys-color-on-surface); }
.m-vdddev__keeptext small { font: var(--m-body-small, 400 12px/16px sans-serif); color: var(--md-sys-color-on-surface-variant); }
</style>
