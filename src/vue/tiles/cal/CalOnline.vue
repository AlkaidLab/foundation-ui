<script setup>
// Calibration round: 在线客户端.
//   方形: the count is the focal element (controller): a display numeral (MTileNumeral s, at the metric squares' 48 px), the devices as a row of glyph circles under it (iOS Batteries: a ring around each glyph, the streaming one in the accent).
//   中: one rounded tonal tile per client, glyph at the start, name and state (the Pixel Battery widget's device row); the streaming one filled.
import { computed } from 'vue'
import MIcon from '../../MIcon.vue'
import MTileNumeral from '../../MTileNumeral.vue'
import { sizeOf } from '../tileData.js'

const props = defineProps({ card: { type: Object, required: true }, texts: { type: Object, default: () => ({}) } })
const d = computed(() => props.card.data || {})
const size = computed(() => sizeOf(props.card))
const items = computed(() => (d.value.items || []).slice(0, size.value === 's' ? 3 : 3))
</script>

<template>
  <section class="m-tile m-cal m-calo" :class="`is-${size}`" :data-size="size" data-accent="primary">
    <header class="m-calm__head"><MIcon :name="d.icon" /><span class="m-calm__title">{{ card.title }}</span></header>
    <template v-if="size === 's'">
      <MTileNumeral class="m-calo__count" :value="d.count == null ? '' : String(d.count)" size="s" />
      <ul class="m-calo__rings"><li v-for="(c, i) in items" :key="c.name" :class="{ 'is-live': i === 0 }"><MIcon :name="c.icon === 'devices' ? 'mobile' : c.icon" /></li><li v-if="d.count > items.length" class="is-more">+{{ d.count - items.length }}</li></ul>
    </template>
    <ul v-else class="m-calo__tiles">
      <li v-for="(c, i) in items" :key="c.name" :class="{ 'is-live': i === 0 }"><MIcon :name="c.icon === 'devices' ? 'mobile' : c.icon" /><span><b>{{ c.name }}</b><small>{{ i === 0 ? texts.streamingNow || '串流中' : texts.onlineNow || '在线' }}</small></span></li>
    </ul>
  </section>
</template>
