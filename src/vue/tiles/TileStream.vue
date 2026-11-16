<script>
export const tileIds = ['loss', 'dropped', 'latency', 'stream-bitrate', 'stream-fps']
</script>

<script setup>
// The live numbers of a stream (REFERENCES.md "bitrate", "fps", "loss", "dropped", "stream-bitrate", "stream-fps"); 延迟 (latency) is drawn as the bitrate is: the number and its curve.
//   码率 v1 (Stocks): the curve edge to edge over its own range, the now dot · v2 (Screen Time / Nothing bars): a tonal tile, one pill per sample, the newest in the accent.
//     方形: the number and the chart · 中: + the resolution and the peak · 大: + lowest, mean, highest
//   帧率 v1 (Stocks with a target line): the curve against the target, dashed · v2 (Fitness ring): a ring of the frame rate against the target, the number in it.
//     方形: the number and the chart or ring · 中: + the target, the curve · 大: + lowest, mean, highest
//   丢包 and 丢帧: one bar per sample (a spike is an event), the tile turns warn or error with the value · 码率 (stream-bitrate): an open gauge against the cap when there is one
//   帧率 (stream-fps): the measured rate in a ring against the target
import { computed } from 'vue'
import MTileHead from '../MTileHead.vue'
import MTileNumeral from '../MTileNumeral.vue'
import MTileChart from '../MTileChart.vue'
import MTileRing from '../MTileRing.vue'
import MTileChip from '../MTileChip.vue'
import MTileShape from '../MTileShape.vue'
import MTileEmpty from '../MTileEmpty.vue'
import { finite, firstNumber, num, OPEN, sizeOf, statsOf, designProps } from './tileData.js'

const props = defineProps(designProps)
const emit = defineEmits(['act'])
const id = computed(() => props.card.id)
const d = computed(() => props.card.data || {})
const size = computed(() => sizeOf(props.card))
const pts = computed(() => finite(d.value.points))
const dec = computed(() => (['bitrate', 'loss', 'latency', 'stream-bitrate'].includes(id.value) ? 1 : 0))
const stats = computed(() => statsOf(pts.value, dec.value, d.value.unit))
const label = (k) => ({ min: props.texts.statMin, avg: props.texts.statAvg, max: props.texts.statMax }[k] || k)
const peak = computed(() => (d.value.peak ? `${props.texts.peak || ''} ${d.value.peak} ${d.value.unit || ''}`.trim() : ''))
// 帧率: the target is the number of its caption (目标 120 fps); the ring is the rate against it
const target = computed(() => (id.value === 'fps' ? firstNumber(d.value.caption) : null))
// 丢包, 丢帧: none is fine, some is a warning, a lot an error
const issueTone = computed(() => { const v = num(d.value.value) ?? 0; return v <= 0 ? 'ok' : (id.value === 'loss' ? v >= 2 : v >= 10) ? 'error' : 'warn' })
// the rows tiles of the session (stream-bitrate, stream-fps)
const rowsBig = computed(() => String(d.value.big || ''))
const bigNum = computed(() => { const m = /^([\d.]+)\s*(.*)$/.exec(rowsBig.value); return m ? { v: m[1], u: m[2] } : { v: rowsBig.value, u: '' } })
const cap = computed(() => (id.value === 'stream-bitrate' ? firstNumber(d.value.rows?.[0]?.value) : null))
const capText = computed(() => (d.value.rows?.[0] ? `${d.value.rows[0].title} ${d.value.rows[0].value}` : ''))
const sfTarget = computed(() => (id.value === 'stream-fps' ? firstNumber(d.value.rows?.find((r) => r.icon === 'check_circle')?.value) : null))
const accent = computed(() => (['loss', 'dropped'].includes(id.value) ? issueTone.value : id.value === 'fps' || id.value === 'stream-fps' ? 'primary' : 'tertiary'))
</script>

