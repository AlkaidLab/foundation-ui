<script setup>
import { computed } from 'vue'
import MDashCardView from './MDashCardView.vue'
import MIcon from './MIcon.vue'
import { GROUPS, defaultVisible } from './homeCards.js'

/**
 * The catalogue of home cards by group, each drawn at its real proportions (scaled) with its name, whether it is on by default and
 * where its data comes from. In `add` mode only cards that have data and are not on the page are listed, with an Add button.
 */
const props = defineProps({
  cards: { type: Array, required: true },
  ctx: { type: Object, default: () => ({}) },
  texts: { type: Object, default: () => ({}) },
  visibleIds: { type: Array, default: () => [] },
  mode: { type: String, default: 'all' }, // all | add
})
const emit = defineEmits(['add'])
const DEF_TEXT = { always: 'defOn', live: 'defLive', idle: 'defIdle', new: 'defNew', notNew: 'defNotNew', off: 'defOff' }
const groups = computed(() => GROUPS.map((g) => ({
  id: g,
  title: props.texts[`gGroup_${g}`] || g,
  cards: props.cards.filter((c) => c.group === g && (props.mode === 'all' || (c.available && !props.visibleIds.includes(c.id)))),
})).filter((g) => g.cards.length))
const SCALE = 0.5
const box = (c) => ({ w: c.span * 190, h: { hero: 200, strip: 56, card: 190, tall: 232, list: 270 }[c.cls] })
const defLabel = (c) => props.texts[DEF_TEXT[c.def]] || c.def
</script>

<template>
  <div class="m-dcat">
    <section v-for="g in groups" :key="g.id" class="m-dcat__group">
      <h4 class="m-dcat__title">{{ g.title }}</h4>
      <div class="m-dcat__cards">
        <article v-for="c in g.cards" :key="c.id" class="m-dcat__item" :class="{ 'is-off': !c.available }">
          <div class="m-dcat__preview" :style="{ width: `${box(c).w * SCALE}px`, height: `${box(c).h * SCALE}px` }" aria-hidden="true">
            <div class="m-dcat__scaled" :style="{ width: `${box(c).w}px`, height: `${box(c).h}px`, transform: `scale(${SCALE})` }"><MDashCardView :card="c" :texts="texts" preview /></div>
          </div>
          <div class="m-dcat__meta">
            <b>{{ c.title }}</b>
            <span class="m-dcat__def">{{ defLabel(c) }}</span>
            <span v-if="!c.available || c.source" class="m-dcat__src">{{ c.available ? c.source : texts.unavailable }}</span>
            <button v-if="mode === 'add'" type="button" class="m-dpill" @click="emit('add', c.id)"><MIcon name="add_circle" />{{ texts.addCard }}</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
