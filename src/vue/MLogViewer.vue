<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import MMenuChip from './MMenuChip.vue'
import MChartX from './MChartX.vue'
import { afterFirstPaint } from './afterFirstPaint.js'
import { diagnosticsTexts } from '../diagnostics/texts.js'
import { fillText } from './guideTexts.js'
import { errorsPerHour, filterRows, findSessions, firstError, groupRepeats, levelCounts, levelTone, rangeStart, rowText, selectionText, sessionSummary, ungrouped } from '../diagnostics/logs.js'
import { parseRecords } from '../diagnostics/adapters.js'
import { attributeOf, recordsToRows } from '../diagnostics/record.js'
import { registerContext } from '../contextmenu/registry.js'

// The log viewer of both products: live tail, level chips, text / whole-line / regex search, time range, one session at a time (with its
// numbers above the matching lines), repeats grouped, first error, selection and copy, line wrap. The product feeds the text and owns
// the polling (`live` says whether it should); the viewer only reads and shows.
const props = defineProps({
  text: { type: String, default: '' },
  /** normalized records, when the product already merged several sources; otherwise text is parsed */
  records: { type: Array, default: null },
  live: { type: Boolean, default: false },
  locale: { type: String, default: 'en' },
  texts: { type: Object, default: null },
  /** (session summary) => [{ label, value }] | null : live numbers of a running session; past sessions have only what the log says */
  statsFor: { type: Function, default: null },
  height: { type: String, default: 'min(64vh, 640px)' },
  /** take the whole height of the place it sits in (the log's own view): the bars stay put, the lines scroll */
  fill: { type: Boolean, default: false },
  /** the product has asked for the log and has no text yet: the lines are drawn as a skeleton instead of 「no lines」, which would turn into lines a moment later */
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:live', 'rows'])
const T = computed(() => diagnosticsTexts(props.locale, props.texts))

const query = ref('')
const mode = ref('text')
const ignoreCase = ref(true)
const range = ref('all')
const session = ref(null)
const levels = ref(new Set())
// a log is read for problems: with no level picked the debug and verbose lines stay out, and one choice in the level menu shows all of them
const quiet = ref(true)
const QUIET_LEVELS = ['Fatal', 'Error', 'Warning', 'Info']
const domain = ref(null)
const source = ref(null)
const file = ref(null)
const group = ref(true)
const wrap = ref(false)
const follow = ref(true)
// the page opens on the tail of the log (follow mode): 500 lines are laid out at the first mount, not 1500 (one task of 63 ms at 1500 before the scroll was moved past the mount task: parse, render, layout); 「显示更早」 adds 1000
const LIMIT_FIRST = 500
const LIMIT_STEP = 1000
const limit = ref(LIMIT_FIRST)
const selected = ref(new Set())
const copiedKind = ref('')
const scroller = ref(null)

const parsed = computed(() => (Array.isArray(props.records) ? props.records : parseRecords(props.text)))
const rows = computed(() => recordsToRows(parsed.value))
const sessions = computed(() => findSessions(rows.value))
watch(rows, (r) => emit('rows', r), { immediate: true })
const counts = computed(() => levelCounts(rows.value))
const domains = computed(() => {
  const counts = new Map()
  for (const record of parsed.value) if (record.domain) counts.set(record.domain, (counts.get(record.domain) || 0) + 1)
  return [...counts.entries()].map(([id, count]) => ({ id, count }))
})
const domainLabel = (id) => T.value['domain' + id.charAt(0).toUpperCase() + id.slice(1)] || id
const sources = computed(() => {
  const counts = new Map()
  for (const record of parsed.value) { const id = record.source?.id; if (id) counts.set(id, (counts.get(id) || 0) + 1) }
  return [...counts.entries()].map(([id, count]) => ({ id, count }))
})
const files = computed(() => {
  const counts = new Map()
  for (const record of parsed.value) { const id = attributeOf(record, 'panel.file'); if (id) counts.set(String(id), (counts.get(String(id)) || 0) + 1) }
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => a.id.localeCompare(b.id))
})
const sourceLabel = (id) => (id === 'host-text' ? T.value.sourceHost : id === 'panel' ? T.value.sourcePanel : id)
const filtered = computed(() => filterRows(rows.value, {
  levels: levels.value.size ? levels.value : quiet.value ? new Set(QUIET_LEVELS) : levels.value, query: query.value, mode: mode.value, ignoreCase: ignoreCase.value, from: rangeStart(rows.value, range.value), session: session.value,
  domains: domain.value ? [domain.value] : null,
  sources: source.value ? [source.value] : null,
  files: file.value ? [file.value] : null,
}))
const items = computed(() => (group.value ? groupRepeats(filtered.value.rows) : ungrouped(filtered.value.rows)))
const shown = computed(() => items.value.slice(Math.max(0, items.value.length - limit.value)))
const hidden = computed(() => items.value.length - shown.value.length)
const badRegex = computed(() => filtered.value.error)
const summary = computed(() => (session.value === null || !sessions.value[session.value] ? null : sessionSummary(rows.value, sessions.value[session.value])))
const stats = computed(() => (summary.value && props.statsFor ? props.statsFor(summary.value) : null))

// Errors per hour (Error and Fatal lines), from the first to the last hour the log covers, at most the last 48 hours
const hourly = computed(() => errorsPerHour(parsed.value))
// In-page search: the matches in a line are marked
const hiRe = computed(() => {
  const q = query.value
  if (!q) return null
  try { return new RegExp(mode.value === 'regex' ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ignoreCase.value ? 'gi' : 'g') } catch { return null }
})
function parts(text) {
  const re = hiRe.value
  if (!re) return [{ t: text }]
  const out = []
  let last = 0
  re.lastIndex = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m[0] === '') { re.lastIndex++; continue }
    if (m.index > last) out.push({ t: text.slice(last, m.index) })
    out.push({ t: m[0], hit: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: text.slice(last) })
  return out
}
const when = (ms) => (ms ? new Date(ms).toLocaleString() : '')
const length = (ms) => { const s = Math.round(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : m ? `${m}m ${s % 60}s` : `${s}s` }
const summaryLines = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: T.value.started, value: when(s.startAt) },
    s.live ? { label: T.value.ended, value: T.value.stillRunning } : { label: T.value.ended, value: when(s.endAt) },
    { label: T.value.duration, value: length(s.durationMs) },
    { label: T.value.lineCount, value: String(s.lines) },
    { label: T.value.errorsCount, value: String((s.counts.Error || 0) + (s.counts.Fatal || 0)) },
    { label: T.value.warningsCount, value: String(s.counts.Warning || 0) },
    ...(stats.value || []),
  ]
})

