<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import MButton from '../MButton.vue'
import DevIssueReader from './DevIssueReader.vue'
import MSeg from '../MSeg.vue'
import DmChip from './DevChip.vue'
import { sharedGithubClient, ago } from '../../devmode/github.js'
import { DEV_REPOS, repoOf, repoSlug, visibleRepos, DEFAULT_REPO } from '../../devmode/repos.js'
import { listMine } from '../../devmode/mine.js'
import { devmodeTexts, fillText } from '../../devmode/texts.js'
import { useDevAccount } from './useDevAccount.js'
import { useDevActivity } from './useDevActivity.js'
import { usePageStamp } from '../usePageStamp.js'
import { openDevReport, openDevSignIn } from './devReport.js'

// Issue 与 PR of the five repositories this product is built from: the public read of GitHub (no account), cached five minutes. The item is what is read, so it gets the room (Material 3 list-detail):
// from a window `sideAt` wide the list (a compact column once an item is open) and the item sit side by side and the item has the rest; below that the item replaces the list, with a back chip. While an item is open
// the shell's own list pane (the developer pages) folds away (scene.focus) and the head, the tabs and the filters give their room too. 全屏阅读 hides the list column as well. The account chip leads to the sign-in; the feedback button to the report.
const props = defineProps({
  locale: { type: String, default: 'zh' },
  client: { type: Object, default: null },
  repo: { type: String, default: DEFAULT_REPO },
  tab: { type: String, default: 'issue' },
  openUrl: { type: Function, default: null },
  /** the width (px) of the window from which the list and the item sit side by side (inside a shell); a page that is not in one uses its own width, `splitAt` */
  sideAt: { type: Number, default: 1600 },
  splitAt: { type: Number, default: 1000 },
})
const emit = defineEmits(['notify'])
const connect = () => openDevSignIn()
const feedback = () => openDevReport({ kind: 'feedback', repo: repo.value === 'all' ? '' : repo.value })
const T = computed(() => devmodeTexts(props.locale))
const account = useDevAccount()
const gh = props.client || sharedGithubClient()
const activity = useDevActivity()

const tab = ref(props.tab)
const repo = ref(props.repo)
const state = ref('open')
const query = ref('')
const rows = ref([])
const status = ref({ state: 'ok', resetAt: 0, resetKnown: false, at: 0, stale: false, fromCache: false, status: 0 })
const loading = ref(false)
const selected = ref('')
const mine = ref(listMine())
// the time of the last read is drawn once, at the trailing end of the page header (MPage); clicking it reads again
usePageStamp({ at: () => status.value.at, refreshing: loading, refresh: () => load(true), locale: () => props.locale })

const repos = computed(() => visibleRepos({ signedIn: account.signedIn.value }))
const scene = inject('m-scene', null)
const ownWide = ref(false)
const wide = computed(() => (scene?.width ? scene.width.value >= props.sideAt : ownWide.value))
const root = ref(null)
let observer = null
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    observer = new ResizeObserver(() => { ownWide.value = (root.value?.clientWidth || 0) >= props.splitAt })
    observer.observe(root.value)
  }
  load(false)
  activity.markSeen()
})
onBeforeUnmount(() => { observer?.disconnect(); activity.markSeen(); if (scene?.focus) scene.focus.value = false })

