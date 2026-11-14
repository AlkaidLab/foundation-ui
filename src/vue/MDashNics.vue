<script setup>
import MIcon from './MIcon.vue'

// 网卡: the adapter that carries the default route (its type, link speed, IPv4 and, for Wi-Fi, the signal); medium adds the next adapter (the default one is the line above), large lists them all and adds IPv6, the MAC (masked) and the route.
defineProps({ data: { type: Object, required: true }, size: { type: String, default: 's' } })
const bars = (signal) => (signal === null ? 0 : Math.max(1, Math.min(4, Math.ceil(signal / 25))))
</script>

<template>
  <section class="m-dcard m-dnics" :class="`m-dnics--${size}`">
    <header class="m-dcard__head"><MIcon class="m-dcard__icon" :name="data.icon" /><h3 class="m-dcard__title">{{ data.title }}</h3></header>
    <div class="m-dnics__main">
      <span class="m-dnics__ico"><MIcon :name="data.primary.icon" fill /></span>
      <div class="m-dnics__text"><b>{{ data.primary.kind }}<template v-if="data.primary.speed"> · {{ data.primary.speed }}</template></b><small data-redact="address">{{ [data.primary.ipv4, data.primary.ssid].filter(Boolean).join(' · ') || data.primary.name }}</small></div>
      <span v-if="data.primary.wifi && data.primary.signal !== null" class="m-dnics__bars" :aria-label="`${data.labels.signal} ${data.primary.signal}`"><i v-for="n in 4" :key="n" :class="{ on: n <= bars(data.primary.signal) }" :style="{ height: `${n * 4 + 2}px` }" /></span>
    </div>
    <ul v-if="size !== 's'" class="m-dnics__rows"><li v-for="r in data.rows.filter((x) => size === 'l' || !x.main).slice(0, size === 'l' ? 8 : 1)" :key="r.title" :class="{ 'is-main': r.main, 'is-down': r.tone === 'warn' }"><MIcon :name="r.icon" /><span><b>{{ r.title }}</b><small data-redact="address">{{ r.sub }}</small></span></li></ul>
    <dl v-if="size === 'l'" class="m-dnics__facts"><div v-for="f in data.facts" :key="f.label"><dt>{{ f.label }}</dt><dd data-redact="address">{{ f.value }}</dd></div></dl>
  </section>
</template>
