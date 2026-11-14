<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from './MIcon.vue'

// Table card: tabs that carry counts, a rounded header row, rows with a letter avatar. tabs: [{ id, label, count, columns, rows, empty }]
const props = defineProps({
  tabs: { type: Array, required: true },
  action: { type: Object, default: null }, // { label, icon }
  /** 中: the tabs (with their counts) and the first row; 大: the header row and four rows (a phone's square is 328 px) (the rest is one tap away, in the sheet) */
  size: { type: String, default: 'l' },
})
const emit = defineEmits(['action', 'row'])
const current = ref(props.tabs[0]?.id)
watch(() => props.tabs.map((t) => t.id).join(), () => { if (!props.tabs.some((t) => t.id === current.value)) current.value = props.tabs[0]?.id })
const tab = computed(() => props.tabs.find((t) => t.id === current.value) || props.tabs[0])
// as many whole rows as the card's height holds (at most six), so a row is never cut by the card's edge, whatever the box (a phone column or a desktop row)
const body = ref(null)
const fit = ref(props.size === 'm' ? 1 : 4)
let ro = null
const measure = () => { const b = body.value; if (!b) return; const card = b.closest('.m-dtable'); const room = card.getBoundingClientRect().bottom - b.getBoundingClientRect().top - parseFloat(getComputedStyle(card).paddingBottom || '0') - (props.size === 'm' ? 0 : 40); fit.value = Math.max(1, Math.min(6, Math.floor(room / 44))) }
onMounted(() => { measure(); ro = new ResizeObserver(measure); ro.observe(body.value?.closest('.m-dtable') || document.body) })
onBeforeUnmount(() => ro?.disconnect())
const rows = computed(() => (tab.value?.rows || []).slice(0, fit.value))
</script>

<template>
  <section class="m-dcard m-dtable">
    <header class="m-dtable__tabs">
      <div class="m-dtabs" role="tablist">
        <button v-for="t in tabs" :key="t.id" type="button" role="tab" class="m-dtab" :aria-selected="t.id === tab?.id" @click="current = t.id"><b class="m-dnum">{{ t.count }}</b>{{ t.label }}</button>
      </div>
      <button v-if="action" type="button" class="m-dpill" @click="emit('action')"><MIcon :name="action.icon" />{{ action.label }}</button>
    </header>
    <div v-if="tab && tab.rows.length" ref="body" class="m-dtable__scroll">
      <div v-if="size !== 'm'" class="m-dtable__row m-dtable__row--head" :style="{ gridTemplateColumns: `36px ${tab.columns.map((c) => c.width || '1fr').join(' ')}` }">
        <span /><span v-for="c in tab.columns" :key="c.key" :style="{ textAlign: c.align }">{{ c.label }}</span>
      </div>
      <button v-for="r in rows" :key="r.id" type="button" class="m-dtable__row" :style="{ gridTemplateColumns: `36px ${tab.columns.map((c) => c.width || '1fr').join(' ')}` }" @click="emit('row', { ...r, tab: tab.id })">
        <span class="m-dtable__avatar"><MIcon v-if="r.icon" :name="r.icon" /><template v-else>{{ r.avatar }}</template></span>
        <span v-for="c in tab.columns" :key="c.key" :class="{ 'is-strong': c.strong, 'is-muted': c.muted, [`is-${r.tone}`]: c.tone && r.tone }" :style="{ textAlign: c.align }">{{ r.cells[c.key] }}</span>
      </button>
    </div>
    <div v-else class="m-dtable__empty"><MIcon :name="tab?.emptyIcon || 'inbox'" />{{ tab?.empty }}</div>
  </section>
</template>
