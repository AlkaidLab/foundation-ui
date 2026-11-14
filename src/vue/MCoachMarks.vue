<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MButton from './MButton.vue'
import { vModalOpen } from '../a11y/modalLayer.js'
import { useModalBridge } from './useModalBridge.js'
import { readProgress } from './guideModel.js'
import { coachTexts } from './coachTexts.js'

// The first-use tour of the main interface, Google style (feature discovery): one element at a time is lit, the rest is dimmed with the same scrim as a modal, and a card beside it
// says in a sentence what it is for. 下一个 moves on, 知道了 ends it, 跳过 skips it, Esc too. It runs once after the first run finished (the guide announces that), can be started again
// (`foundation-coach-start` on the window, from 帮助), and skips what is not on screen: on a narrow window it points at the bottom bar instead of the rail.
// It is a modal like the first-run window: a `<dialog>` shown with showModal() (v-modal-open), so the page behind the dimming is inert (no click, no focus, no window menu).
const props = defineProps({
  locale: { type: String, default: 'en' },
  /** where "done" is remembered, one key per product */
  storageKey: { type: String, required: true },
  /** the storage key of the first-run guide whose finish starts the tour */
  guideKey: { type: String, default: '' },
  /** step id -> selectors tried in order (the first that is on screen is lit); a product overrides only what differs */
  selectors: { type: Object, default: () => ({}) },
})
const STEPS = ['rail', 'search', 'overview', 'edit', 'pair', 'config', 'system', 'help']
const DEFAULTS = {
  rail: ['.m-scene__rail', '.m-scene__bar'],
  search: ['.m-usearch__box', '.m-usearch__open'],
  overview: ['.m-dash'],
  edit: ['[data-coach="home-edit"]'],
  pair: ['[data-card="pair"]'],
  config: ['.m-rail__item[data-rail="config"]', '.m-scene__bar .m-rail__item[data-rail="settings-hub"]'],
  system: ['.m-rail__item[data-rail="system"]', '.m-scene__bar .m-rail__item[data-rail="settings-hub"]'],
  help: ['.m-rail__item[data-rail="help"]', '.m-scene__bar .m-rail__item[data-rail="more"]', '.m-scene__bar .m-rail__item[data-rail="help"]'],
}
const T = computed(() => coachTexts(props.locale))
const storage = () => { try { return globalThis.localStorage } catch { return null } }
const done = () => storage()?.getItem(props.storageKey) === '1'
const remember = () => { try { storage()?.setItem(props.storageKey, '1') } catch { /* it simply runs again next time */ } }

const open = ref(false)
const list = ref([]) // [{ id, el }] the steps that have something on screen
const at = ref(0)
const rect = ref(null)
const card = ref(null)
const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth }
const find = (id) => { for (const sel of props.selectors[id] || DEFAULTS[id] || []) { const el = document.querySelector(sel); if (el && visible(el)) return el } return null }
const current = computed(() => list.value[at.value] || null)
const last = computed(() => at.value >= list.value.length - 1)

