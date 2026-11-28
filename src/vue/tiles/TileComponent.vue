<script>
export const tileIds = ['comp:*']
</script>

<script setup>
// 方形 shows the component icon, state and version. 中 adds the failing check and the check button.
// It reads the component status the window registered (status/controller.js), like the card it replaces; without one the state is 未知.
import { computed } from 'vue'
import MIcon from '../MIcon.vue'
import { COMPONENT_ICONS, componentStateAppearance } from '../../status/model.js'
import { registeredComponentStatus } from '../../status/controller.js'
import { statusTexts } from '../../status/texts.js'
import { designProps } from './tileData.js'

const props = defineProps(designProps)
defineEmits(['act'])
const cid = computed(() => props.card.data?.id || String(props.card.id).split(':')[1])
const size = computed(() => (props.card.size === 'm' ? 'm' : 's'))
const status = registeredComponentStatus()
const T = computed(() => (status ? status.text() : statusTexts('en')))
const row = computed(() => status?.row(cid.value) || { state: 'unknown', version: '', note: '', checks: [], checking: false })
const appearance = computed(() => componentStateAppearance(row.value.state))
const problem = computed(() => row.value.checks.find((c) => c.result === 'error' || c.result === 'warn'))
const sub = computed(() => (problem.value ? T.value.checks[problem.value.id] || '' : row.value.version ? `v${row.value.version}` : row.value.note || (row.value.state === 'unknown' ? T.value.unknownNote : '')))
// the short name on a square ('USB 转发', not 'Foundation USB 转发')
// and in the other languages: the kind of thing (driver, device, transport, layer) and the maker's name go, 'ViGEmBus virtual gamepad driver' is 'ViGEmBus' and 'Virtual microphone device' 'Virtual microphone'
const SHORT = { usb: 'USB/IP', vigem: 'ViGEmBus', mouse: 'Virtual mouse' }
const shorten = (n) => (SHORT[cid.value] && !/[一-鿿]/.test(n) ? SHORT[cid.value] : n.replace(/^Foundation\s+/i, '').replace(/\s+(driver|device|transport|layer|component)s?$/i, ''))
const name = computed(() => { const n = String(T.value.names?.[cid.value] || props.card.title); if (size.value !== 's') return n; return n.includes(' ') && /[一-鿿]/.test(n) ? n.slice(n.lastIndexOf(' ') + 1) : shorten(n) })
</script>

<template>
  <section class="m-tile m-cal m-b2 m-b2comp" :class="`is-${size}`" :data-state="row.state" :data-size="size" data-accent="primary">
    <header class="m-calm__head"><MIcon :name="COMPONENT_ICONS[cid]" /><span class="m-calm__title">{{ name }}</span><button v-if="status?.openPage" type="button" class="m-calm__more" :aria-label="T.title" @click.stop="status.openPage()"><MIcon name="chevron_right" /></button></header>
    <div :class="size === 'm' ? 'm-b2comp__body' : ''" :style="size === 's' ? 'display: contents' : ''">
      <div class="m-b2plate is-quiet" :data-tone="appearance.tone"><span class="m-b2__state"><MIcon :name="appearance.icon" /><b :title="T.states[row.state]">{{ T.states[row.state] }}</b></span></div>
      <div v-if="size === 'm'" class="m-b2comp__side"><span class="m-b2__line">{{ sub }}</span><button v-if="status" type="button" class="m-b2__btn is-tonal" style="align-self: flex-start" :disabled="row.checking" @click.stop="status.check(cid)"><MIcon name="monitor_heart" />{{ row.checking ? T.checking : T.check }}</button></div>
      <span v-else class="m-b2__cap" style="margin-top: 6px">{{ sub }}</span>
    </div>
  </section>
</template>
