<script setup>
import { computed } from 'vue'
import MButton from './MButton.vue'
import MItem from './MItem.vue'
import { shown } from '../settings/modeList.js'
import { modeListTexts } from '../settings/modeListTexts.js'

// The current resolutions or refresh rates as one read-only row: the values in their order, an 编辑 button at the right that opens the popup (MModeListDialog).
const props = defineProps({
  kind: { type: String, required: true, validator: (v) => v === 'resolution' || v === 'rate' },
  values: { type: Array, required: true },
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  locale: { type: String, default: 'en' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['edit'])
const t = computed(() => modeListTexts(props.locale))
const line = computed(() => (props.values.length ? props.values.map((v) => shown(props.kind, v)).join(' · ') : t.value.none))
</script>

<template>
  <MItem :title="title" :icon="icon || (kind === 'resolution' ? 'aspect_ratio' : 'slow_motion_video')">
    <span class="m-mode-row__line" :title="line">{{ line }}</span>
    <template #trail><MButton size="sm" variant="tonal" icon="edit" :disabled="disabled" :aria-label="`${t.edit}: ${title}`" @click="emit('edit', kind)">{{ t.edit }}</MButton></template>
  </MItem>
</template>

<style>
.m-mode-row__line { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-variant-numeric: tabular-nums; }
</style>
