<script setup>
// The four tiles at the top of 帮助与关于 (docs/help-tiles.md): 软件更新, 主机体检, 反馈问题, 客户端下载. One anatomy, the small tile of the overview: the header (glyph and name), one value,
// one state line, one action. The whole tile is the button; the action in the corner of it says what a press does. What each tile shows is helpTiles/model.js; the product hands in
// what it already knows and acts on the events:
//   update    { state: 'idle' | 'checking' | 'available' | 'latest' | 'error', installed, next, checkedAt }  the product's own update check; nothing here asks the network
//   doctor    the kept summary of the last check ({ at, counts, empty }), or leave it out: it is read from the storage MDoctor writes
//   feedback  { unread }  the replies not read yet (the reply channel; leave it out where there is none)
// Events: `check` (a press on an idle, up-to-date or failed update), `open-update` (a press on an available update: the product opens its sheet), `doctor`, `downloads`.
// 反馈问题 opens the feedback form itself (useErrors), and shows only where a form host is mounted, as the feedback row does.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MIcon from './MIcon.vue'
import { helpTiles, tileLabel } from '../helpTiles/model.js'
import { helpTileTexts } from '../helpTiles/texts.js'
import { doctorTexts, doctorAgo } from '../doctor/texts.js'
import { readDoctorSummary } from '../doctor/model.js'
import { useErrors } from './useErrors.js'
import { listMine } from '../devmode/mine.js'
import { recommendForOs } from '../clients/recommend.js'
import { osChipName } from '../clients/catalogue.js'
import { readOs } from '../clients/osChoice.js'

const props = defineProps({
  locale: { type: String, default: 'en' },
  update: { type: Object, default: () => ({ state: 'idle' }) },
  doctor: { type: Object, default: undefined },
  feedback: { type: Object, default: () => ({}) },
  /** the key MDoctor keeps its summary under */
  doctorKey: { type: String, default: 'foundation.doctor.last' },
  /** the logs a report carries, when the page has them */
  logs: { type: String, default: '' },
})
const emit = defineEmits(['check', 'open-update', 'doctor', 'downloads'])
const T = computed(() => helpTileTexts(props.locale))
const { state: errors, reportFeedback } = useErrors()
// the last doctor result is read when the page opens and when the window comes back (a check that ran on another page is finished by then)
const kept = ref(null)
const readKept = () => { try { kept.value = readDoctorSummary(globalThis.localStorage, props.doctorKey) } catch { kept.value = null } }
onMounted(() => { readKept(); window.addEventListener('focus', readKept) })
onBeforeUnmount(() => window.removeEventListener('focus', readKept))
const download = computed(() => {
  try { const os = readOs(); return { os: osChipName(os, props.locale), client: recommendForOs(os)?.client?.name || '' } } catch { return {} }
})
const tiles = computed(() => {
  const last = listMine().find((r) => r.ref && (r.status === 'sent' || r.status === 'queued')) || null
  const D = doctorTexts(props.locale)
  const all = helpTiles({
    update: props.update,
    doctor: props.doctor === undefined ? kept.value : props.doctor,
    feedback: { unread: props.feedback?.unread, last },
    downloads: download.value,
  }, T.value, (at) => doctorAgo(at, D))
  return errors.hosted > 0 ? all : all.filter((t) => t.id !== 'feedback')
})
function press(tile) {
  const k = tile.action.kind
  if (k === 'none') return
  if (tile.id === 'update') emit(k === 'open' ? 'open-update' : 'check')
  else if (tile.id === 'doctor') emit('doctor')
  else if (tile.id === 'feedback') reportFeedback({ logs: props.logs })
  else emit('downloads')
}
</script>

<template>
  <section class="m-helptiles" :aria-label="T.group" data-help-tiles>
    <ul class="m-helptiles__grid">
      <li v-for="tile in tiles" :key="tile.id" class="m-helptiles__cell">
        <button type="button" class="m-tile m-cal m-calm is-s m-helptile" :class="{ 'm-tile--tonal': tile.id === 'update' && tile.state === 'available', 'is-busy': tile.busy }" data-size="s" :data-accent="tile.accent || 'primary'" :data-help-tile="tile.id" :data-state="tile.state" :aria-label="tileLabel(tile)" :aria-busy="tile.busy || undefined" @click="press(tile)">
          <header class="m-calm__head"><MIcon :name="tile.icon" /><span class="m-calm__title">{{ tile.label }}</span></header>
          <div class="m-helptile__value"><b class="m-dnum" :class="{ 'has-accent': !!tile.accent && tile.id !== 'update' }" data-help-value>{{ tile.value }}</b><small v-if="tile.unit">{{ tile.unit }}</small></div>
          <p class="m-helptile__sub" data-help-sub><span class="m-helptile__main">{{ tile.sub }}</span><span v-if="tile.aux" class="m-helptile__aux">{{ tile.aux }}</span></p>
          <span class="m-tchip m-helptile__act" :class="{ 'm-tchip--accent': tile.action.kind === 'open' && tile.id === 'update', 'is-none': tile.action.kind === 'none' }" data-help-act>
            <MIcon v-if="tile.busy" class="m-helptile__spin" name="refresh" />
            <template v-else><span class="m-helptile__act-label">{{ tile.action.label }}</span><MIcon class="m-helptile__act-go" name="chevron_right" /></template>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>
