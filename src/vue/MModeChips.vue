<script setup>
import { computed } from 'vue'
import MButton from './MButton.vue'
import MIcon from './MIcon.vue'
import { shown } from '../settings/modeList.js'
import { modeListTexts } from '../settings/modeListTexts.js'

// The resolutions or refresh rates a list holds, as chips in their order, with an 编辑 button that opens the popup (MModeListDialog). The chips only show; the popup edits.
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
const chips = computed(() => props.values.map((v) => ({ key: String(v), label: shown(props.kind, v) })))
</script>

<template>
  <div class="m-modechips" :data-kind="kind">
    <header class="m-modechips__head">
      <MIcon :name="icon || (kind === 'resolution' ? 'aspect_ratio' : 'slow_motion_video')" />
      <b class="m-modechips__title">{{ title }}</b><span class="m-modechips__count">{{ values.length }}</span>
      <MButton size="sm" variant="tonal" icon="edit" :disabled="disabled" :aria-label="`${t.edit}: ${title}`" @click="emit('edit', kind)">{{ t.edit }}</MButton>
    </header>
    <ul v-if="chips.length" class="m-modechips__list"><li v-for="chip in chips" :key="chip.key" class="m-modechips__chip">{{ chip.label }}</li></ul>
    <p v-else class="m-modechips__none">{{ t.none }}</p>
  </div>
</template>

<style>
.m-modechips { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: 28px; background: var(--m-card); }
.m-modechips__head { display: flex; align-items: center; gap: 10px; color: var(--md-sys-color-on-surface-variant); }
.m-modechips__title { flex: 1 1 auto; min-width: 0; font: var(--m-title-small, 600 14px/20px sans-serif); color: var(--md-sys-color-on-surface); }
.m-modechips__count { font: var(--m-label-medium, 500 12px/16px sans-serif); font-variant-numeric: tabular-nums; padding: 2px 8px; border-radius: 8px; background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent); }
.m-modechips__list { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.m-modechips__chip { padding: 6px 12px; border-radius: 12px; border: 1px solid var(--md-sys-color-outline-variant); font: var(--m-label-large, 500 14px/20px sans-serif); font-variant-numeric: tabular-nums; color: var(--md-sys-color-on-surface); }
.m-modechips__none { margin: 0; font: var(--m-body-medium, 400 14px/20px sans-serif); color: var(--md-sys-color-on-surface-variant); }
</style>
