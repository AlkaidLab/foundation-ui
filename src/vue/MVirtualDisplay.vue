<script setup>
import { computed } from 'vue'
import MBanner from './MBanner.vue'
import MButton from './MButton.vue'
import MChip from './MChip.vue'
import MChoiceItem from './MChoiceItem.vue'
import MValueItem from './MValueItem.vue'
import MGroup from './MGroup.vue'
import MIcon from './MIcon.vue'
import MInfo from './MInfo.vue'
import MItem from './MItem.vue'
import MSection from './MSection.vue'
import MSeg from './MSeg.vue'
import MSwitchItem from './MSwitchItem.vue'
import { VDD_PREP, VDD_RULES, vddOn } from '../settings/virtualDisplay.js'
import { vddTexts } from '../settings/vddTexts.js'

// The virtual display as one control, for the settings page and for a home card: the mode first (physical display, a virtual
// one made on demand, a virtual one that stays), then the options of the mode by tier. `store` is `createVddStore(adapter)`:
// the same store in both places shares the state and the saving. The card variant is the mode, its status and a way to the rest.
//   slots: notice (what to say when the driver is missing), prep (the product's own picker for the physical display
//   handling, with the value and an update function), expert (the tier 3 rows the product draws itself)
const props = defineProps({
  store: { type: Object, required: true },
  variant: { type: String, default: 'settings' }, // settings | card
  locale: { type: String, default: 'en' },
  /** the settings page shows the advanced section only when the product gives it rows */
  title: { type: String, default: '' },
  /** which parts of the control a page draws (VDD_PARTS of settings/virtualDisplay.js): 'mode', 'options', 'output', 'prep', 'rules', 'expert'; null draws them all */
  parts: { type: Array, default: null },
})
const show = (name) => !props.parts || props.parts.includes(name)
const zhLocale = computed(() => String(props.locale).startsWith('zh'))
const emit = defineEmits(['more'])
const t = computed(() => vddTexts(props.locale))
const cfg = computed(() => props.store.config.value)
const mode = computed(() => props.store.mode.value)
const summary = computed(() => props.store.summary.value)
const virtual = computed(() => mode.value !== 'physical')
const ICONS = { physical: 'monitor', ondemand: 'screen_share', persistent: 'keep' }
const modeOptions = computed(() => props.store.modes.value.map((m) => ({ value: m.id, label: t.value.modes[m.id], icon: ICONS[m.id], disabled: m.disabled })))
const modeModel = computed({ get: () => mode.value, set: (value) => props.store.setMode(value, { save: save.value }) })
const driverMissing = computed(() => virtual.value && summary.value.driverReady === false)
const busy = (key) => !!props.store.busy[key]
// a card saves at once; the settings page leaves it to its own save bar
const save = computed(() => props.variant === 'card')
const apply = (patch) => props.store.set(patch, { save: save.value })

const boolKeyForms = new Set(['dynamic_resolution_follow_display'])
const flag = (key, def = false) => computed({
  get: () => (cfg.value[key] === undefined || cfg.value[key] === '' ? def : vddOn(cfg.value[key])),
  set: (on) => apply({ [key]: boolKeyForms.has(key) || typeof cfg.value[key] === 'boolean' ? on : on ? 'enabled' : 'disabled' }),
})
const shared = flag('vdd_reuse')
const headless = flag('vdd_headless_create')
const follow = flag('dynamic_resolution_follow_display', true)
const pick = (key, def, list) => computed({
  get: () => (list.includes(cfg.value[key]) ? cfg.value[key] : def),
  set: (value) => apply({ [key]: value }),
})
const prep = pick('display_device_prep', 'no_operation', VDD_PREP)
const resolution = pick('resolution_change', 'automatic', VDD_RULES)
const refresh = pick('refresh_rate_change', 'automatic', VDD_RULES)
const text = (key) => computed({ get: () => cfg.value[key] ?? '', set: (value) => apply({ [key]: value }) })
const manualResolution = text('manual_resolution')
const manualRefresh = text('manual_refresh_rate')
const display = computed({ get: () => (cfg.value.output_name && cfg.value.output_name !== 'ZakoHDR' ? cfg.value.output_name : ''), set: (value) => apply({ output_name: value }) })
const displayOptions = computed(() => [{ value: '', label: t.value.displayAuto }, ...props.store.displays.value.map((d) => ({ value: d.id, label: d.name }))])
const prepOptions = computed(() => VDD_PREP.map((value) => ({ value, label: t.value.preps[value] })))
const ruleOptions = computed(() => VDD_RULES.map((value) => ({ value, label: t.value.rules[value] })))
const cardChips = computed(() => [
  summary.value.shared && t.value.shared,
  summary.value.headless && t.value.headless,
  virtual.value && summary.value.prep !== 'no_operation' && t.value.preps[summary.value.prep],
].filter(Boolean))
</script>

