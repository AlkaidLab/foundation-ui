<script setup>
import MIcon from './MIcon.vue'

// A status block as a row of labelled pills: each pill is an icon, a short label and the value, filled tonally, and the row
// fills the width (the pills wrap and share the room). Used where a block of facts used to be a table or a card with an empty
// side: the encoder and its load, the codecs, the host. `tone` colours the pill: '' (tonal), 'live' (strong: in use right now),
// 'ok', 'auto' (decided by the host), 'off' (dim: not offered, not available).
defineProps({
  /** [{ id, icon, label, value, tone? }] */
  items: { type: Array, required: true },
  label: { type: String, default: '' },
  /** one slim line (32 high, never wraps; the labels marked optional give way to the icons when it is narrow) */
  line: { type: Boolean, default: false },
})
</script>

<template>
  <ul class="m-pills" :class="{ 'm-pills--line': line }" :aria-label="label">
    <li v-for="item in items" :key="item.id" class="m-pill" :class="item.tone && `m-pill--${item.tone}`" :title="item.title || undefined">
      <MIcon v-if="item.icon" :name="item.icon" :fill="item.tone === 'live' || item.tone === 'ok'" />
      <span class="m-pill__label" :class="{ 'is-optional': item.optionalLabel }">{{ item.label }}</span>
      <b v-if="item.value !== undefined && item.value !== ''" class="m-pill__value" :class="{ 'is-optional': item.optionalValue }">{{ item.value }}</b>
    </li>
  </ul>
</template>
