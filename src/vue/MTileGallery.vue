<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import { SIZE_BOX } from './homeSizes.js'
import { useFlip } from './flipGroup.js'

// The tile gallery (after the widget galleries of Android and iPadOS on tablets): a list of categories at the left, and at the right the tiles, each in a frame of its own, drawn LIVE at the
// size it has on the overview (scaled down only where it is wider than the room). A tile with several sizes is paged, not switched with buttons: swipe the preview sideways, or press the arrows,
// the page dots or the arrow keys; the preview changes size with a slide, the size's name and box are the caption, and there is ONE button: 添加, or 已添加 for a tile that is already on the overview.
// A tile pressed and dragged out of its frame goes onto the overview (the parent takes the pointer over: `pick`); a sideways drag on the preview is the swipe, any other direction is the drag-out.
const props = defineProps({
  entries: { type: Array, required: true }, // [{ id, card, title, group, added, merged, sizeKeys, sizeKey, size, w, h }]
  groups: { type: Array, required: true }, // [{ id, title, icon, count }] (the first is 'all')
  group: { type: String, default: 'all' },
  texts: { type: Object, default: () => ({}) },
  variants: { type: Array, default: () => [] }, // the component-status entry: [{ id, label, on }]
  empty: { type: String, default: '' },
  fit: { type: String, default: 'auto' }, // 'grow': a card that shows a larger size spans more columns; 'scale': every card keeps its column and the preview is scaled to it; 'auto': scaled while readable, else grows
})
const emit = defineEmits(['update:group', 'add', 'size', 'variant', 'pick'])
const GAP = 20
const STAGE_PAD = 28 // the stage is the card less its padding (14 px each side)
const MAIN_PAD = 4 // the 2 px padding of .m-gal__main at each side
const main = ref(null)
const room = ref(900)
let ro = null
watch(main, (el) => { ro?.disconnect(); if (!el) return; ro = new ResizeObserver(() => { room.value = Math.max(300, el.clientWidth - MAIN_PAD) }); ro.observe(el); room.value = Math.max(300, el.clientWidth - MAIN_PAD) }, { immediate: true })
onBeforeUnmount(() => ro?.disconnect())
const cols = computed(() => Math.max(1, Math.floor((room.value + GAP) / (400 + GAP))))
const colW = computed(() => (room.value - (cols.value - 1) * GAP) / cols.value)
// a tile spans as many columns as it needs to be shown at its real size (at most all of them); wider than that it is scaled down to the room
// 'auto': a tile stays in its column while it is still readable there (scaled to at least MIN_SCALE), only the sizes that would be too small span more columns
const MIN_SCALE = 0.7
const growSpan = (e) => Math.min(cols.value, Math.max(1, Math.ceil((e.w + GAP) / (colW.value + GAP) - 0.02)))
const spanOf = (e) => (props.fit === 'scale' ? 1 : props.fit === 'auto' && (colW.value - STAGE_PAD) / Math.max(1, e.w) >= MIN_SCALE ? 1 : growSpan(e))
const widthOf = (e) => spanOf(e) * colW.value + (spanOf(e) - 1) * GAP
const scaleOf = (e) => Math.min(1, (widthOf(e) - STAGE_PAD) / Math.max(1, e.w))
const T = computed(() => props.texts)
// a card that grows moves the others on the spring (FLIP, flipGroup.js: nothing is read or cloned on the updates of the live previews, which a TransitionGroup does on every one)
const grid = ref(null)
const flipSig = computed(() => `${cols.value}:${props.entries.map((e) => `${e.id}:${e.sizeKey}:${spanOf(e)}`).join(',')}`)
useFlip({ root: grid, select: '.m-gal__card', keyOf: (el) => el.dataset.add, signature: () => flipSig.value, enabled: () => document.documentElement.dataset.motion === 'full', arrive: false })
const sizeName = (k) => T.value[`sizeName${k.toUpperCase()}`] || k.toUpperCase()
const boxOfKey = (k) => { const b = SIZE_BOX[k]; return b ? `${b[0]} × ${b[1]}` : '' }
const index = (e) => Math.max(0, e.sizeKeys.indexOf(e.sizeKey))
const dir = ref(1)
// one step through the sizes: the preview slides the way the page turns (it does not wrap: the dots and the arrows show where it is)
const step = (e, by) => { const i = index(e) + by; if (i < 0 || i >= e.sizeKeys.length) return; dir.value = by; emit('size', e.id, e.sizeKeys[i]) }
const goto = (e, k) => { const to = e.sizeKeys.indexOf(k); if (to < 0 || k === e.sizeKey) return; dir.value = to > index(e) ? 1 : -1; emit('size', e.id, k) }
// the pointer on a card: on the preview a sideways drag is the swipe (the preview follows the finger, a drag of 48 px turns the page), any other drag takes the tile out; elsewhere on the card it takes it out
const swipe = ref({ id: '', dx: 0 })
function cardDown(event, e) {
  if (event.button > 0 || event.target.closest('button, [role=tab], [role=radio]')) return
  if (!event.target.closest('.m-gal__stage') || e.sizeKeys.length < 2) { emit('pick', event, e.id); return }
  const sx = event.clientX, sy = event.clientY, pid = event.pointerId
  let mode = ''
  const off = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up) }
  const move = (m) => {
    if (m.pointerId !== pid) return
    const dx = m.clientX - sx, dy = m.clientY - sy
    if (!mode && Math.hypot(dx, dy) > 8) { mode = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'swipe' : 'pick'; if (mode === 'pick') { off(); emit('pick', event, e.id) } }
    if (mode === 'swipe') swipe.value = { id: e.id, dx }
  }
  const up = (u) => {
    if (u.pointerId !== pid) return
    off()
    if (mode === 'swipe') { const dx = u.clientX - sx; swipe.value = { id: '', dx: 0 }; if (Math.abs(dx) > 48) step(e, dx < 0 ? 1 : -1) }
  }
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up)
}
const key = (event, e) => {
  if (event.target !== event.currentTarget) return
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!e.added) emit('add', e.id) }
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); step(e, 1) }
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); step(e, -1) }
  else if (event.key === 'Home') { event.preventDefault(); goto(e, e.sizeKeys[0]) }
  else if (event.key === 'End') { event.preventDefault(); goto(e, e.sizeKeys[e.sizeKeys.length - 1]) }
}
</script>

