<script setup>
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'
import MIcon from './MIcon.vue'
import MUpdatedStamp from './MUpdatedStamp.vue'
import { providePageStamp } from './usePageStamp.js'
import MPageBanners from './MPageBanners.vue'

// One page of the detail pane: a small header at the very top (back arrow in a bubble on deeper pages), then the content
// in a column that starts at the left edge of the title. `lead`, `eyebrow` and the `status` slot are accepted for older callers and not shown.
const props = defineProps({
  title: { type: String, required: true },
  lead: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  back: { type: Boolean, default: false },
  backLabel: { type: String, default: 'Back' },
  /** two columns of groups on wide windows */
  cols: { type: Boolean, default: false },
  /** a full-width page (the tile pages) */
  wide: { type: Boolean, default: false },
  /** the overview: the whole width of the window, the tiles keep their own sizes */
  full: { type: Boolean, default: false },
  /** the id of the page in the notification system: its standing problems (banners) show first under the title */
  notices: { type: String, default: '' },
  /** when the data of the page was last read (ms since epoch): the "updated" stamp at the trailing end of the header. A component inside may register it with usePageStamp instead */
  updated: { type: Number, default: 0 },
  /** the stamp is a refresh button while the page can refresh; `refreshing` shows the read in progress */
  refreshing: { type: Boolean, default: false },
  /** the page handles `refresh`; a component that registers with usePageStamp makes it refreshable too */
  refreshable: { type: Boolean, default: false },
  locale: { type: String, default: '' },
})
const emit = defineEmits(['back', 'refresh'])
const slot = providePageStamp()
const stampAt = computed(() => props.updated || slot.at)
const stampLocale = computed(() => props.locale || slot.locale || 'en')
const stampBusy = computed(() => props.refreshing || slot.refreshing)
const onStamp = () => { if (slot.refresh) slot.refresh(); else emit('refresh') }
// Where the list is hidden behind the page (single pane) the page offers the way back to it.
const scene = inject('m-scene', null)
// A scene that is not MScene (the Web UI inside the control panel's frame) may want to know that a page is there to draw the Back arrow.
onMounted(() => scene?.pageMounted?.())
onBeforeUnmount(() => scene?.pageUnmounted?.())
// The title row (the back arrow in a bubble on deeper pages, with the title on the same row to its right) is the first thing of the page and scrolls away with it.
</script>

<template>
  <div class="m-page" :class="{ 'm-page--sub': back || scene?.canBack.value, 'm-page--cols': cols, 'm-page--wide': wide, 'm-page--full': full }">
    <header class="m-page__bar">
      <button v-if="back || scene?.canBack.value" type="button" class="m-page__back" :aria-label="backLabel" :data-tip="backLabel" @click="back ? emit('back') : scene.back()"><MIcon name="arrow_back" /></button>
      <h1 class="m-page__title">{{ title }}</h1>
      <div class="m-page__bar-actions"><MUpdatedStamp :at="stampAt" :locale="stampLocale" :refreshing="stampBusy" :refreshable="refreshable || !!slot.refresh" @refresh="onStamp" /><slot name="actions" /></div>
    </header>
    <div class="m-page__column"><MPageBanners v-if="notices" :page="notices" /><slot /></div>
  </div>
</template>