function measure() {
  const el = current.value?.el
  if (!el || !el.isConnected) { rect.value = null; return }
  const r = el.getBoundingClientRect()
  rect.value = { l: Math.max(0, r.left - 8), t: Math.max(0, r.top - 8), r: Math.min(innerWidth, r.right + 8), b: Math.min(innerHeight, r.bottom + 8) }
}
const holeRadius = 18
const path = computed(() => {
  const r = rect.value; if (!r) return `M0 0H${innerWidth}V${innerHeight}H0Z`
  const k = Math.min(holeRadius, (r.r - r.l) / 2, (r.b - r.t) / 2)
  return `M0 0H${innerWidth}V${innerHeight}H0Z M${r.l + k} ${r.t}H${r.r - k}A${k} ${k} 0 0 1 ${r.r} ${r.t + k}V${r.b - k}A${k} ${k} 0 0 1 ${r.r - k} ${r.b}H${r.l + k}A${k} ${k} 0 0 1 ${r.l} ${r.b - k}V${r.t + k}A${k} ${k} 0 0 1 ${r.l + k} ${r.t}Z`
})
// the card sits beside the lit element where there is room (right, below, above, left), else at the bottom of the window; never outside it
const cardStyle = computed(() => {
  const r = rect.value; const W = Math.min(340, innerWidth - 24)
  if (!r) return { left: '12px', bottom: '24px', width: `${W}px` }
  const room = { right: innerWidth - r.r, left: r.l, below: innerHeight - r.b, above: r.t }
  const clampX = (x) => Math.max(12, Math.min(innerWidth - W - 12, x))
  const clampY = (y) => Math.max(12, Math.min(innerHeight - 200, y))
  if (innerWidth >= 600 && room.right >= W + 24) return { left: `${r.r + 16}px`, top: `${clampY(r.t)}px`, width: `${W}px` }
  if (room.below >= 190) return { left: `${clampX(r.l)}px`, top: `${r.b + 16}px`, width: `${W}px` }
  if (room.above >= 190) return { left: `${clampX(r.l)}px`, bottom: `${innerHeight - r.t + 16}px`, width: `${W}px` }
  if (innerWidth >= 600 && room.left >= W + 24) return { left: `${r.l - W - 16}px`, top: `${clampY(r.t)}px`, width: `${W}px` }
  return { left: `${clampX(innerWidth / 2 - W / 2)}px`, bottom: '24px', width: `${W}px` }
})

async function start(force = false) {
  if (open.value || (!force && done())) return
  list.value = STEPS.map((id) => ({ id, el: find(id) })).filter((s) => s.el)
  if (!list.value.length) return
  at.value = 0; open.value = true
  await nextTick(); measure(); card.value?.focus?.()
}
function show(i) { at.value = i; const el = current.value?.el; el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); measure() }
function next() { if (last.value) end(); else { show(at.value + 1); nextTick(() => card.value?.focus?.()) } }
function end() { open.value = false; remember() }
useModalBridge(open, end)
function onKey(e) {
  if (!open.value) return
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end() }
  else if (e.key === 'ArrowRight' || e.key === 'Enter') { if (document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); next() } }
}
function onGuide(e) {
  const key = e?.detail?.key || props.guideKey
  if (!props.guideKey || key !== props.guideKey) return
  if (readProgress(null, key).finished) setTimeout(() => start(false), 900)
}
const onStart = () => start(true)
let raf = 0
const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
onMounted(() => {
  window.addEventListener('foundation-guide-progress', onGuide)
  window.addEventListener('foundation-coach-start', onStart)
  window.addEventListener('resize', onMove); window.addEventListener('scroll', onMove, true)
  window.addEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('foundation-guide-progress', onGuide); window.removeEventListener('foundation-coach-start', onStart)
  window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true); window.removeEventListener('keydown', onKey, true)
  cancelAnimationFrame(raf)
})
defineExpose({ start })
</script>

<template>
  <Teleport to="body">
    <Transition name="m-coach">
      <dialog v-if="open" v-modal-open class="m-coach" :aria-label="T.steps[current.id].title" @cancel.prevent="end">
        <svg class="m-coach__scrim" :width="innerWidth" :height="innerHeight" aria-hidden="true" focusable="false"><path :d="path" fill-rule="evenodd" /></svg>
        <div v-if="rect" class="m-coach__ring" aria-hidden="true" :style="{ left: `${rect.l}px`, top: `${rect.t}px`, width: `${rect.r - rect.l}px`, height: `${rect.b - rect.t}px` }" />
        <section ref="card" class="m-coach__card" aria-live="polite" tabindex="-1" :style="cardStyle">
          <h2 class="m-coach__title">{{ T.steps[current.id].title }}</h2>
          <p class="m-coach__text">{{ T.steps[current.id].text }}</p>
          <div class="m-coach__foot">
            <span class="m-coach__dots" aria-hidden="true"><i v-for="(s, i) in list" :key="s.id" :class="{ 'is-on': i === at }" /></span>
            <span class="m-coach__count">{{ at + 1 }} / {{ list.length }}</span>
            <span class="m-coach__spacer" />
            <MButton v-if="!last" variant="text" size="sm" @click="end">{{ T.skip }}</MButton>
            <MButton size="sm" @click="next">{{ last ? T.done : T.next }}</MButton>
          </div>
        </section>
      </dialog>
    </Transition>
  </Teleport>
</template>