const rangeOptions = computed(() => [{ value: 'all', label: T.value.all }, { value: '15m', label: T.value.r15m }, { value: '1h', label: T.value.r1h }, { value: '6h', label: T.value.r6h }, { value: '24h', label: T.value.r24h }])
const modeOptions = computed(() => [{ value: 'text', label: T.value.text }, { value: 'exact', label: T.value.exact }, { value: 'regex', label: T.value.regex }])
// the menus of the one row
const errorCount = computed(() => counts.value.filter((c) => levelTone(c.level) === 'error').reduce((n, c) => n + c.count, 0))
const warnCount = computed(() => counts.value.filter((c) => levelTone(c.level) === 'warn').reduce((n, c) => n + c.count, 0))
const levelLabel = computed(() => (levels.value.size === 0 ? (quiet.value ? T.value.quietLevels : T.value.allLevels) : levels.value.size <= 2 ? [...levels.value].join(', ') : fillText(T.value.nLevels, { n: levels.value.size })))
const levelItems = computed(() => [
  { id: '__quiet', label: T.value.quietLevels, checked: levels.value.size === 0 && quiet.value },
  { id: '__all', label: T.value.allLevels, checked: levels.value.size === 0 && !quiet.value },
  { id: '', divider: true },
  ...counts.value.map((c) => ({ id: c.level, label: c.level, count: c.count, checked: levels.value.has(c.level), keepOpen: true })),
])
const rangeLabel = computed(() => (rangeOptions.value.find((o) => o.value === range.value) || rangeOptions.value[0]).label)
const rangeItems = computed(() => rangeOptions.value.map((o) => ({ id: o.value, label: o.label, checked: o.value === range.value })))
const sourceChipLabel = computed(() => (source.value ? sourceLabel(source.value) : T.value.allSources))
const sourceItems = computed(() => [{ id: '', label: T.value.allSources, count: rows.value.length, checked: source.value === null }, ...sources.value.map((x) => ({ id: x.id, label: sourceLabel(x.id), count: x.count, checked: source.value === x.id }))])
const fileItems = computed(() => [{ id: '', label: T.value.allFiles, count: rows.value.length, checked: file.value === null }, ...files.value.map((x) => ({ id: x.id, label: x.id, count: x.count, checked: file.value === x.id }))])
const domainItems = computed(() => [{ id: '', label: T.value.allDomains, checked: domain.value === null }, ...domains.value.map((x) => ({ id: x.id, label: domainLabel(x.id), count: x.count, checked: domain.value === x.id }))])
const sessionItems = computed(() => [{ id: -1, label: T.value.allSessions, checked: session.value === null }, ...sessions.value.slice(-8).map((x) => ({ id: x.id, label: sessionLabel(x), checked: session.value === x.id }))])
const searchItems = computed(() => [
  ...modeOptions.value.map((o) => ({ id: `mode:${o.value}`, label: o.label, checked: mode.value === o.value, keepOpen: true })),
  { id: '', divider: true }, { id: 'case', label: T.value.ignoreCase, checked: ignoreCase.value, keepOpen: true },
])
const moreItems = computed(() => [
  { id: 'live', label: T.value.live, checked: props.live, keepOpen: true },
  { id: 'follow', label: T.value.follow, checked: follow.value, keepOpen: true },
  { id: 'group', label: T.value.group, checked: group.value, keepOpen: true },
  { id: 'wrap', label: T.value.wrap, checked: wrap.value, keepOpen: true },
  { id: '', divider: true },
  { id: 'firstError', label: T.value.firstError, icon: 'error' },
  { id: 'copy', label: copiedKind.value ? T.value.copied : selected.value.size ? T.value.copySelection : T.value.copyAll, icon: copiedKind.value ? 'check_circle' : 'content_copy' },
  ...(selected.value.size ? [{ id: 'clearSelection', label: T.value.clearSelection, icon: 'close' }] : []),
])
function onLevel(id) { if (id === '__all') { levels.value = new Set(); quiet.value = false } else if (id === '__quiet') { levels.value = new Set(); quiet.value = true } else toggleLevel(id) }
function onSession(id) { if (id === -1) session.value = null; else openSession(id) }
function onSearchOption(id) { if (id === 'case') ignoreCase.value = !ignoreCase.value; else if (id.startsWith('mode:')) mode.value = id.slice(5) }
function onMore(id) {
  if (id === 'live') emit('update:live', !props.live)
  else if (id === 'follow') follow.value = !follow.value
  else if (id === 'group') group.value = !group.value
  else if (id === 'wrap') wrap.value = !wrap.value
  else if (id === 'firstError') jumpToFirstError()
  else if (id === 'copy') copy(selected.value.size ? 'selection' : 'all')
  else if (id === 'clearSelection') selected.value = new Set()
}
const sessionLabel = (s) => `${fillText(T.value.sessionN, { n: s.id + 1 })}${s.live ? ` · ${T.value.sessionLive}` : ''}`

