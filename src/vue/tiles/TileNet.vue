<script>
export const tileIds = ['net']
</script>

<script setup>
// 网卡 (REFERENCES.md "net"): the adapter of the default route, its link speed, its address; the others.
//   variant 1, the link speed as the hero (Pixel "Internet" tile, iStat's network numbers): the speed in display type, the adapter's shape cut by the corner.
//     方形: the speed and the shape · 中: + the adapter, its kind and IPv4 · 大: + every adapter as a row, IPv6, MAC
//   variant 2, a tonal connectivity tile (Pixel quick-settings tile, One UI's Wi-Fi widget): the adapter's icon in a large shape, Wi-Fi signal as a ring around it.
//     方形: the shape and the speed · 中: + the adapter, IPv4, the default-route chip · 大: + the adapters as a stack of shapes and their rows
import { computed } from 'vue'
import MIcon from '../MIcon.vue'
import MTileHead from '../MTileHead.vue'
import MTileNumeral from '../MTileNumeral.vue'
import MTileShape from '../MTileShape.vue'
import MTileRing from '../MTileRing.vue'
import MTileChip from '../MTileChip.vue'
import MTileEmpty from '../MTileEmpty.vue'
import { OPEN, sizeOf, designProps } from './tileData.js'

const props = defineProps(designProps)
const emit = defineEmits(['act'])
const d = computed(() => props.card.data || {})
const p = computed(() => d.value.primary || {})
const size = computed(() => sizeOf(props.card))
// '2.5 Gbps' -> the number and its unit; an adapter without a speed shows its kind
const speed = computed(() => { const m = /^([\d.]+)\s*(\S+)$/.exec(p.value.speed || ''); return m ? { v: m[1], u: m[2] } : { v: '', u: '' } })
const others = computed(() => (d.value.rows || []).filter((r) => !r.main))
</script>

<template>
  <section class="m-tile m-tnet" :class="[`m-tnet--v${variant}`, `is-${size}`, { 'm-tile--tonal': variant === 2 }]" data-accent="primary" :data-size="size">
    <MTileEmpty v-if="empty || !d.primary" :icon="empty?.icon || 'lan'" :title="empty?.title || card.title" :text="empty?.value || d.empty || ''" :action="empty?.action" :size="size" @act="(a) => emit('act', a)" />
    <template v-else-if="variant === 2">
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tnet__body">
        <div class="m-tnet__hero">
          <MTileRing v-if="p.wifi && p.signal !== null" class="m-tnet__signal" :value="p.signal / 100" :stroke="7" :wavy="false" />
          <MTileShape :icon="p.icon" shape="cookie" size="100%" tone="solid" />
        </div>
        <div class="m-tnet__text">
          <MTileNumeral :value="speed.v || p.kind" :unit="speed.u" :size="size === 'l' ? 'm' : 's'" :caption="size === 's' ? p.name : ''" />
          <template v-if="size !== 's'">
            <b class="m-tnet__name">{{ p.name }}<small v-if="p.ssid"> · {{ p.ssid }}</small></b>
            <span class="m-tnet__ip m-dnum">{{ p.ipv4 }}</span>
            <div class="m-tnet__chips"><MTileChip :label="p.kind" /><MTileChip v-if="p.isDefault" :label="d.labels?.default || ''" tone="accent" icon="check" /><MTileChip v-if="p.wifi && p.signal !== null" :label="`${d.labels?.signal || ''} ${p.signal} %`" /></div>
          </template>
        </div>
      </div>
      <ul v-if="size === 'l'" class="m-tnet__rows">
        <li v-for="r in d.rows" :key="r.title" :class="{ 'is-main': r.main, 'is-warn': r.tone === 'warn' }"><MTileShape :icon="r.icon" :shape="r.main ? 'cookie' : 'circle'" size="36px" /><span><b>{{ r.title }}</b><small>{{ r.sub }}</small></span></li>
      </ul>
    </template>
    <template v-else>
      <MTileShape class="m-tile__corner m-tnet__corner" :icon="p.icon" shape="cookie" :size="size === 'l' ? '230px' : '168px'" tone="tonal" />
      <MTileHead :icon="d.icon" :title="card.title" :chevron="chevron && size !== 's'" @open="emit('act', OPEN)" />
      <div class="m-tnet__main">
        <MTileNumeral :value="speed.v || p.kind" :unit="speed.u" :size="size === 'l' ? 'l' : size === 'm' ? 'm' : 's'" />
        <template v-if="size !== 's'">
          <b class="m-tnet__name">{{ p.name }} <small>{{ p.kind }}</small></b>
          <span class="m-tnet__ip m-dnum">{{ p.ipv4 }}</span>
        </template>
        <span v-else class="m-tnet__name m-tnet__name--s">{{ p.name }}</span>
      </div>
      <template v-if="size === 'l'">
        <dl class="m-tnet__facts"><div v-for="f in d.facts || []" :key="f.label"><dt>{{ f.label }}</dt><dd class="m-dnum">{{ f.value }}</dd></div></dl>
        <ul v-if="others.length" class="m-tnet__rows m-tnet__rows--plain">
          <li v-for="r in others" :key="r.title" :class="{ 'is-warn': r.tone === 'warn' }"><MIcon :name="r.icon" /><span><b>{{ r.title }}</b><small>{{ r.sub }}</small></span></li>
        </ul>
      </template>
    </template>
  </section>
</template>