<template>
  <div class="m-gal" data-variant="slide">
    <nav class="m-gal__nav" role="tablist" aria-orientation="vertical">
      <button v-for="g in groups" :key="g.id" type="button" role="tab" class="m-gal__cat" :class="{ 'is-on': group === g.id }" :aria-selected="group === g.id" @click="emit('update:group', g.id)">
        <MIcon :name="g.icon" /><span>{{ g.title }}</span><small>{{ g.count }}</small>
      </button>
    </nav>
    <div ref="main" class="m-gal__main">
      <div ref="grid" class="m-gal__grid" :data-fit="fit" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: `${GAP}px` }">
        <article v-for="e in entries" :key="e.id" class="m-gal__card" :class="{ 'is-added': e.added }" :style="{ gridColumn: `span ${spanOf(e)}` }" :data-add="e.id" tabindex="0" role="group" :aria-roledescription="e.sizeKeys.length > 1 ? 'carousel' : undefined" :aria-label="e.title" @pointerdown="cardDown($event, e)" @keydown="key($event, e)">
          <div class="m-gal__stage" :style="{ height: `${Math.max(72, e.h * scaleOf(e))}px` }">
            <Transition :name="dir > 0 ? 'gal-next' : 'gal-prev'" mode="out-in">
              <div :key="e.sizeKey" class="m-gal__scaled" :class="{ 'is-swiping': swipe.id === e.id }" :style="{ '--gal-scale': scaleOf(e), width: `${e.w * scaleOf(e)}px`, height: `${e.h * scaleOf(e)}px`, transform: `translateX(${swipe.id === e.id ? swipe.dx * 0.6 : 0}px)` }" aria-hidden="true"><div class="m-gal__sized" :style="{ width: `${e.w}px`, height: `${e.h}px`, transform: `scale(${scaleOf(e)})` }"><slot name="preview" :entry="e" /></div></div>
            </Transition>
          </div>
          <div v-if="e.sizeKeys.length > 1" class="m-gal__pager"><button v-if="e.sizeKeys.length > 1" type="button" class="m-gal__arrow m-gal__arrow--prev" :disabled="index(e) === 0" :aria-label="`${T.galSmaller || 'Smaller'}: ${e.title}`" :data-tip="T.galSmaller || 'Smaller'" @click.stop="step(e, -1)"><MIcon name="chevron_left" /></button><div v-if="e.sizeKeys.length > 1" class="m-gal__dots" role="tablist" :aria-label="T.size"><button v-for="k in e.sizeKeys" :key="k" type="button" role="tab" class="m-gal__dot" :class="{ 'is-on': e.sizeKey === k }" :aria-selected="e.sizeKey === k" :aria-label="sizeName(k)" @click.stop="goto(e, k)"><i /></button></div><button v-if="e.sizeKeys.length > 1" type="button" class="m-gal__arrow m-gal__arrow--next" :disabled="index(e) === e.sizeKeys.length - 1" :aria-label="`${T.galLarger || 'Larger'}: ${e.title}`" :data-tip="T.galLarger || 'Larger'" @click.stop="step(e, 1)"><MIcon name="chevron_right" /></button></div>
          <footer class="m-gal__foot">
            <div class="m-gal__title"><b>{{ e.title }}</b><span class="m-gal__cap" aria-live="polite">{{ sizeName(e.sizeKey) }} · {{ boxOfKey(e.sizeKey) }}</span></div>
            <button type="button" class="m-gal__add" :class="{ 'is-added': e.added }" :disabled="e.added" :aria-label="`${e.added ? T.galAdded : T.galAdd}: ${e.title}`" @click.stop="emit('add', e.id)"><MIcon :name="e.added ? 'check' : 'add'" />{{ e.added ? T.galAdded : T.galAdd }}</button>
          </footer>
          <div v-if="e.merged && variants.length" class="m-gal__variants" role="radiogroup" :aria-label="T.compStatus">
            <button v-for="v in variants" :key="v.id" type="button" role="radio" class="m-gal__variant" :class="{ 'is-on': v.on }" :aria-checked="v.on" @click.stop="emit('variant', v.id)">{{ v.label }}</button>
          </div>
        </article>
      </div>
      <p v-if="!entries.length" class="m-gal__empty">{{ empty }}</p>
    </div>
  </div>
</template>