function toggleLevel(level) {
  const next = new Set(levels.value)
  if (next.has(level)) next.delete(level); else next.add(level)
  levels.value = next
}
function pick(item, event) {
  const next = new Set(event.shiftKey ? selected.value : selected.value)
  const ids = item.ids
  if (event.shiftKey && lastPicked !== null) {
    const a = shown.value.findIndex((i) => i.ids[0] === lastPicked), b = shown.value.indexOf(item)
    for (let i = Math.min(a, b); i <= Math.max(a, b) && a >= 0; i++) for (const id of shown.value[i].ids) next.add(id)
  } else if (ids.every((id) => next.has(id))) ids.forEach((id) => next.delete(id))
  else ids.forEach((id) => next.add(id))
  lastPicked = item.ids[0]
  selected.value = next
}
let lastPicked = null
const isSelected = (item) => item.ids.every((id) => selected.value.has(id))
async function writeClip(text, kind) {
  try { await navigator.clipboard.writeText(text); copiedKind.value = kind; setTimeout(() => { copiedKind.value = '' }, 1600) } catch { /* the clipboard is not available */ }
}
async function copy(kind) {
  const chosen = shown.value.filter(isSelected)
  await writeClip(kind === 'selection' && chosen.length ? selectionText(chosen) : selectionText(shown.value), kind)
}
// the context menu of a line (SPEC-context-menu, "Log line"): the copy of the viewer's own menu for one line or all, and the page's analysis and export where the product gives them (MDiagnostics)
const diagActions = inject('m-diag-actions', null)
const offLogMenu = registerContext('log', ({ id, T: texts }) => {
  const item = shown.value.find((i) => String(i.ids[0]) === id)
  if (!item) return []
  return [
    { id: 'copy-log-line', label: texts.copyLine, icon: 'content_copy', run: () => writeClip(selectionText([item]), 'selection') },
    { id: 'copy-log-all', label: texts.copyAll, icon: 'select_all', run: () => copy('all') },
    ...(diagActions?.ai ? [{ id: 'log-analyze', label: texts.analyze, icon: 'smart_toy', run: () => diagActions.ai() }] : []),
    ...(diagActions?.exportDiag ? [{ id: 'log-export', label: texts.exportDiag, icon: 'folder_zip', run: () => diagActions.exportDiag() }] : []),
  ]
})
onBeforeUnmount(offLogMenu)
// The scroll to the tail reads scrollHeight (CSSOM View, m3e-cssom-view-scroll-20261106: the height of the element's scrolling area, a read of the layout as it stands). At the first mount that
// read sits inside the page's mount task, before the frame's own layout: it forces the layout of the first block of rows
// (14-17 ms over three instances, measured 2026-11-05) and of everything the page had mounted so far, and the writes that follow make the browser lay it all out again. The first scroll therefore
// reads after the first paint (m3e-whatwg-html-eventloop-20261106), when the layout is clean and the read costs nothing; the changes while following (new text, follow turned back on) keep the next-tick read, which already sits after
// every write of that change.
const toEnd = () => { const el = scroller.value; if (el) el.scrollTop = el.scrollHeight }
function scrollEnd() { nextTick(toEnd) }
let stopFirstScroll = () => {}
// a jump made before that paint turned following off: the row it opened stays in view
onMounted(() => { stopFirstScroll = afterFirstPaint(() => { if (follow.value) toEnd() }) }); onBeforeUnmount(() => stopFirstScroll())
function jumpToFirstError() {
  const row = firstError(filtered.value.rows) || firstError(rows.value)
  if (row) jumpTo(row.id)
}
/** Scrolls to the line with this row id; clears the filters that would hide it. */
function jumpTo(id) {
  if (!filtered.value.rows.some((r) => r.id === id)) { query.value = ''; levels.value = new Set(); quiet.value = false; range.value = 'all'; session.value = null; domain.value = null; source.value = null; file.value = null }
  follow.value = false
  limit.value = Math.max(limit.value, items.value.length)
  nextTick(() => {
    const el = scroller.value?.querySelector(`[data-row="${id}"]`) || scroller.value?.querySelector(`[data-ids~="${id}"]`)
    el?.scrollIntoView({ block: 'center' })
    el?.classList.add('is-flash'); setTimeout(() => el?.classList.remove('is-flash'), 1400)
  })
}
function openSession(id) { session.value = id; follow.value = false; selected.value = new Set() }
watch(() => props.text, () => { if (follow.value && session.value === null) scrollEnd() })
watch(follow, (on) => { if (on) scrollEnd() })
defineExpose({ jumpTo, openSession })
</script>

