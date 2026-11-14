<script setup>
import { ref, useId } from 'vue'
import MIcon from './MIcon.vue'

// The 高级 expander of a page: one row that opens the settings most people never touch. Closed it is a single quiet line; opening it keeps the page where it is.
// `open` can be set from outside (a search hit or a link to a setting inside opens it).
const open = defineModel('open', { type: Boolean, default: false })
defineProps({
  title: { type: String, required: true },
  /** one short line under the title: the state or the count, never what the title says */
  text: { type: String, default: '' },
  icon: { type: String, default: 'tune' },
})
const id = `m-exp-${useId()}`
const body = ref(null)
</script>

<template>
  <section class="m-expander" :class="{ 'is-open': open }">
    <button type="button" class="m-expander__head" :aria-expanded="open" :aria-controls="id" @click="open = !open">
      <MIcon class="m-expander__icon" :name="icon" />
      <span class="m-expander__title">{{ title }}</span>
      <span v-if="text" class="m-expander__text">{{ text }}</span>
      <MIcon class="m-expander__chev" name="keyboard_arrow_down" />
    </button>
    <div v-show="open" :id="id" ref="body" class="m-expander__body"><slot /></div>
  </section>
</template>

<style>
.m-expander { display: flex; flex-direction: column; gap: 12px; }
.m-expander__head { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 20px; border-radius: 28px; background: var(--m-card); color: var(--md-sys-color-on-surface); cursor: pointer; transition: background-color .2s, border-radius .2s; }
.m-expander__head:hover { background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, var(--m-card)); }
.m-expander__head:focus-visible { outline: 2px solid var(--md-sys-color-primary); outline-offset: 2px; }
.m-expander.is-open .m-expander__head { border-radius: 28px 28px 12px 12px; }
.m-expander__icon { color: var(--md-sys-color-on-surface-variant); }
.m-expander__title { flex: 1 1 auto; font: var(--m-title-small, 600 14px/20px sans-serif); }
.m-expander__text { font: var(--m-body-medium, 400 14px/20px sans-serif); color: var(--md-sys-color-on-surface-variant); font-variant-numeric: tabular-nums; }
.m-expander__chev { transition: transform .25s; color: var(--md-sys-color-on-surface-variant); }
.m-expander.is-open .m-expander__chev { transform: rotate(180deg); }
.m-expander__body { display: flex; flex-direction: column; gap: 16px; }
</style>
