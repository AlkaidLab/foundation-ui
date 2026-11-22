<script setup>
import { computed } from 'vue'
import MDashHero from './MDashHero.vue'
import MDashCurve from './MDashCurve.vue'
import MDashStrip from './MDashStrip.vue'
import MDashSwitch from './MDashSwitch.vue'
import MDashInfo from './MDashInfo.vue'
import MDashVdd from './MDashVdd.vue'
import MDashTable from './MDashTable.vue'
import MDashApps from './MDashApps.vue'
import MDashGuide from './MDashGuide.vue'
import MDashDownload from './MDashDownload.vue'
import MDashJourney from './MDashJourney.vue'
import MDashSponsor from './MDashSponsor.vue'
import MDashWidget from './MDashWidget.vue'
import MDashComponent from './MDashComponent.vue'
import MDashSmall from './MDashSmall.vue'
import MDashStack from './MDashStack.vue'
import MDashSections from './MDashSections.vue'
import { smallOf } from './homeSmall.js'
import { genericAtS, hasNoData, hasOwnLayout } from './homeSizes.js'
import { CARD_META } from './homeCards.js'
import { designOf, variantOf } from './tiles/index.js'

// One card of the home by its kind. Used by the grid and, scaled down, by the add sheet and the catalogue.
const props = defineProps({
  card: { type: Object, required: true },
  details: { type: Object, default: () => ({}) },
  texts: { type: Object, default: () => ({}) },
  preview: { type: Boolean, default: false }, // a card that is only shown (picker, edit mode): nothing is started on the host for it
})
const emit = defineEmits(['act', 'rotate', 'hover', 'suggest', 'say', 'flags'])
const act = (type, value) => emit('act', { card: props.card.id, type, value })
const more = () => !!props.details?.[props.card.id]
// 方形 (s) is ONE view for every tile, in the grid and in the 时钟 dock (the dock draws the same card at the same size S, scaled): the tile's own design (tiles/) or the square of homeSmall.js (MDashSmall). A larger size without a layout of its own draws the generic large one
const generic = (key) => props.card.size === key && props.card.available !== false && (!hasOwnLayout(props.card.id, CARD_META[props.card.id] || props.card, key) || (key === 's' && genericAtS(props.card)))
const square = () => props.card.size === 's'
// the large size without a layout of its own shows the card and, beside it, the sections of its detail sheet (the charts, the heat strip, the rows) when it has one
const inlineDetail = computed(() => { const d = props.details?.[props.card.id]; return d && !d.external && d.sections?.length ? d : null })
// small, or an empty card at small and medium: the strip with the card's empty text as its value
const isEmpty = () => (props.card.size === 's' || props.card.size === 'm') && props.card.available !== false && hasNoData(props.card.data)
// a tile with nothing to show yet says so with the card's own empty text as its value
// the root of every branch says whether the card has nothing to show yet (data-empty): the overview's gate checks that such a card is drawn at its smallest size
const rootAttrs = computed(() => (props.card.available !== false && hasNoData(props.card.data) ? { 'data-empty': '' } : {}))
// a tile designed on its own (tiles/): its component draws every size it offers; an empty one gets the empty text and action of its square
const design = computed(() => designOf(props.card))
const emptyView = computed(() => { if (!design.value || !hasNoData(props.card.data)) return null; const v = smallOf(props.card, props.texts); return { ...v, value: props.card.data?.empty || v.value } })
const small = () => { if (generic('s')) { const v = smallOf(props.card, props.texts); return v.value ? v : { ...v, value: props.card.data?.empty || v.value } } if (isEmpty()) { const v = smallOf(props.card, props.texts); return { ...v, value: props.card.data.empty || v.value } } return null }
</script>