<template>
  <section class="m-logv" :class="{ 'm-logv--fill': fill }" :aria-label="T.logs">
    <div class="m-logv__head">
      <!-- one row: the search (its options behind the small button in it), the level filter with the counts, the time range, then the source, domain and
           session filters where the log has more than one, and the rest of the tools behind the overflow button. Every part is a button or a field. -->
      <div class="m-logv__bar m-logv__bar--main">
        <div class="m-logv__search" :class="{ 'is-bad': badRegex }">
          <MIcon name="search" />
          <input v-model="query" type="search" class="m-logv__input" :placeholder="T.search" :aria-label="T.search" spellcheck="false" />
          <button v-if="query" type="button" class="m-logv__x" :aria-label="T.clearSelection" @click="query = ''"><MIcon name="close" /></button>
          <MMenuChip class="m-logv__searchmenu" icon-only icon="tune" :aria-label="T.searchOptions" :items="searchItems" @select="onSearchOption" />
        </div>
        <MMenuChip :label="levelLabel" icon="filter_list" :aria-label="T.levels" :active="levels.size > 0 || quiet" :items="levelItems" @select="onLevel">
          <span v-if="errorCount" class="m-logv__badge m-logv__badge--error" :title="T.errorsCount">{{ errorCount }}</span>
          <span v-if="warnCount" class="m-logv__badge m-logv__badge--warn" :title="T.warningsCount">{{ warnCount }}</span>
        </MMenuChip>
        <MMenuChip :label="rangeLabel" icon="schedule" :aria-label="T.range" :active="range !== 'all'" :items="rangeItems" @select="range = $event" />
        <MMenuChip v-if="sources.length > 1" quiet :label="sourceChipLabel" icon="dns" :aria-label="T.source" :active="source !== null" :items="sourceItems" @select="source = $event === '' ? null : $event" />
        <MMenuChip v-if="files.length > 1" quiet :label="file ?? T.allFiles" icon="description" :aria-label="T.sourceFile" :active="file !== null" :items="fileItems" @select="file = $event === '' ? null : $event" />
        <MMenuChip v-if="domains.length > 1" quiet :label="domain ? domainLabel(domain) : T.allDomains" icon="hub" :aria-label="T.domain" :active="domain !== null" :items="domainItems" @select="domain = $event === '' ? null : $event" />
        <MMenuChip v-if="sessions.length > 1" quiet :label="session === null ? T.allSessions : sessionLabel(sessions[session])" icon="history" :aria-label="T.sessions" :active="session !== null" :items="sessionItems" @select="onSession" />
        <button type="button" class="m-logv__chip m-logv__wrapbtn" :class="{ 'is-on': wrap }" :aria-pressed="wrap" :aria-label="T.wrap" :data-tip="T.wrap" @click="wrap = !wrap"><MIcon name="wrap_text" /></button>
        <MMenuChip icon-only icon="more_vert" :aria-label="T.moreOptions" :items="moreItems" @select="onMore" />
      </div>
      <p v-if="badRegex" class="m-logv__warn"><MIcon name="error" />{{ T.badRegex }}: {{ badRegex }}</p>

      <div v-if="summary" class="m-logv__stats" :aria-label="T.sessionStats">
        <h4>{{ sessionLabel(sessions[summary.id]) }}</h4>
        <dl><template v-for="l in summaryLines" :key="l.label"><dt>{{ l.label }}</dt><dd>{{ l.value }}</dd></template></dl>
        <p v-if="!stats" class="m-logv__note">{{ T.logOnly }}</p>
      </div>

      <div v-if="hourly" class="m-logv__chart" :aria-label="T.perHour">
        <span class="m-logv__charttitle">{{ T.perHour }} · {{ hourly.total }}</span>
        <MChartX type="bar" :series="[{ id: 'errors', label: T.errorsCount, values: hourly.values, color: 'var(--md-sys-color-error)' }]" :labels="hourly.labels" :height="64" :min-samples="1" :max-bar="22" legend="none" :empty="T.noError" :label="T.perHour" />
      </div>
    </div>

    <div ref="scroller" class="m-logv__scroll" :class="{ 'is-wrap': wrap }" :style="fill ? undefined : { maxHeight: height }" role="log" :aria-live="live ? 'polite' : 'off'" tabindex="0">
      <button v-if="hidden > 0" type="button" class="m-logv__more" @click="limit += LIMIT_STEP">{{ T.showEarlier }} ({{ hidden }})</button>
      <div v-if="!shown.length && !rows.length && loading" class="m-logv__skel" role="status" aria-busy="true"><i v-for="n in 14" :key="n" :style="{ width: `${[92, 78, 86, 64, 90, 72, 83, 58, 88, 70, 80, 66, 91, 75][n - 1]}%` }" /></div>
      <p v-else-if="!shown.length" class="m-logv__empty">{{ rows.length ? T.noRows : T.empty }}</p>
      <div
        v-for="item in shown"
        :key="item.ids[0]"
        class="m-logv__row"
        :class="[`m-logv__row--${levelTone(item.row.level)}`, { 'is-selected': isSelected(item) }]"
        :data-row="item.ids[0]"
        :data-ctx="`log:${item.ids[0]}`"
        :data-ids="item.ids.join(' ')"
        @click="pick(item, $event)"
      >
        <span class="m-logv__time">{{ item.row.time }}</span>
        <span class="m-logv__level">{{ item.row.level }}</span>
        <span v-if="sources.length > 1" class="m-logv__src">{{ sourceLabel(item.row.source) }}</span>
        <span class="m-logv__msg" data-redact="path"><template v-for="(p, i) in parts(item.row.message)" :key="i"><mark v-if="p.hit" class="m-logv__hit">{{ p.t }}</mark><template v-else>{{ p.t }}</template></template></span>
        <span v-if="item.count > 1" class="m-logv__count">{{ fillText(T.repeats, { n: item.count }) }}</span>
      </div>
    </div>
    <p class="m-logv__foot">{{ fillText(T.lines, { n: filtered.rows.length }) }}</p>
  </section>
</template>
