<script setup>
import { computed, inject, ref } from 'vue'
import { nearestScrollTop } from '../tray/trayPager.js'
import MIcon from './MIcon.vue'
import MTrayTile from './MTrayTile.vue'
import MTraySliders from './MTraySliders.vue'
import MTrayLayoutEditor from './MTrayLayoutEditor.vue'
import { appIcon } from '../about/appicon.js'
import { ITEMS, PAGES, SUPPORT_ROW, gridCells, isChecked, isEnabled, labelOf as labelFor, pageTitle, shortOf as shortFor, statusWord, streamsText, textOf, tileViews, tx, vddName, vddText } from '../tray/trayModel.js'

// One row of the tray menu (MTrayMenu): the plain menu row, a page entry, and the richer rows of the three layouts. The words are the host's (labels of its native menu) and the layout's own
// (src/tray/trayTexts.js), in the language of the state.
const props = defineProps({ row: { type: Object, required: true }, state: { type: Object, required: true }, apply: { type: Function, default: null } })
const emit = defineEmits(['act', 'open', 'layout', 'done'])

const touch = inject('trayTouch', ref(false)) // touch density: what a tooltip would say is written on the button
const icon = appIcon(32, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
const s = computed(() => props.state)
const t = computed(() => tx(props.state))
const labelOf = (id) => labelFor(id, props.state)
const shortOf = (id) => shortFor(id, props.state)
const iconOf = (id) => ITEMS[id]?.icon || 'circle'
const enabled = (id) => isEnabled(id, props.state)
const checked = (id) => isChecked(id, props.state)
const act = (id) => { if (enabled(id)) emit('act', id) }
// the support line (last row of 帮助): chips run one id each, 赞助 opens the chooser of the three developers in place
const sponsorOpen = ref(false)
const CHIP_TEXT = { visit_site: 'site', visit_bilibili: 'bilibili', star_github: 'star' }
const chipText = (id) => t.value.support[CHIP_TEXT[id]]
const tone = computed(() => (s.value.connection !== 'connected' ? 'err' : s.value.host === 'streaming' ? 'ok' : 'idle'))
const updateText = computed(() => (s.value.update ? t.value.newVersionNamed(s.value.update.version) : t.value.upToDateNamed(s.value.update?.current || s.value.version || '')))
const tiles = computed(() => tileViews(props.state))
// the later pages' grid: pills, and the group that is open (one at a time)
const cells = computed(() => (props.row.t === 'grid' ? gridCells(props.row, props.state) : []))
const opened = ref('')
const grid = ref(null)
const fold = (group) => { opened.value = opened.value === group ? '' : group; if (opened.value) reveal(sheetId(group)) }
// A page that is as full as the card scrolls inside it while a group is open (MTrayMenu): the choices that came out under their pill are brought into view, vertically only, once the viewport scrolls.
function reveal(id) {
  let frames = 0
  const tick = () => {
    const el = grid.value?.querySelector(`#${id}`)
    const vp = el?.closest('.m-tray__viewport')
    if (!el || !vp) return
    if (vp.classList.contains('is-scroll')) {
      const v = vp.getBoundingClientRect(), r = el.getBoundingClientRect()
      const to = nearestScrollTop({ top: r.top, bottom: r.bottom + 8, viewTop: v.top, viewBottom: v.bottom, scrollTop: vp.scrollTop })
      if (to !== vp.scrollTop) vp.scrollTop = to
    } else if (++frames < 8) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
const sheetId = (group) => `m-tray-sheet-${group}`
const notification = computed(() => s.value.notification || '')
const row = computed(() => props.row)
const dot = computed(() => ({ ok: 'is-ok', err: 'is-err', idle: '' })[tone.value])
const stripIcon = computed(() => (tone.value === 'err' ? 'error' : s.value.host === 'streaming' ? 'cast_connected' : 'sensors'))
</script>

<template>
  <!-- V1: the small header -->
  <div v-if="row.t === 'header'" class="m-tray__head">
    <img class="m-tray__logo" :src="icon.src" :srcset="icon.srcset || undefined" width="28" height="28" alt="" draggable="false" />
    <div class="m-tray__head-text">
      <span class="m-tray__name">Sunshine</span>
      <span class="m-tray__sub"><i class="m-tray__dot-s" :class="dot" />{{ statusWord(s) }}<template v-if="s.sessions.length"> · {{ t.streamCount(s.sessions.length) }}</template></span>
    </div>
    <span v-if="s.ds5" class="m-tray__chip"><MIcon name="sports_esports" />{{ t.ds5 }}</span>
  </div>

  <!-- V2: the status card -->
  <div v-else-if="row.t === 'card'" class="m-tray__card">
    <div class="m-tray__card-top">
      <img class="m-tray__logo is-big" :src="icon.src" :srcset="icon.srcset || undefined" width="40" height="40" alt="" draggable="false" />
      <div class="m-tray__head-text">
        <span class="m-tray__name">Sunshine</span>
        <span class="m-tray__sub"><i class="m-tray__dot-s" :class="dot" />{{ statusWord(s) }}</span>
      </div>
      <span v-if="s.ds5" class="m-tray__chip"><MIcon name="sports_esports" />{{ t.ds5Connected }}</span>
    </div>
    <button v-if="notification" class="m-tray__line is-act" type="button" @click="act('tray_notification_action')"><MIcon name="notifications" /><span>{{ notification }}</span></button>
    <button v-if="s.connection === 'disconnected'" class="m-tray__line is-act" type="button" @click="act('recover_service')"><MIcon name="restart_alt" /><span>{{ labelOf('recover_service') }}</span></button>
    <ul class="m-tray__streams">
      <li v-for="(x, i) in s.sessions" :key="`${x.name}${i}`">
        <MIcon name="devices_other" />
        <span class="m-tray__st-name">{{ x.name }}<small>{{ x.app }}</small></span>
        <span class="m-tray__st-num"><b>{{ Number(x.bitrate).toFixed(1) }}</b> {{ t.mbps }}<br /><b>{{ x.fps }}</b> {{ t.fps }}</span>
      </li>
      <li v-if="!s.sessions.length" class="is-none"><MIcon name="devices_other" /><span class="m-tray__st-name">{{ t.noStreams }}<small>{{ t.noStreamsDetail }}</small></span></li>
    </ul>
    <div class="m-tray__zako" :class="{ 'is-off': !s.vdd.active }">
      <MIcon name="monitor" />
      <span class="m-tray__st-name">{{ vddName(s) }}<small>{{ vddText(s) }}</small></span>
      <button class="m-tray__ibtn" type="button" :title="labelOf('vdd_settings')" :aria-label="labelOf('vdd_settings')" @click="act('vdd_settings')"><MIcon name="tune" /><span v-if="touch" class="m-tray__ibtn-t">{{ t.display }}</span></button>
    </div>
    <button class="m-tray__update" :class="{ 'is-new': s.update }" type="button" @click="act('check_update')">
      <MIcon name="update" />
      <span>{{ updateText }}</span>
      <b>{{ s.update ? t.update : t.check }}</b>
    </button>
  </div>

  <!-- V3: the status strip -->
  <div v-else-if="row.t === 'strip'" class="m-tray__strip">
    <span class="m-tray__strip-dot" :class="dot"><MIcon :name="stripIcon" /></span>
    <span class="m-tray__strip-text"><b>{{ statusWord(s) }}</b><small>{{ streamsText(s) }}</small></span>
    <span v-if="s.ds5" class="m-tray__chip"><MIcon name="sports_esports" />{{ t.ds5 }}</span>
    <button v-if="notification" class="m-tray__line is-act" type="button" @click="act('tray_notification_action')"><MIcon name="notifications" /><span>{{ notification }}</span></button>
    <button v-if="s.connection === 'disconnected'" class="m-tray__line is-act" type="button" @click="act('recover_service')"><MIcon name="restart_alt" /><span>{{ labelOf('recover_service') }}</span></button>
  </div>

  <!-- V3: the tiles of the quick panel (ChromeOS quick settings): a 2-wide grid of pills. The icon part acts; a toggled tile is filled with the primary container; a chevron opens the page of the tile's settings -->
  <div v-else-if="row.t === 'tiles'" class="m-tray__tiles">
    <MTrayTile v-for="x in tiles" :key="x.id" :tile="x" :drill-title="x.drill ? pageTitle(x.drill, s, 'v3') : ''" @act="act" @open="emit('open', $event)" />
  </div>

  <!-- V3, the later pages: the same pills; a pill that holds several choices (语言, 配置, 项目) opens them in place under itself -->
  <div v-else-if="row.t === 'grid'" ref="grid" class="m-tray__tiles m-tray__grid">
    <template v-for="c in cells" :key="c.key">
      <MTrayTile :tile="c" :open="opened === c.group" :sheet="sheetId(c.group)" @act="act" @fold="fold" />
      <Transition v-if="c.group" name="m-tray-sheet">
        <div v-if="opened === c.group" :id="sheetId(c.group)" class="m-tray__sheet" :class="{ 'is-choice': c.choice }" :role="c.choice ? 'radiogroup' : 'group'" :aria-label="c.label">
          <button v-for="x in c.items" :key="x.id" class="m-tray__btn" :class="{ 'is-on': x.on, 'is-danger': x.danger }" type="button" :role="c.choice ? 'radio' : undefined" :aria-checked="c.choice ? x.on : undefined" :disabled="x.disabled" :title="x.name" @click="act(x.act)">
            <MIcon :name="c.choice && x.on ? 'check' : x.icon" />{{ x.label }}
          </button>
        </div>
      </Transition>
    </template>
  </div>

  <!-- V3: the layout editor (the pencil) -->
  <MTrayLayoutEditor v-else-if="row.t === 'editor'" compact :layout="state.layout" :state="state" @update:layout="emit('layout', $event)" @done="emit('done')" />

  <!-- V3: resolution, refresh rate, scale, bitrate cap -->
  <MTraySliders v-else-if="row.t === 'sliders'" :row="row" :state="state" :apply="apply" />

  <!-- V3: language as a segmented choice -->
  <div v-else-if="row.t === 'seg'" class="m-tray__seg" role="radiogroup">
    <button v-for="id in row.ids" :key="id" class="m-tray__segb" :class="{ 'is-on': checked(id) }" type="button" role="radio" :aria-checked="checked(id)" @click="act(id)"><MIcon v-if="checked(id)" name="check" />{{ labelOf(id) }}</button>
  </div>

  <!-- the display's state at the head of the display page -->
  <div v-else-if="row.t === 'vddcard'" class="m-tray__vdd">
    <MIcon name="monitor" fill />
    <span class="m-tray__st-name">{{ vddName(s) }}<small>{{ vddText(s) }}</small></span>
    <span class="m-tray__chip" :class="s.vdd.active ? 'is-ok' : ''">{{ s.vdd.active ? t.running : t.vddOff }}</span>
  </div>

  <!-- restart | quit -->
  <div v-else-if="row.t === 'actions'" class="m-tray__actions">
    <button v-for="id in row.ids" :key="id" class="m-tray__btn" :class="{ 'is-danger': ITEMS[id].danger }" type="button" :disabled="!enabled(id)" @click="act(id)"><MIcon :name="iconOf(id)" />{{ labelOf(id) }}</button>
  </div>

  <!-- the support line: small neutral chips, one quiet line; 赞助 opens the chooser of the three developers under it -->
  <div v-else-if="row.t === 'support'" class="m-tray__support" role="group" :aria-label="t.support.label">
    <div class="m-tray__supchips">
      <button v-for="id in SUPPORT_ROW.chips" :key="id" class="m-tray__supchip" type="button" :data-id="id" :aria-label="labelOf(id)" @click="act(id)"><MIcon :name="iconOf(id)" />{{ chipText(id) }}</button>
      <button class="m-tray__supchip" :class="{ 'is-open': sponsorOpen }" type="button" data-id="sponsor" aria-haspopup="true" :aria-expanded="sponsorOpen" @click="sponsorOpen = !sponsorOpen"><MIcon name="favorite" />{{ t.support.sponsor }}</button>
    </div>
    <div v-if="sponsorOpen" class="m-tray__supchips m-tray__supchips--sponsors" role="group" :aria-label="t.support.sponsors">
      <button v-for="id in SUPPORT_ROW.sponsors" :key="id" class="m-tray__supchip" type="button" :data-id="id" @click="act(id)">{{ labelOf(id) }}</button>
    </div>
  </div>

  <div v-else-if="row.t === 'divider'" class="m-tray__divider" role="separator" />

  <!-- a drill-in entry -->
  <button v-else-if="row.t === 'page'" class="m-tray__row is-page" :class="{ 'is-more': row.more }" type="button" role="menuitem" aria-haspopup="menu" @click="emit('open', row.to)">
    <MIcon class="m-tray__lead" :name="PAGES[row.to].icon" />
    <span class="m-tray__label">{{ pageTitle(row.to, s) }}<small v-if="textOf(row, s) && !row.inline">{{ textOf(row, s) }}</small></span>
    <span v-if="row.inline" class="m-tray__end-text">{{ textOf(row, s) }}</span>
    <MIcon class="m-tray__end" name="chevron_right" />
  </button>

  <!-- an item -->
  <button v-else class="m-tray__row" :class="{ 'is-danger': ITEMS[row.id].danger, 'is-on': row.check === 'radio' && checked(row.id) }" type="button" :role="row.check === 'radio' ? 'menuitemradio' : row.check ? 'menuitemcheckbox' : 'menuitem'" :aria-checked="row.check ? checked(row.id) : undefined" :disabled="!enabled(row.id)" @click="act(row.id)">
    <MIcon class="m-tray__lead" :name="iconOf(row.id)" />
    <span class="m-tray__label">{{ row.id === 'tray_notification_action' && notification ? notification : labelOf(row.id) }}<small v-if="row.id === 'check_update' && !s.update">{{ t.upToDate }}</small></span>
    <span v-if="row.badge === 'update' && s.update" class="m-tray__badge" :title="updateText">{{ t.newVersion }} {{ s.update.version }}</span>
    <span v-if="row.check === true" class="m-tray__switch" :class="{ 'is-on': checked(row.id) }" aria-hidden="true"><i /></span>
    <MIcon v-else-if="row.check === 'radio' && checked(row.id)" class="m-tray__end" name="check" />
  </button>
</template>
