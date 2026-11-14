<script>
export const tileIds = ['hdr', 'display', 'stream-vdd', 'stream-resolution', 'sys', 'session-heat']
</script>

<script setup>
// HDR, 串流分辨率, 系统 and 串流热度 (REFERENCES.md "hdr", "stream-resolution", "sys", "session-heat").
//   HDR (Pixel quick-settings tile, iOS Focus widget): the state is the tile: filled in the ok colour with HDR in display type when on, a quiet outline shape when off.
//   显示器 (the same drawn screen, from the screen the host reports): its resolution name in it; 中 adds the size, the refresh rate and the state chips.
//   使用虚拟显示器 (HDR's state tile): filled in the ok colour with the word when the stream uses the virtual display, a quiet outline shape when not.
//   串流分辨率 (the old drawn display, larger; Apple's Screen Time device glyph): the screen drawn in its own aspect ratio with the resolution in it; 中 adds the target rate.
//   系统 (macOS About This Mac, the Batteries device glyph): the system's name in display type over the computer's shape; 中 adds version, build and host.
//   串流热度 (Fitness / Screen Time / GitHub calendar): days as rounded cells tinted by minutes streamed, the total in display type; 方形 14 days, 中 30.
import { computed } from 'vue'
import MTileHead from '../MTileHead.vue'
import MTileNumeral from '../MTileNumeral.vue'
import MTileShape from '../MTileShape.vue'
import MTileChip from '../MTileChip.vue'
import MTileEmpty from '../MTileEmpty.vue'
import { firstNumber, OPEN, sizeOf, designProps } from './tileData.js'

const props = defineProps(designProps)
const emit = defineEmits(['act'])
const id = computed(() => props.card.id)
const d = computed(() => props.card.data || {})
const size = computed(() => sizeOf(props.card))
const hdrOn = computed(() => d.value.tone === 'ok')
// 显示器: the screen the host reports
const screen = computed(() => (d.value.screen?.w && d.value.screen?.h ? { w: d.value.screen.w, h: d.value.screen.h } : null))
// 2560×1440 -> its aspect ratio
const res = computed(() => { const m = /(\d{3,5})\s*[×x]\s*(\d{3,5})/.exec(d.value.big || ''); return m ? { w: +m[1], h: +m[2] } : null })
const resLabel = computed(() => (res.value ? `${res.value.h}p` : d.value.big))
// the heat cells: the last 14 days at 方形, 30 at 中; a day's tint is its share of the busiest day
const days = computed(() => (d.value.days || []).slice(size.value === 's' ? -14 : -30))
const dayMax = computed(() => Math.max(1, ...days.value.map((x) => Number(x?.value) || 0)))
const totalNum = computed(() => { const m = /^([\d.]+)\s*(.*)$/.exec(d.value.total || ''); return m ? { v: m[1], u: m[2] } : { v: d.value.total || '', u: '' } })
const accent = computed(() => ({ hdr: hdrOn.value ? 'ok' : 'secondary', 'stream-vdd': hdrOn.value ? 'ok' : 'secondary', display: 'tertiary', 'stream-resolution': 'tertiary', sys: 'secondary', 'session-heat': 'primary' }[id.value]))
</script>

<template>
  <section class="m-tile m-tfacts" :class="[`m-tfacts--${id}`, `is-${size}`, { 'm-tile--tonal': (id === 'hdr' || id === 'stream-vdd') && hdrOn }]" :data-accent="accent" :data-size="size">
    <MTileEmpty v-if="empty || (id === 'session-heat' && !d.total)" :icon="empty?.icon || d.icon" :title="empty?.title || card.title" :text="empty?.value || d.empty || ''" :action="empty?.action" :size="size" @act="(a) => emit('act', a)" />
    <template v-else-if="id === 'hdr' || id === 'stream-vdd'">
      <MTileShape class="m-tile__corner" :icon="id === 'hdr' ? (hdrOn ? 'hdr_on' : 'hdr_off') : 'desktop_windows'" :shape="id === 'hdr' ? 'sunny' : 'squircle'" size="150px" :tone="hdrOn ? 'solid' : 'tonal'" />
      <MTileHead :icon="d.icon" :title="card.title" />
      <div class="m-tfacts__foot">
        <MTileNumeral :value="d.big" size="s" />
        <div v-if="d.chips?.length" class="m-tfacts__chips"><MTileChip v-for="c in d.chips" :key="c.label" :icon="c.icon" :label="c.label" /></div>
      </div>
    </template>
    <template v-else-if="id === 'display'">
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tfacts__screenrow">
        <div class="m-tfacts__screen" :style="{ aspectRatio: screen ? `${screen.w} / ${screen.h}` : '16 / 9' }"><MTileNumeral :value="d.value" size="s" /></div>
        <div v-if="size !== 's'" class="m-tfacts__side"><b class="m-dnum">{{ d.sub }}</b><MTileChip v-if="d.unit" icon="speed" :label="d.unit" tone="accent" /><MTileChip v-for="c in d.chips || []" :key="c.label" :icon="c.icon" :label="c.label" :tone="c.tone === 'ok' ? 'ok' : ''" /></div>
      </div>
      <span v-if="size === 's'" class="m-tfacts__cap m-dnum">{{ d.sub }}<template v-if="d.unit"> · {{ d.unit }}</template></span>
    </template>
    <template v-else-if="id === 'stream-resolution'">
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tfacts__screenrow">
        <div class="m-tfacts__screen" :style="{ aspectRatio: res ? `${res.w} / ${res.h}` : '16 / 9' }"><MTileNumeral :value="resLabel" size="s" /></div>
        <div v-if="size !== 's'" class="m-tfacts__side"><b class="m-dnum">{{ d.big }}</b><MTileChip v-for="r in d.rows || []" :key="r.title" :icon="r.icon" :label="`${r.title} ${r.value}`" tone="accent" /></div>
      </div>
      <span v-if="size === 's'" class="m-tfacts__cap m-dnum">{{ d.big }}<template v-if="d.rows?.[0]"> · {{ firstNumber(d.rows[0].value) }} fps</template></span>
    </template>
    <template v-else-if="id === 'sys'">
      <MTileShape class="m-tile__corner" icon="computer" shape="squircle" :size="size === 's' ? '164px' : '180px'" tone="tonal" />
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tfacts__foot">
        <b class="m-tfacts__os">{{ d.big }}</b>
        <dl v-if="size !== 's'" class="m-tfacts__rows"><div v-for="r in d.rows || []" :key="r.title"><dt>{{ r.title }}</dt><dd class="m-dnum">{{ r.value }}</dd></div></dl>
        <span v-else-if="d.rows?.[0]" class="m-tfacts__cap m-dnum">{{ d.rows[0].value }}<template v-if="d.rows[1]"> · {{ d.rows[1].value }}</template></span>
      </div>
    </template>
    <template v-else>
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tfacts__heatrow">
        <MTileNumeral :value="totalNum.v" :unit="totalNum.u" :size="size === 's' ? 's' : 'm'" :caption="size !== 's' ? d.caption : ''" />
      </div>
      <ol class="m-tfacts__heat" :data-n="days.length" aria-hidden="true"><li v-for="(x, i) in days" :key="i" :style="{ '--h': (Number(x?.value) || 0) / dayMax }" :class="{ 'is-zero': !(Number(x?.value) > 0), 'is-today': i === days.length - 1 }" /></ol>
    </template>
  </section>
</template>