<template>
  <section class="m-tile m-tstream" :class="[`m-tstream--${id}`, `is-${size}`, `is-v${variant}`, { 'm-tile--tonal': id === 'bitrate' && variant === 2 }]" :data-accent="accent" :data-size="size">
    <MTileEmpty v-if="empty" :icon="empty.icon" :title="empty.title" :text="empty.value" :action="empty.action" :size="size" @act="(a) => emit('act', a)" />

    <template v-else-if="id === 'stream-bitrate' || id === 'stream-fps'">
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tstream__gauge">
        <MTileRing v-if="id === 'stream-fps' ? sfTarget : cap" class="m-tstream__ring" :value="(num(id === 'stream-fps' ? d.big : bigNum.v) ?? 0) / (id === 'stream-fps' ? sfTarget : cap)">
          <MTileNumeral :value="id === 'stream-fps' ? String(d.big || '') : bigNum.v" :unit="id === 'stream-fps' ? 'fps' : bigNum.u" size="s" />
        </MTileRing>
        <template v-else>
          <MTileShape class="m-tile__corner" :icon="d.icon" shape="clover" size="150px" tone="tonal" />
          <MTileNumeral class="m-tstream__alone" :value="id === 'stream-fps' ? String(d.big || '') : bigNum.v" :unit="id === 'stream-fps' ? 'fps' : bigNum.u" :size="size === 's' ? 's' : 'm'" />
        </template>
        <div v-if="size !== 's'" class="m-tstream__side">
          <MTileChip v-for="r in d.rows || []" :key="r.title" :icon="r.icon" :label="`${r.title} ${r.value}`" />
        </div>
      </div>
      <span v-if="size === 's' && id === 'stream-bitrate' && capText" class="m-tstream__foot">{{ capText }}</span>
      <!-- 中: the lowest, mean and highest of the session in a row, and its curve under the gauge -->
      <dl v-if="id === 'stream-bitrate' && size === 'm' && pts.length > 1 && stats.length" class="m-tstream__stats m-tstream__stats--row"><div v-for="x in stats" :key="x.k"><dt>{{ label(x.k) }}</dt><dd class="m-dnum">{{ x.value }}</dd></div></dl>
      <MTileChart v-if="id === 'stream-bitrate' && size === 'm' && pts.length > 1" class="m-tile__bleed m-tstream__spark m-tstream__spark--bitrate" :points="pts" kind="area" :dot="true" :window="36" :pad="0.12" :target="cap" />
    </template>

    <template v-else-if="id === 'fps' && variant === 2">
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tstream__body">
        <MTileRing class="m-tstream__ring" :value="target ? (num(d.value) ?? 0) / target : 1">
          <MTileNumeral :value="d.value" :unit="d.unit" :size="size === 'l' ? 'l' : 's'" />
        </MTileRing>
        <div v-if="size !== 's'" class="m-tstream__side">
          <MTileChip v-if="d.caption" :label="d.caption" tone="accent" />
          <MTileChip v-if="peak" :label="peak" />
          <dl v-if="size === 'l' && stats.length" class="m-tstream__stats"><div v-for="x in stats" :key="x.k"><dt>{{ label(x.k) }}</dt><dd class="m-dnum">{{ x.value }}</dd></div></dl>
        </div>
      </div>
      <MTileChart v-if="size !== 's'" class="m-tile__bleed m-tstream__spark" :points="pts" :max="target ? target * 1.1 : null" kind="area" :target="target" :window="size === 'l' ? 48 : 30" />
    </template>

    <template v-else>
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)"><MTileChip v-if="size !== 's' && peak" :label="peak" /></MTileHead>
      <div class="m-tstream__top">
        <MTileNumeral :value="d.value" :unit="d.unit" :size="size === 'l' ? 'xl' : size" :caption="size !== 's' ? d.caption : ''" />
        <dl v-if="(size === 'l' || (size === 'm' && ['loss', 'dropped'].includes(id))) && stats.length" class="m-tstream__stats"><div v-for="x in stats" :key="x.k"><dt>{{ label(x.k) }}</dt><dd class="m-dnum">{{ x.value }}</dd></div></dl>
      </div>
      <MTileChart v-if="pts.length > 1" class="m-tile__bleed" :points="pts" :max="id === 'fps' && target ? target * 1.1 : null" :target="id === 'fps' ? target : null"
        :kind="(id === 'bitrate' && variant === 2) || ['loss', 'dropped'].includes(id) ? 'bars' : 'area'" :dot="!(id === 'bitrate' && variant === 2) && !['loss', 'dropped'].includes(id)" :grid="size === 'l'"
        :window="(id === 'bitrate' && variant === 2) || ['loss', 'dropped'].includes(id) ? { s: 12, m: 24, l: 30 }[size] : { s: 20, m: 36, l: 48 }[size]" />
    </template>
  </section>
</template>