<template>
  <section class="m-vdd" :class="`m-vdd--${variant}`" data-cfg="output_name" :aria-label="title || t.title">
    <div v-if="show('mode')" class="m-vdd__top">
      <svg class="m-vdd__art" viewBox="0 0 220 84" aria-hidden="true" focusable="false">
        <g class="m-vdd__mon" :class="{ 'is-on': !virtual }">
          <rect x="12" y="8" width="84" height="52" rx="9" /><path d="M44 70 h20 M54 60 v10" />
        </g>
        <path class="m-vdd__link" :class="{ 'is-on': virtual }" d="M100 34 H120" />
        <g class="m-vdd__mon m-vdd__mon--virtual" :class="{ 'is-on': virtual, 'is-dashed': mode === 'ondemand' && summary.active !== true, 'is-live': summary.active === true }">
          <rect x="124" y="8" width="84" height="52" rx="9" /><path d="M156 70 h20 M166 60 v10" />
        </g>
        <g v-if="mode === 'persistent'" class="m-vdd__pin"><circle cx="204" cy="12" r="10" /><path d="M200 8 l8 8 M206 6 l-4 8 M204 14 l-6 6" /></g>
      </svg>
      <div class="m-vdd__mode">
        <MSeg v-model="modeModel" block size="lg" :label="title || t.title" :options="modeOptions" :disabled="store.anyBusy.value" />
        <p v-if="t.modeText[mode]" class="m-vdd__text">{{ t.modeText[mode] }}</p>
        <p v-if="!store.canSaveProtected" class="m-vdd__text m-vdd__note"><MIcon name="info" />{{ t.trayMode }}</p>
        <p class="m-vdd__chips">
          <MChip v-if="summary.active !== null && virtual" :tone="summary.active ? 'ok' : 'neutral'" :icon="summary.active ? 'check_circle' : 'remove'">{{ summary.active ? t.active : t.inactive }}</MChip>
          <MChip v-if="summary.driverReady !== null && virtual" :tone="summary.driverReady ? 'ok' : 'warn'" :icon="summary.driverReady ? 'check_circle' : 'warning'">{{ summary.driverReady ? t.driverReady : t.driverMissing }}</MChip>
          <MChip v-if="store.anyBusy.value" tone="info" icon="sync">{{ t.busy }}</MChip>
        </p>
        <template v-if="variant === 'card'">
          <p v-if="cardChips.length" class="m-vdd__chips"><MChip v-for="chip in cardChips" :key="chip">{{ chip }}</MChip></p>
          <MSeg v-model="resolution" block size="sm" :label="t.resolution" :options="ruleOptions" data-vdd="resolution" />
          <MButton variant="text" size="sm" icon="tune" class="m-vdd__more" @click="emit('more')">{{ t.more }}</MButton>
        </template>
      </div>
    </div>
    <MBanner v-if="driverMissing && show('mode')" tone="warn" icon="warning"><slot name="notice">{{ t.driverMissing }}</slot></MBanner>
    <MBanner v-if="store.error.value" tone="error" icon="error">{{ t.saveFailed.replace('{error}', store.error.value) }}</MBanner>

    <template v-if="variant === 'settings'">
      <MGroup v-if="show('output') || show('options') || show('prep')">
        <MChoiceItem v-if="!virtual && show('output')" v-model="display" icon="monitor" :title="t.display" :options="displayOptions" data-cfg="output_name" :cancel-label="'×'" />
        <template v-if="virtual && show('options')">
          <MSwitchItem v-model="shared" icon="devices" :title="t.shared" :info="t.sharedText" data-cfg="vdd_reuse" :disabled="busy('vdd_reuse')" />
          <MSwitchItem v-model="headless" icon="desktop_access_disabled" :title="t.headless" :info="store.canSaveProtected ? t.headlessText : `${t.headlessText} ${t.trayOnly}`" data-cfg="vdd_headless_create" :disabled="!store.canSaveProtected || busy('vdd_headless_create')" />
        </template>
        <MChoiceItem v-if="!$slots.prep && show('prep')" v-model="prep" icon="display_settings" :title="t.prep" :options="prepOptions" data-cfg="display_device_prep" :cancel-label="'×'" />
      </MGroup>
      <slot v-if="show('prep')" name="prep" :value="prep" :update="(value) => (prep = value)" />
      <MGroup v-if="show('rules')">
        <MItem :title="t.resolution" icon="aspect_ratio" stack data-cfg="resolution_change">
          <template #control><MSeg v-model="resolution" block :label="t.resolution" :options="ruleOptions" /></template>
        </MItem>
        <MValueItem v-if="resolution === 'manual'" v-model="manualResolution" :label="t.manualResolution" placeholder="2560x1440" data-cfg="manual_resolution" :ok-label="zhLocale ? '确定' : 'OK'" :cancel-label="zhLocale ? '取消' : 'Cancel'" />
        <MItem :title="t.refresh" icon="speed" stack data-cfg="refresh_rate_change">
          <template #control><MSeg v-model="refresh" block :label="t.refresh" :options="ruleOptions" /></template>
        </MItem>
        <MValueItem v-if="refresh === 'manual'" v-model="manualRefresh" :label="t.manualRefresh" placeholder="59.95" data-cfg="manual_refresh_rate" :ok-label="zhLocale ? '确定' : 'OK'" :cancel-label="zhLocale ? '取消' : 'Cancel'" />
        <MSwitchItem v-model="follow" icon="sync" :title="t.follow" data-cfg="dynamic_resolution_follow_display" />
      </MGroup>
      <MSection v-if="$slots.expert && show('expert')" :title="t.advanced"><MGroup><slot name="expert" /></MGroup></MSection>
    </template>
  </section>
</template>
