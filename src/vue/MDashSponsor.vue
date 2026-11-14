<script setup>
import MIcon from './MIcon.vue'

// Sponsor card: the sponsor targets of the product as compact rows (one per developer) and the star, the card's one place for actions. Without targets
// it falls back to one sponsor button that opens the product's sponsor sheet.
// 条 (strip): the same actions in one row, each a chip (the developers to sponsor, the star)
defineProps({ texts: { type: Object, default: () => ({}) }, targets: { type: Array, default: () => [] }, size: { type: String, default: 'l' } })
const emit = defineEmits(['open'])
</script>

<template>
  <section v-if="size === 'strip'" class="m-dcard m-dstripctl m-dstripctl--sponsor">
    <MIcon class="m-dcard__icon" name="favorite" fill />
    <span class="m-dstripctl__title"><b>{{ texts.title }}</b></span>
    <div class="m-chipset"><button v-for="t in targets" :key="t.id" type="button" class="m-chipset__chip" @click="emit('open', t.id)"><MIcon name="favorite" fill />{{ t.label }}</button><button v-if="!targets.length" type="button" class="m-chipset__chip" @click="emit('open', 'sponsor')"><MIcon name="favorite" fill />{{ texts.sponsor }}</button><button type="button" class="m-chipset__chip" @click="emit('open', 'star')"><MIcon name="star" fill />{{ texts.star }}</button></div>
  </section>
  <section v-else class="m-dcard m-dsponsor">
    <header class="m-dcard__head"><MIcon class="m-dcard__icon" name="favorite" fill /><h3 class="m-dcard__title">{{ texts.title }}</h3></header>
    <ul v-if="targets.length" class="m-dsponsor__rows">
      <li v-for="t in targets" :key="t.id"><button type="button" class="m-dsponsor__row" @click="emit('open', t.id)"><span class="m-dsponsor__lead"><MIcon name="favorite" fill /></span><b>{{ t.label }}</b><small>{{ texts.sponsor }}</small><MIcon class="m-dsponsor__open" name="open_in_new" /></button></li>
      <li><button type="button" class="m-dsponsor__row" @click="emit('open', 'star')"><span class="m-dsponsor__lead m-dsponsor__lead--star"><MIcon name="star" fill /></span><b>{{ texts.star }}</b><MIcon class="m-dsponsor__open" name="open_in_new" /></button></li>
    </ul>
    <template v-else>
      <p v-if="texts.line" class="m-dsponsor__line">{{ texts.line }}</p>
      <div class="m-dsponsor__actions">
        <button type="button" class="m-dguide__go" @click="emit('open', 'sponsor')"><MIcon name="favorite" fill />{{ texts.sponsor }}</button>
        <button type="button" class="m-dpill" @click="emit('open', 'star')"><MIcon name="star" fill />{{ texts.star }}</button>
      </div>
    </template>
  </section>
</template>