let token = 0
async function load(force) {
  if (tab.value === 'mine') { mine.value = listMine(); return }
  const mark = ++token
  loading.value = true
  const kind = tab.value === 'pr' ? 'pr' : 'issue'
  const ids = repo.value === 'all' ? repos.value.map((r) => r.id) : [repo.value]
  const results = await Promise.all(ids.map((id) => gh.list(id, kind, { state: state.value === 'closed' ? 'closed' : 'open', force })))
  if (mark !== token) return
  const states = results.map((r) => r.state)
  const rate = results.find((r) => r.state === 'rate')
  const worst = rate ? 'rate' : states.every((s) => s === 'offline') ? 'offline' : states.find((s) => s === 'forbidden' || s === 'auth' || s === 'error' || s === 'offline') || 'ok'
  const withData = results.filter((r) => r.items.length || r.state === 'ok')
  status.value = { state: worst, resetAt: rate?.resetAt || 0, resetKnown: !!rate?.resetKnown, at: Math.max(0, ...results.map((r) => r.at || 0)), stale: results.some((r) => r.stale), fromCache: results.every((r) => r.fromCache), status: results.find((r) => r.status)?.status || 0, host: results.find((r) => r.host)?.host || '', reason: results.find((r) => r.reason)?.reason || '' }
  rows.value = withData.flatMap((r) => r.items).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  loading.value = false
  if (!rows.value.find((r) => r.key === selected.value)) selected.value = ''
}
watch([tab, repo, state, repos], () => { selected.value = ''; load(false) })

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((r) => r.title.toLowerCase().includes(q) || String(r.n) === q.replace('#', '') || r.labels.some((l) => l.toLowerCase().includes(q)))
})
const current = computed(() => shown.value.find((r) => r.key === selected.value) || (wide.value ? shown.value[0] : null) || null)
const showDetail = computed(() => tab.value !== 'mine' && !!current.value && (wide.value || !!selected.value))
// reading: an item the person opened. The head, the tabs and the filters give the room to it, and the shell's list pane folds away; a wide window shows the list as a compact column beside it (or not at all: 全屏阅读),
// a narrower one the item alone
const reading = computed(() => tab.value !== 'mine' && !!selected.value && !!current.value)
const full = ref(false)
const showList = computed(() => tab.value === 'mine' || !reading.value || (wide.value && !full.value))
// a scene that is not wide enough for list and detail (a single pane) has no list pane to fold
watch(reading, (on) => { if (scene?.focus) scene.focus.value = on; if (!on) full.value = false }, { immediate: true })
if (scene?.focus) watch(scene.focus, (on) => { if (!on && selected.value) selected.value = '' })
// the list keeps its place while an item is read
let listAt = 0
const pane = () => root.value?.closest?.('.m-scene__pane') || null
// the focus follows the reading: to the way back when an item opens, to its row in the list when it closes (a row that is gone leaves the focus nowhere)
const pick = (row) => { if (!selected.value) listAt = pane()?.scrollTop || 0; selected.value = row.key; nextTick(() => { const p = pane(); if (p && !wide.value) p.scrollTop = 0; root.value?.querySelector('[data-dev="issue-back"], [data-dev="issue-close"]')?.focus({ preventScroll: true }) }) }
const closeReader = () => { const key = selected.value; selected.value = ''; full.value = false; nextTick(() => { const p = pane(); if (p) p.scrollTop = listAt; [...(root.value?.querySelectorAll('.dm-lrow') || [])].find((el) => el.dataset.key === key)?.focus({ preventScroll: true }) }) }
// Esc closes the item that is open (before the shell takes it as a step back); not while something is typed or a dialog is open
const onEsc = (event) => {
  if (event.key !== 'Escape' || event.defaultPrevented || !reading.value || document.querySelector('dialog[open]')) return
  const t = event.target
  if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.tagName.startsWith('MD-'))) return
  event.preventDefault(); event.stopPropagation(); closeReader()
}
onMounted(() => window.addEventListener('keydown', onEsc, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc, true))
const tabOptions = computed(() => [{ value: 'issue', label: T.value.tabs.issue }, { value: 'pr', label: T.value.tabs.pr }, { value: 'mine', label: `${T.value.tabs.mine}${mine.value.length ? `  ${mine.value.length}` : ''}` }])
const countOf = (id) => (repo.value === id || repo.value === 'all' ? rows.value.filter((r) => r.repo === id).length : '')
const placeholder = computed(() => (repo.value === 'all' ? fillText(T.value.searchAll, { n: repos.value.length }) : fillText(T.value.searchIn, { where: repoSlug(repo.value) })))

const stateIcon = (i) => (i.kind === 'pr' ? (i.state === 'merged' ? 'merge' : i.state === 'draft' ? 'draft' : 'call_split') : (i.state === 'closed' ? 'check_circle' : 'adjust'))
const when = (iso) => ago(iso, { locale: props.locale })
// "1 comment" in the two languages that are written out; the other languages keep their own plural-neutral wording
const commentsLabel = (n) => (n === 1 && /^(zh|en)/i.test(String(props.locale)) ? T.value.commentOne : fillText(T.value.comments, { n }))

