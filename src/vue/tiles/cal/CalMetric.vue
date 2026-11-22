<script setup>
// Calibration round: the metric family (帧率, 码率, CPU, GPU, 内存) in the look the team chose, the 帧率 中 of df9ac45 (reference-fps-df9ac45.png):
// a calm card, the glyph and the title at the top left, the peak and the chevron at the top right, one large numeral with a small unit, ONE full-width line across the
// lower part from the real samples (gently smoothed, a dot on the newest) with a soft fill in the accent's container colour down to the bottom edge, and a small caption
// just under the line. 方形 keeps the numeral and the line; 大 adds the lowest / mean / highest beside the caption and, for the frame rate, the target as a dashed guide.
import { computed } from 'vue'
import MIcon from '../../MIcon.vue'
import MTileChart from '../../MTileChart.vue'
import MRoll from '../../MRoll.vue'
import { finite, firstNumber, memoryOf, sizeOf, statsOf } from '../tileData.js'

// 大: card.extra is what the stream adds (帧率: the dropped frames; 码率: the codec and the cap; homeCards.js), shown with the hardware's facts under the numeral
const props = defineProps({ card: { type: Object, required: true }, texts: { type: Object, default: () => ({}) }, chevron: { type: Boolean, default: true } })
const emit = defineEmits(['act'])
const id = computed(() => props.card.id)
const d = computed(() => props.card.data || {})
const size = computed(() => sizeOf(props.card))
const mem = computed(() => (id.value === 'memory' ? memoryOf(d.value) : null))
// 内存 is an info card: its share is the value, its samples come with the card (trend)
const pts = computed(() => finite(id.value === 'memory' ? props.card.trend : d.value.points))
const unit = computed(() => (mem.value ? '%' : d.value.unit))
const dec = computed(() => (id.value === 'bitrate' ? 1 : 0))
const target = computed(() => (id.value === 'fps' ? firstNumber(d.value.caption) : null))
const max = computed(() => (mem.value ? 100 : d.value.max ?? (target.value ? target.value * 1.12 : null)))
const peak = computed(() => (d.value.peak ? d.value.peak : pts.value.length ? Math.max(...pts.value).toFixed(dec.value) : ''))
const stats = computed(() => statsOf(pts.value, dec.value, unit.value))
const label = (k) => ({ min: props.texts.statMin, avg: props.texts.statAvg, max: props.texts.statMax }[k] || k)
// the caption: the target, the resolution, the model, the total; 大 adds the facts of the hardware
const caption = computed(() => {
  if (mem.value) return mem.value.total
  return d.value.caption || ''
})
// 大: the detail row: the hardware's facts (CPU: cores and threads, the temperature; GPU: VRAM, the driver, the temperature) or the stream's
const detailRow = computed(() => (size.value === 'l' ? [...(id.value === 'cpu' || id.value === 'gpu' ? d.value.facts || [] : []), ...(props.card.extra || [])].filter(Boolean).slice(0, 3) : []))
const accent = computed(() => ({ gpu: 'tertiary', memory: 'secondary' }[id.value] || 'primary'))
</script>

<template>
  <section class="m-tile m-cal m-calm" :class="[`is-${size}`, `m-calm--${id}`]" :data-size="size" :data-accent="accent">
    <header class="m-calm__head">
      <MIcon :name="d.icon" /><span class="m-calm__title">{{ card.title }}</span>
      <span v-if="size !== 's' && peak" class="m-calm__peak m-dnum">{{ texts.statMax }} {{ peak }}</span>
      <button v-if="chevron && size !== 's'" type="button" class="m-calm__more" :aria-label="texts.more || card.title" @click.stop="emit('act', { type: 'detail' })"><MIcon name="chevron_right" /></button>
    </header>
    <div class="m-calm__value"><b class="m-dnum"><MRoll :text="d.value || '–'" /></b><small v-if="unit && d.value">{{ unit }}</small></div>
    <ul v-if="detailRow.length" class="m-calm__details"><li v-for="x in detailRow" :key="x">{{ x }}</li></ul>
    <!-- one curve at every size: along the bottom of the tile, the whole width, monotone, the fill fading to nothing at the edge and out on the left under the text; 方形 has no dot, 中 and 大 end in one, 大 adds the target; a faint flat line while there are too few samples. The fill runs to the bottom edge; the line itself keeps above the caption row (base), so a low value (a frame rate far under its target) does not run through the caption -->
    <MTileChart class="m-tile__bleed m-calm__chart" :points="pts" :max="max" :target="size === 'l' ? target : null" kind="area" :dot="size !== 's'" monotone placeholder :fade="1" :window="{ s: 24, m: 40, l: 48 }[size]" :pad="{ s: 0.08, m: 0.12, l: 0.24 }[size]" :base="size === 's' ? 0 : size === 'l' ? 46 : 24" />
    <div v-if="size !== 's' && (caption || stats.length)" class="m-calm__foot">
      <span class="m-calm__cap">{{ caption }}</span>
      <span v-if="size === 'l' && stats.length" class="m-calm__stats m-dnum"><template v-for="(x, i) in stats" :key="x.k"><i v-if="i"> · </i>{{ label(x.k) }} {{ x.value }}</template></span>
    </div>
  </section>
</template>
