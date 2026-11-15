<script>
export const tileIds = ['temperature', 'load', 'budget', 'session-time']
</script>

<script setup>
// 温度 and CPU 与 GPU (REFERENCES.md "temperature", "load").
//   温度 (Apple Watch gauge complication, Pixel Battery's temperature): an open 270° gauge in the colour of its zone (ok, warn, error), the hottest reading in it.
//     (a closed ring from the top: an open 270° gauge read as a ring broken on one side)
//     方形: the gauge · 中: + the CPU and the GPU reading as two bars beside it
//   延迟预算 (the same open gauge): the share of a frame's time the encoder takes, in the colour of its zone; 中 adds the latency curve beside it
//   串流时长 (Apple Watch's activity ring, drawn as the wavy circular progress of 断线 (MProgress)): the whole ring, turning while the stream runs (a session has no length to fill it with), the time in it as the hero;
//     the client under the numeral, when the session or a paired client names it
//   CPU 与 GPU (Stocks comparison, iStat's combined graph): both curves edge to edge over one scale, each number in its colour above them. 中 only.
import { computed } from 'vue'
import MTileHead from '../MTileHead.vue'
import MTileNumeral from '../MTileNumeral.vue'
import MTileRing from '../MTileRing.vue'
import MTileChart from '../MTileChart.vue'
import MTileEmpty from '../MTileEmpty.vue'
import { finite, num, OPEN, sizeOf, designProps } from './tileData.js'

const props = defineProps(designProps)
const emit = defineEmits(['act'])
const d = computed(() => props.card.data || {})
const size = computed(() => sizeOf(props.card))
const isTemp = computed(() => props.card.id === 'temperature')
const isBudget = computed(() => props.card.id === 'budget')
const isTime = computed(() => props.card.id === 'session-time')
const zone = computed(() => ({ ok: 'ok', warn: 'warn', err: 'error' }[(d.value.zones || []).find((z) => d.value.value <= z.to)?.tone] || 'ok'))
// 'CPU 62 °C · GPU 78 °C' -> [{ label: 'CPU', v: 62 }, ...]
const readings = computed(() => String(d.value.caption || '').split(' · ').map((s) => { const m = /^(.*?)\s*([\d.]+)\s*°C$/.exec(s.trim()); return m ? { label: m[1], v: +m[2] } : null }).filter(Boolean))
const series = computed(() => (d.value.series || []).map((s) => ({ ...s, values: finite(s.values) })))
// a session has no maximum length, so its ring has no fill to read: it is the whole wavy ring, turning slowly while the stream runs, and the time is the hero inside it
const hour = computed(() => 1)
const nowOf = (s) => { const v = s.values[s.values.length - 1]; return v === undefined ? '' : String(Math.round(v)) }
</script>

<template>
  <section class="m-tile m-tgauge" :class="[`m-tgauge--${card.id}`, `is-${size}`]" :data-accent="isTemp || isBudget ? zone : isTime ? 'tertiary' : 'primary'" :data-size="size">
    <MTileEmpty v-if="empty" :icon="empty.icon" :title="empty.title" :text="empty.value" :action="empty.action" :size="size" @act="(a) => emit('act', a)" />
    <template v-else-if="isTemp">
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tgauge__body">
        <MTileRing class="m-tgauge__ring" :value="num(d.value) ?? 0" :sweep="360" :wavy="false" :stroke="12">
          <MTileNumeral :value="d.centre" :unit="d.unit" size="s" />
        </MTileRing>
        <ul v-if="size !== 's' && readings.length" class="m-tgauge__bars">
          <li v-for="r in readings" :key="r.label"><span>{{ r.label }}</span><i><b :style="{ transform: `scaleX(${Math.min(1, r.v / 100)})` }" /></i><em class="m-dnum">{{ r.v }} °C</em></li>
        </ul>
      </div>
    </template>
    <template v-else-if="isBudget">
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tgauge__body">
        <MTileRing class="m-tgauge__ring" :value="num(d.value) ?? 0" :sweep="360" :wavy="false" :stroke="12">
          <MTileNumeral :value="d.centre" :unit="d.unit" size="s" />
        </MTileRing>
        <div v-if="size !== 's'" class="m-tgauge__side"><span v-if="d.caption && d.caption !== card.title" class="m-tgauge__cap">{{ d.caption }}</span><MTileChart v-if="finite(d.spark).length > 1" class="m-tgauge__spark" :points="finite(d.spark)" kind="line" :dot="true" :window="40" /></div>
      </div>
    </template>
    <template v-else-if="isTime">
      <MTileHead :icon="d.icon" :title="card.title" />
      <div class="m-tgauge__body">
        <MTileRing class="m-tgauge__ring" :value="hour" :sweep="360" :stroke="7" :amp="1.9" :waves="18" spin :style="{ '--chars': String(d.centre || '').length || 4 }">
          <MTileNumeral :value="d.centre" size="s" />
        </MTileRing>
        <span v-if="d.caption" class="m-tgauge__cap">{{ d.caption }}</span>
      </div>
    </template>
    <template v-else>
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron" @open="emit('act', OPEN)" />
      <div class="m-tgauge__pair">
        <div v-for="(s, i) in series" :key="s.id" class="m-tgauge__one" :class="`is-${i ? 'b' : 'a'}`"><span>{{ s.label }}</span><MTileNumeral :value="nowOf(s)" unit="%" size="m" /></div>
      </div>
      <div class="m-tile__bleed m-tgauge__charts">
        <MTileChart v-for="(s, i) in series" :key="s.id" class="m-tgauge__chart" :class="`is-${i ? 'b' : 'a'}`" :points="s.values" :max="100" kind="area" :dot="true" :window="40" />
      </div>
    </template>
  </section>
</template>