<template>
  <MDashStack v-if="card.kind === 'stack'" :card="card" :details="details" :texts="texts" :preview="preview" @act="(a) => emit('act', a)" @rotate="(e) => emit('rotate', e)" @hover="(e) => emit('hover', e)" @suggest="(e) => emit('suggest', e)" @say="(t) => emit('say', t)" @flags="(e) => emit('flags', e)" />
  <component :is="design" v-else-if="design" v-bind="rootAttrs" :card="card" :texts="texts" :details="details" :variant="variantOf(card.id)" :chevron="more()" :preview="preview" :empty="emptyView" @act="(a) => act(a.type, a.value)" />
  <MDashSmall v-bind="rootAttrs" v-else-if="small()" :small="small()" :group="card.group" :chevron="more()" :square="square()" @click="act('detail')" @act="(a) => act(a.type, a.value)" />
  <div v-bind="rootAttrs" v-else-if="generic('l')" class="m-dlarge" :class="{ 'has-side': !!inlineDetail }">
    <div class="m-dlarge__main"><MDashCardView :card="{ ...card, size: 'm' }" :details="details" :texts="texts" :preview="preview" @act="(a) => emit('act', a)" /></div>
    <aside v-if="inlineDetail" class="m-dlarge__side"><MDashSections :detail="inlineDetail" :uid="card.id" :texts="texts" inline /></aside>
    <p v-if="card.cls !== 'strip' && card.source" class="m-dlarge__source">{{ card.source }}</p>
  </div>
  <MDashHero v-bind="rootAttrs" v-else-if="card.kind === 'hero'" :heading="card.data.heading" :icon="card.data.icon" :status-label="card.data.statusLabel" :status-tone="card.data.statusTone" :title="card.data.title" :chips="card.data.chips" :pairs="card.data.pairs" :action="card.data.action" :facts="card.data.facts || []" :size="card.size || 'm'" :chevron="more()" :chevron-label="texts.more" @action="act('hero')" @open="act('detail')" />
  <MDashCurve v-else-if="card.kind === 'curve'" v-bind="{ ...card.data, ...rootAttrs }" :size="card.size || 'm'" :decimals="card.id === 'bitrate' || card.id === 'loss' ? 1 : 0" :labels="{ min: texts.statMin, avg: texts.statAvg, max: texts.statMax, peak: texts.peak }" :chevron="more()" :chevron-label="texts.more" @open="act('detail')" />
  <MDashStrip v-bind="rootAttrs" v-else-if="card.kind === 'strip'" :label="card.data.label" :icon="card.data.icon" :options="card.data.options" :value="card.data.value" :busy="card.data.busy" @update:value="(v) => act('group', v)" />
  <MDashSwitch v-bind="rootAttrs" v-else-if="card.kind === 'switch'" :model-value="card.data.value" :label="card.data.label" :sub="card.data.sub" :disabled="card.data.disabled || card.data.busy" @update:model-value="(v) => act('switch', { id: card.data.id, value: v })" />
  <MDashInfo v-else-if="card.kind === 'info'" v-bind="{ ...card.data, ...rootAttrs }" :chevron="more()" :chevron-label="texts.more" @open="act('detail')" />
  <MDashVdd v-else-if="card.kind === 'vdd'" v-bind="{ ...card.data, ...rootAttrs }" :chevron-label="texts.more" @open="act('open', 'vdd')" />
  <MDashTable v-bind="rootAttrs" v-else-if="card.kind === 'table'" :size="card.size || 'l'" :tabs="card.data.tabs" :action="card.data.action" @action="act('table-action')" @row="(r) => act('table-row', r)" />
  <MDashApps v-bind="rootAttrs" v-else-if="card.kind === 'apps'" :title="card.data.title" :count="card.data.count" :items="(card.data.items || []).slice(0, { s: 2, m: 4, l: 6 }[card.size || 'm'] || 4)" :size="card.size || 'm'" :empty="card.data.empty" :chevron="true" :chevron-label="texts.more" :add-label="card.data.addLabel" @add="act('add-app')" @open="act('open', 'apps')" @item="(a) => act('app', a)" />
  <MDashGuide v-bind="rootAttrs" v-else-if="card.kind === 'guide'" :steps="card.data.steps" :texts="card.data.texts" @go="(s) => act('guide-go', s)" @skip="(id) => act('guide-skip', id)" />
  <MDashJourney v-else-if="card.kind === 'journey'" v-bind="{ ...card.data, ...rootAttrs }" :live="!preview" @act="(t, v) => act(t, v)" />
  <MDashDownload v-else-if="card.kind === 'download'" v-bind="{ ...card.data, ...rootAttrs }" :size="card.size || 'm'" @open-url="(u) => act('open-url', u)" @open="act('open', 'downloads')" />
  <MDashSponsor v-bind="rootAttrs" v-else-if="card.kind === 'sponsor'" :size="card.size || 'l'" :texts="card.data.texts" :targets="card.data.targets" @open="(w) => act('sponsor', w)" />
  <MDashComponent v-bind="rootAttrs" v-else-if="card.kind === 'component'" :id="card.data.id" />
  <MDashWidget v-bind="rootAttrs" v-else-if="card.kind === 'widget'" :data="card.data" :size="card.size || 's'" :texts="texts" :card-id="card.id" :chevron="more()" :live="!preview" @act="act" />
  <section v-bind="rootAttrs" v-else class="m-dcard m-dempty"><span>{{ card.title }}</span></section>
</template>