const stamp = computed(() => {
  if (status.value.state === 'offline' && !status.value.at) return { warn: true, text: T.value.stampOffline }
  if (['offline', 'rate', 'error', 'auth'].includes(status.value.state) || status.value.stale) return { warn: true, text: fillText(T.value.stampCache, { ago: ago(new Date(status.value.at || Date.now()).toISOString(), { locale: props.locale }) }) }
  return { warn: false, text: account.signedIn.value ? T.value.stampOk : T.value.stampPublic }
})
// when the GitHub allowance comes back, from x-ratelimit-reset; no line when the time is only a guess
const resetLine = computed(() => {
  const s = status.value
  if (s.state !== 'rate' || !s.resetKnown || !s.resetAt) return ''
  const minutes = Math.ceil((s.resetAt - Date.now()) / 60000)
  return minutes <= 1 ? T.value.rateSoon : fillText(T.value.rateReset, { m: minutes })
})
const note = computed(() => {
  const s = status.value
  const t = T.value
  const signed = account.signedIn.value
  if (s.state === 'rate') return { icon: 'schedule', text: signed ? t.rateNoteSigned : t.rateNote, sub: resetLine.value, action: signed ? '' : t.connect, connect: !signed }
  // the host that could not be reached and the engine's own words: 离线 is only a guess, this is what was asked and what came back
  if (s.state === 'offline') return { icon: 'cloud_off', text: s.at ? fillText(t.offlineText, { ago: ago(new Date(s.at).toISOString(), { locale: props.locale }) }) : t.offlineNone, sub: [s.host ? fillText(t.offlineHost, { host: s.host }) : '', s.reason].filter(Boolean).join(' · '), action: t.retry }
  if (s.state === 'forbidden') return { icon: 'lock', text: t.forbiddenText, action: signed ? '' : t.connect, connect: !signed }
  if (s.state === 'auth') return { icon: 'lock', text: t.authText, action: t.reconnect, connect: true }
  if (s.state === 'error') return { icon: 'error', text: fillText(t.errorText, { status: s.status || '—' }), action: t.retry }
  return null
})
const emptyText = computed(() => ({ rate: T.value.rateTitle, offline: T.value.emptyNone, forbidden: T.value.emptyNone, auth: T.value.emptyNone }[status.value.state] || (tab.value === 'pr' ? T.value.emptyPr : T.value.emptyIssues)))
const onNote = () => { if (note.value?.connect) connect(); else load(true) }

