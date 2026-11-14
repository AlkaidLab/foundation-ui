<script setup>
import { computed, nextTick, watch } from 'vue'
import MIcon from './MIcon.vue'
import { highlight } from '../search/index.js'

// What the search view shows: with an empty field the recent searches and the recently changed settings, else the results grouped by type, each group
// under a small header. One list for the docked view and the full-screen one. Rows are options of one listbox; the active one follows the arrow keys.
const props = defineProps({
  search: { type: Object, required: true }, // useUnifiedSearch()
  texts: { type: Object, required: true }, // searchTexts()
  listId: { type: String, default: 'm-usearch-list' },
})
const s = props.search
const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

// the view as a flat list of headers and rows; a row knows its position among the rows (the arrow keys' index)
const view = computed(() => {
  const out = []
  let i = 0
  if (s.idle.value) {
    if (s.quick.value.length) {
      out.push({ kind: 'header', key: 'h-quick', text: props.texts.quickActions })
      for (const doc of s.quick.value) out.push({ kind: 'row', key: `x-${doc.id}`, i: i++, row: { kind: 'doc', doc }, icon: doc.icon || 'bolt', title: doc.title, ranges: [] })
    }
    if (s.recentQueries.value.length) {
      out.push({ kind: 'header', key: 'h-q', text: props.texts.recentSearches, action: { label: props.texts.clearAll, run: () => s.forgetAll() } })
      for (const q of s.recentQueries.value) out.push({ kind: 'row', key: `q-${q}`, i: i++, row: { kind: 'query', q }, icon: 'history', title: q, ranges: [], removable: true })
    }
    if (s.recentSettings.value.length) {
      out.push({ kind: 'header', key: 'h-s', text: props.texts.recentSettings })
      for (const doc of s.recentSettings.value) out.push({ kind: 'row', key: `s-${doc.id}`, i: i++, row: { kind: 'doc', doc }, icon: doc.icon || 'tune', title: doc.title, path: doc.path, ranges: [] })
    }
    if (!out.length) out.push({ kind: 'hint', key: 'hint', text: props.texts.noneYet })
    return out
  }
  const r = s.result.value
  if (!r.total) { out.push({ kind: 'none', key: 'none' }); return out }
  for (const g of r.groups) {
    out.push({ kind: 'header', key: `h-${g.type}`, text: props.texts.types[g.type] || g.type })
    for (const it of g.items) out.push({ kind: 'row', key: it.doc.id, i: i++, row: { kind: 'doc', doc: it.doc }, icon: it.doc.icon || 'tune', title: it.doc.title, path: it.doc.path, ranges: it.ranges, type: g.type, pin: !!(it.doc.pin && props.search.pin) })
    if (g.more) out.push({ kind: 'more', key: `m-${g.type}`, text: fill(props.texts.more, { n: g.more }) })
  }
  return out
})

const rowId = (i) => `${props.listId}-${i}`
watch(() => s.active.value, () => nextTick(() => document.getElementById(rowId(s.active.value))?.scrollIntoView({ block: 'nearest' })))
defineExpose({ rowId })
</script>

<template>
  <ul :id="listId" class="m-usearch__list" role="listbox" :aria-label="texts.open">
    <template v-for="e in view" :key="e.key">
      <li v-if="e.kind === 'header'" class="m-usearch__group" role="presentation">
        <h3>{{ e.text }}</h3>
        <button v-if="e.action" type="button" class="m-usearch__groupact" @mousedown.prevent @click="e.action.run()">{{ e.action.label }}</button>
      </li>
      <li v-else-if="e.kind === 'row'" :id="rowId(e.i)" class="m-usearch__row" :class="{ 'is-active': e.i === s.active.value }" role="option" :aria-selected="e.i === s.active.value" @mousemove="s.active.value = e.i" @mousedown.prevent @click="s.choose(e.row)">
        <MIcon class="m-usearch__icon" :name="e.icon" />
        <span class="m-usearch__text">
          <b class="m-usearch__title"><template v-for="(p, n) in highlight(e.title, e.ranges)" :key="n"><mark v-if="p.mark">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></b>
          <small v-if="e.path" class="m-usearch__path">{{ e.path }}</small>
        </span>
        <span v-if="e.type === 'tile'" class="m-usearch__trail">{{ texts.addToHome }}</span>
        <button v-if="e.pin" type="button" class="m-usearch__pin" :class="{ 'is-on': s.pinned(e.row.doc) }" :aria-pressed="s.pinned(e.row.doc)" :aria-label="`${s.pinned(e.row.doc) ? texts.pinned : texts.pin}: ${e.title}`" @mousedown.prevent @click.stop="s.pin(e.row.doc)"><MIcon name="keep" :fill="s.pinned(e.row.doc)" /><span>{{ s.pinned(e.row.doc) ? texts.pinned : texts.pin }}</span></button>
        <button v-if="e.removable" type="button" class="m-usearch__remove" :aria-label="`${texts.remove}: ${e.title}`" :data-tip="texts.remove" @mousedown.prevent @click.stop="s.forget(e.title)"><MIcon name="close" /></button>
      </li>
      <li v-else-if="e.kind === 'more'" class="m-usearch__more" role="presentation">{{ e.text }}</li>
      <li v-else-if="e.kind === 'hint'" class="m-usearch__empty" role="presentation">{{ e.text }}</li>
      <li v-else class="m-usearch__empty" role="presentation"><b>{{ fill(texts.noResults, { q: s.query.value.trim() }) }}</b><small>{{ texts.noResultsHint }}</small></li>
    </template>
  </ul>
</template>
