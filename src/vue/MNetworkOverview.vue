<script setup>
import MBreakText from './MBreakText.vue'
import { computed, ref } from 'vue'
import MIcon from './MIcon.vue'
import { usePageStamp } from './usePageStamp.js'
import MButton from './MButton.vue'
import MIconButton from './MIconButton.vue'
import MBanner from './MBanner.vue'
import { networkOverviewView, stunRows } from '../settings/networkOverview.js'
import { networkOverviewTexts } from '../settings/networkOverviewTexts.js'

// 系统 › 网络概览 in the style of 串流设置 › 网络 (MReachOverview): one calm list, a line per fact (adapters, public IPv4, public IPv6, NAT type, carrier NAT, UPnP, firewall)
// with a small icon and chip, the one sentence behind it and the address with a copy button; under a line, each thing the host said once. Colour is only the badge icon and the
// chip: the rows are plain neutral surfaces. Then the STUN servers as a closed table.
//   report: normalizeOverview(...) or null; status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'
//   emits: recheck, fix(action, row) (firewall, mesh, family, upnp ... are the product's to do)
const props = defineProps({
  report: { type: Object, default: null },
  status: { type: String, default: 'idle' },
  locale: { type: String, default: 'en' },
  copy: { type: Function, default: null },
})
const emit = defineEmits(['recheck', 'fix'])
const T = computed(() => networkOverviewTexts(props.locale))
const view = computed(() => networkOverviewView(props.report, props.locale))
const servers = computed(() => stunRows(props.report))
const loading = computed(() => props.status === 'loading')
// inside a page the time of the check is the page's stamp (header, trailing end); on its own the bar says it
const stamped = !!usePageStamp({ at: () => Date.parse(props.report?.checkedAt) || 0, refreshing: loading, refresh: () => emit('recheck'), locale: () => props.locale })
const copied = ref('')
let timer = 0
async function copyText(text) {
  try {
    if (props.copy) await props.copy(text)
    else await globalThis.navigator?.clipboard?.writeText(text)
    copied.value = text; clearTimeout(timer); timer = setTimeout(() => { copied.value = '' }, 1600)
  } catch { /* the text stays visible */ }
}
const NOTE_ICON = { problem: 'warning', good: 'check_circle', note: 'info' }
</script>

<template>
  <section class="m-reacho m-netov" :aria-busy="loading" :aria-label="T.label">
    <div class="m-reacho__bar">
      <small v-if="!stamped">{{ view?.checkedAt ? T.checkedAt.replace('{time}', view.checkedAt) : T.notChecked }}</small>
      <MButton variant="tonal" size="sm" icon="refresh" :loading="loading" @click="emit('recheck')">{{ loading ? T.checking : T.recheck }}</MButton>
    </div>
    <p v-if="view?.privacy" class="m-netov__privacy" data-code="privacy"><MIcon name="info" />{{ view.privacy }}</p>
    <MBanner v-if="status === 'unavailable'" tone="info" icon="info"><b>{{ T.unavailable }}</b> {{ T.unavailableText }}</MBanner>
    <MBanner v-else-if="status === 'error'" tone="error" icon="error">{{ T.failed }}</MBanner>

    <ul v-if="view" class="m-reacho__paths" role="list">
      <li v-for="row in view.rows" :key="row.id" class="m-reacho__path" :class="`is-${row.tone}`" :data-row="row.id" :data-verdict="row.verdict">
        <div class="m-reacho__row">
          <span class="m-reacho__ico" :title="row.word"><MIcon :name="row.icon" /><MIcon class="m-reacho__badge" :name="row.badge" fill /></span>
          <div class="m-reacho__main">
            <div class="m-reacho__title"><b>{{ row.title }}</b><span class="m-reacho__word">{{ row.word }}</span></div>
            <p v-if="row.fact" class="m-reacho__fact" data-redact="address">{{ row.fact }}</p>
          </div>
          <div v-if="row.address" class="m-reacho__addr">
            <code data-redact="address"><MBreakText :text="row.address" /></code>
            <MIconButton :icon="copied === row.address ? 'check' : 'content_copy'" :label="copied === row.address ? T.copied : T.copy.replace('{address}', row.address)" @click="copyText(row.address)" />
          </div>
        </div>
        <ul v-if="row.notes.length" class="m-reacho__notes" role="list">
          <li v-for="(note, i) in row.notes" :key="note.code || `${note.kind}${i}`" :class="`is-${note.kind}`" :data-code="note.code || undefined">
            <MIcon :name="note.kind === 'adapter' ? (note.up ? 'link' : 'link_off') : NOTE_ICON[note.kind]" />
            <span class="m-reacho__note" data-redact="address">{{ note.text }}</span>
            <MButton v-if="note.action && note.actionLabel" variant="text" size="sm" @click="emit('fix', note.action, note)">{{ note.actionLabel }}</MButton>
          </li>
        </ul>
        <details v-if="row.details.length" class="m-netov__more" :data-row="row.id">
          <summary><MIcon name="keyboard_arrow_down" />{{ T.details }}</summary>
          <ul class="m-reacho__notes" role="list">
            <li v-for="note in row.details" :key="note.code" class="is-note" :data-code="note.code"><MIcon name="info" /><span class="m-reacho__note" data-redact="address">{{ note.text }}</span></li>
          </ul>
        </details>
      </li>
    </ul>

    <details v-if="servers.length" class="m-reach__ports m-netov__stun">
      <summary><MIcon name="keyboard_arrow_down" />{{ T.stunTable }}</summary>
      <table>
        <thead><tr><th>{{ T.colFamily }}</th><th>{{ T.colServer }}</th><th>{{ T.colResult }}</th><th>{{ T.colMapped }}</th><th>{{ T.colRtt }}</th></tr></thead>
        <tbody>
          <tr v-for="s in servers" :key="`${s.family}${s.server}`" :data-family="s.family">
            <td>{{ s.family }}</td><td>{{ s.server }}<small v-if="s.address"> · {{ s.address }}</small></td>
            <td :class="s.answered ? 'is-allowed' : ''">{{ s.answered ? T.answered : T.errors[s.error] || s.error }}</td>
            <td>{{ s.mappedText }}</td><td>{{ s.answered ? `${s.rttMs} ms` : '' }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </section>
</template>