const open = (url) => { if (props.openUrl) props.openUrl(url); else if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener') }
const mineIcon = (m) => ({ published: 'check_circle', saved: 'download', queued: 'schedule' }[m.status] || 'edit_note')
const mineText = (m) => (m.status === 'published' ? fillText(T.value.mineSent, { n: m.n }) : m.status === 'saved' ? T.value.mineSaved : T.value.mineQueued)
defineExpose({ load, rows, status })
</script>

<template>
  <div ref="root" class="dm-issues" :class="{ 'dm-issues--wide': wide, 'dm-issues--reading': reading, 'dm-issues--full': reading && full }" data-dev="issues">
    <div v-if="!reading" class="dm-account" :class="stamp.warn && 'dm-account--warn'">
      <span class="dm-account__av" :class="!account.signedIn.value && 'dm-account__av--off'"><MIcon v-if="!account.signedIn.value" name="person" /><template v-else>{{ (account.login.value || '?').slice(0, 1).toUpperCase() }}</template></span>
      <span class="dm-account__body">
        <span class="dm-account__name">{{ account.signedIn.value ? fillText(T.signedAs, { login: account.login.value }) : T.signedOut }}</span>
        <span class="dm-account__sub">{{ account.signedIn.value ? T.signedSub : T.signedOutSub }}</span>
      </span>
      <span class="dm-account__stamp"><i />{{ stamp.text }}</span>
      <span class="dm-account__acts">
        <MButton variant="text" icon="refresh" size="sm" :disabled="loading || note?.disabled" @click="load(true)">{{ T.refresh }}</MButton>
        <MButton v-if="!account.signedIn.value" variant="tonal" icon="login" size="sm" data-dev="issues-connect" @click="connect()">{{ T.connect }}</MButton>
        <MButton variant="filled" icon="feedback" size="sm" data-dev="issues-feedback" @click="feedback()">{{ T.sendFeedback }}</MButton>
      </span>
    </div>
    <div v-if="note && !reading" class="dm-note" data-dev="issues-note"><MIcon :name="note.icon" fill /><span class="dm-note__text"><span>{{ note.text }}</span><small v-if="note.sub" class="dm-note__sub" data-dev="issues-note-sub">{{ note.sub }}</small></span><MButton v-if="note.action" :variant="note.connect ? 'tonal' : 'text'" :icon="note.connect ? 'login' : ''" size="sm" data-dev="issues-note-action" @click="onNote">{{ note.action }}</MButton></div>
    <MSeg v-if="!reading" v-model="tab" block :label="T.tabs.issue" :options="tabOptions" />
    <template v-if="tab !== 'mine' && !reading">
      <div class="dm-chips">
        <DmChip :label="T.allRepos" :pressed="repo === 'all'" @click="repo = 'all'" />
        <DmChip v-for="r in repos" :key="r.id" :label="r.name" :icon="r.private ? 'lock' : ''" :pressed="repo === r.id" :count="countOf(r.id)" @click="repo = r.id" />
      </div>
      <div class="dm-bar">
        <label class="dm-search"><MIcon name="search" /><input v-model="query" type="search" :placeholder="placeholder" :aria-label="T.search"></label>
        <DmChip :label="T.open" :pressed="state === 'open'" @click="state = 'open'" />
        <DmChip :label="T.closed" :pressed="state === 'closed'" @click="state = 'closed'" />
      </div>
    </template>

    <div class="dm-issues__body">
      <div v-if="showList" class="dm-issues__list" :class="{ 'dm-issues__list--busy': loading }">
        <template v-if="tab !== 'mine'">
          <button v-for="i in shown" :key="i.key" type="button" class="dm-lrow" :data-key="i.key" :aria-current="current && current.key === i.key ? 'true' : 'false'" @click="pick(i)">
            <span class="dm-state" :class="`dm-state--${i.state}`"><MIcon :name="stateIcon(i)" /></span>
            <span class="dm-lrow__main">
              <span class="dm-lrow__t">{{ i.title }}</span>
              <span class="dm-meta"><span class="dm-mono">#{{ i.n }}</span><span v-if="repo === 'all'">{{ repoOf(i.repo).name }}</span><span>{{ i.who }}</span><span>{{ when(i.at) }}</span><span v-if="i.comments">{{ commentsLabel(i.comments) }}</span></span>
            </span>
          </button>
          <p v-if="!shown.length && !loading" class="dm-empty">{{ emptyText }}</p>
          <p v-if="loading && !shown.length" class="dm-empty">{{ T.loading }}</p>
        </template>
        <template v-else>
          <button v-for="m in mine" :key="m.id" type="button" class="dm-lrow" @click="m.url && open(m.url)">
            <span class="dm-state" :class="m.status === 'published' ? '' : 'dm-state--draft'"><MIcon :name="mineIcon(m)" /></span>
            <span class="dm-lrow__main"><span class="dm-lrow__t">{{ m.title }}</span><span class="dm-meta"><span>{{ repoSlug(m.repo) }}</span><span>{{ mineText(m) }}</span><span>{{ when(m.at) }}</span></span></span>
          </button>
          <p v-if="!mine.length" class="dm-empty">{{ T.emptyMine }}</p>
        </template>
      </div>
      <DevIssueReader v-if="showDetail" :item="current" :client="gh" :locale="locale" :open-url="openUrl" :back="!wide" :closable="reading" :full="full" :can-full="wide && reading" @close="closeReader" @update:full="(v) => (full = v)" @notify="(text) => emit('notify', text)" />
      <div v-else-if="wide && tab !== 'mine'" class="dm-detail dm-detail--empty"><MIcon name="inbox" /><span>{{ T.pickOne }}</span></div>
    </div>
  </div>
</template>
