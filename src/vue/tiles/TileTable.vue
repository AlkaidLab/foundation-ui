<script>
export const tileIds = ['table']
</script>

<script setup>
// 客户端 (the table card: paired clients, recent sessions, errors) in the calibrated calm language (round 31; REFERENCES.md "table": the Pixel Battery widget's device rows).
// The tabs are text; the chosen tab's count is the focal element; each row is a 40 px tonal circle with the device's glyph, the name and a state chip, with nothing behind it.
// 中 the count beside two rows, 大 the count over four. The action (pair) is the card's one button. Everything the old card did stays.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import MTileChip from '../MTileChip.vue'
import MTileNumeral from '../MTileNumeral.vue'
import { initialOf, sizeB2 } from './b2.js'
import { designProps } from './tileData.js'

const props = defineProps(designProps)
const emit = defineEmits(['act'])
const d = computed(() => props.card.data || {})
const size = computed(() => sizeB2(props.card))
const tabs = computed(() => d.value.tabs || [])
const current = ref(tabs.value[0]?.id)
watch(() => tabs.value.map((t) => t.id).join(), () => { if (!tabs.value.some((t) => t.id === current.value)) current.value = tabs.value[0]?.id })
const tab = computed(() => tabs.value.find((t) => t.id === current.value) || tabs.value[0])
// the tabs that do not all fit the head show the chosen one alone, with its place (1/3); a press on it moves to the next tab, so every tab stays reachable (no tab sits under the button or scrolls out of sight)
const tabsEl = ref(null)
const cycle = ref(false)
const place = computed(() => `${Math.max(0, tabs.value.findIndex((t) => t.id === tab.value?.id)) + 1}/${tabs.value.length}`)
const pickTab = (t) => { if (cycle.value && t.id === tab.value?.id && tabs.value.length > 1) { const i = tabs.value.findIndex((x) => x.id === t.id); current.value = tabs.value[(i + 1) % tabs.value.length].id } else current.value = t.id }
function measure() {
  const el = tabsEl.value; if (!el) return
  el.classList.remove('is-cycle')
  const over = tabs.value.length > 1 && el.scrollWidth > el.clientWidth + 1
  cycle.value = over; el.classList.toggle('is-cycle', over)
}
let ro = null, mo = null
onMounted(() => { measure(); if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(tabsEl.value) } if (typeof MutationObserver !== 'undefined') { mo = new MutationObserver(() => nextTick(measure)); mo.observe(tabsEl.value, { characterData: true, subtree: true }) } })
onBeforeUnmount(() => { ro?.disconnect(); mo?.disconnect() })
watch(() => tabs.value.map((t) => t.label).join(), () => nextTick(measure))
const rows = computed(() => (tab.value?.rows || []).slice(0, size.value === 'm' ? 2 : 4))
// the first column is the row's name, the last one with a tone its state
const nameKey = computed(() => (tab.value?.columns || [])[0]?.key)
const stateKey = computed(() => { const c = (tab.value?.columns || []).slice(1); return (c.find((x) => x.key === 'state' || x.key === 'text') || c[c.length - 1])?.key })
const toneOf = (r) => r.tones?.[stateKey.value] || ''
</script>

<template>
  <section class="m-tile m-cal m-b2 m-b2table" :class="`is-${size}`" :data-size="size" data-accent="primary">
    <header class="m-calm__head m-b2table__head">
      <div ref="tabsEl" class="m-b2table__tabs" :class="{ 'is-cycle': cycle }" role="tablist"><button v-for="t in tabs" :key="t.id" type="button" role="tab" :aria-selected="t.id === tab?.id" :class="{ 'is-on': t.id === tab?.id }" @click.stop="pickTab(t)">{{ t.label }}<i v-if="t.id === tab?.id" class="m-b2table__pos">{{ place }}</i></button></div>
      <button v-if="d.action" type="button" class="m-b2__btn is-tonal m-b2table__act" :title="d.action.label" @click.stop="emit('act', { type: 'table-action' })"><MIcon :name="d.action.icon" /><span class="m-b2table__lab">{{ d.action.label }}</span></button>
    </header>
    <div v-if="rows.length" class="m-b2table__body">
      <MTileNumeral :value="String(tab.count ?? tab.rows.length)" size="l" />
      <ol class="m-b2list" data-fit-rows="drop">
        <li v-for="r in rows" :key="r.id" :data-ctx="tab?.id === 'clients' && r.uuid ? `client:${r.uuid}` : undefined"><button type="button" class="m-b2item" @click.stop="emit('act', { type: 'table-row', value: { ...r, tab: tab.id } })"><span class="m-b2glyph" :class="{ 'is-on': toneOf(r) === 'ok', 'is-off': toneOf(r) === 'warn', 'is-warn': toneOf(r) === 'err' }"><MIcon v-if="r.icon" :name="r.icon" /><b v-else>{{ initialOf(r.cells[nameKey]) }}</b></span><span><b>{{ r.cells[nameKey] }}</b></span><MTileChip v-if="r.cells[stateKey]" :label="String(r.cells[stateKey])" :tone="toneOf(r)" /></button></li>
      </ol>
    </div>
    <div v-else class="m-b2empty"><span class="m-b2glyph"><MIcon :name="tab?.emptyIcon || 'inbox'" /></span><b>{{ tab?.empty }}</b></div>
  </section>
</template>
