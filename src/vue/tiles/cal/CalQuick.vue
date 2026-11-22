<script setup>
// Calibration round: 快捷操作, a strip. The Android 16 Quick Settings tiles and the canonical toolbar: one row of equal pills, each with its glyph in a
// rounded-square container at the start and one label; the title at the start of the strip, quiet.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from '../../MIcon.vue'

const props = defineProps({ card: { type: Object, required: true } })
const emit = defineEmits(['act'])
const d = computed(() => props.card.data || {})
const at = ref(0)
// 方形 (the clock mode draws every tile as the overview's square): the anatomy of the other squares, not the strip squeezed: the label row, the actions as a 2 x 2 grid of glyph over its word;
// where a word is wider than its cell the grid keeps the glyphs alone (each button keeps its name for the screen reader and as a tooltip)
const square = computed(() => props.card.size === 's')
const items = computed(() => (d.value.items || []).slice(0, 4))
const sqRoot = ref(null), icons = ref(false)
let ro = null
const measure = () => { const g = sqRoot.value?.querySelector('.m-calqs__grid'); if (!g) return; icons.value = false; nextTick(() => { icons.value = [...g.querySelectorAll('button > span')].some((e) => e.scrollWidth > e.clientWidth + 1) }) }
onMounted(() => { if (typeof ResizeObserver !== 'undefined' && sqRoot.value) { ro = new ResizeObserver(measure); ro.observe(sqRoot.value) } measure(); if (typeof document !== 'undefined') document.fonts?.ready?.then(measure) })
watch(() => items.value.map((i) => i.label).join('|'), measure)
// the strip: where its four buttons do not fit one row in their own width (a phone's full row), they share the row without scrolling (each takes a quarter, glyph and word), then compact (the title goes), and where a
// word still does not fit its quarter the row keeps the glyphs alone (each button keeps its name for the screen reader and as a tooltip). A row that fits (a desktop's) is not touched. A button is never cut by the edge of the row.
const stripRoot = ref(null), stage = ref(0) // 0 as drawn, 1 the buttons share the row, 2 and the buttons are compact (the title goes), 3 glyphs alone
let ro2 = null
const measureStrip = () => {
  const r = stripRoot.value?.querySelector('.m-calq__row'); if (!r) return
  const cut = () => r.scrollWidth > r.clientWidth + 1 || [...r.querySelectorAll('button .m-calq__lab')].some((e) => e.scrollWidth > e.clientWidth + 1)
  const step = (n) => { stage.value = n; nextTick(() => { if (n === 0 ? r.scrollWidth <= r.clientWidth + 1 : !cut() || n === 3) return; step(n + 1) }) }
  step(0)
}
onMounted(() => { if (typeof ResizeObserver !== 'undefined' && stripRoot.value) { ro2 = new ResizeObserver(measureStrip); ro2.observe(stripRoot.value) } measureStrip(); if (typeof document !== 'undefined') document.fonts?.ready?.then(measureStrip) })
watch(() => (d.value.items || []).map((i) => i.label).join('|'), measureStrip)
onBeforeUnmount(() => { ro?.disconnect(); ro2?.disconnect() })
function onKey(e) {
  const n = props.card.data?.items?.length || 0; if (!n) return
  const to = { ArrowRight: at.value + 1, ArrowDown: at.value + 1, ArrowLeft: at.value - 1, ArrowUp: at.value - 1, Home: 0, End: n - 1 }[e.key]
  if (to === undefined) return
  e.preventDefault(); at.value = (to + n) % n; e.currentTarget.children[at.value]?.focus()
}
</script>

<template>
  <section v-if="square" ref="sqRoot" class="m-tile m-cal m-calqs" :class="{ 'is-icons': icons }" data-size="s" data-accent="primary">
    <header class="m-calm__head"><MIcon :name="d.icon" /><span class="m-calm__title">{{ d.title || card.title }}</span></header>
    <div class="m-calqs__grid" role="toolbar" :aria-label="d.title || card.title" @keydown="onKey">
      <button v-for="(a, i) in items" :key="a.id" type="button" :tabindex="i === at ? 0 : -1" :aria-label="a.label" :title="a.label" @focus="at = i" @click.stop="emit('act', { type: a.act, value: a.value })"><i><MIcon :name="a.icon" /></i><span>{{ a.label }}</span></button>
    </div>
  </section>
  <section v-else ref="stripRoot" class="m-tile m-cal m-calq" :class="{ 'is-tight': stage > 0, 'is-compact': stage === 2, 'is-icons': stage === 3 }" data-size="strip" data-accent="primary">
    <span class="m-calq__title"><MIcon :name="d.icon" /><span>{{ d.title || card.title }}</span></span>
    <!-- a toolbar (WAI-ARIA APG: one tab stop, the arrow keys, Home and End move between its buttons) -->
    <div class="m-calq__row" role="toolbar" :aria-label="d.title || card.title" @keydown="onKey">
      <button v-for="(a, i) in d.items" :key="a.id" type="button" :tabindex="i === at ? 0 : -1" :aria-label="a.label" :title="a.label" @focus="at = i" @click="emit('act', { type: a.act, value: a.value })"><i><MIcon :name="a.icon" /></i><span class="m-calq__lab">{{ a.label }}</span></button>
    </div>
  </section>
</template>
