<script setup>
import { ref, onMounted, onUpdated, onBeforeUnmount } from 'vue'
import MIcon from './MIcon.vue'
import { compactNeeded } from './coverFit.js'

// Application grid in the manner of a game library: cover art in a rounded frame (2:3 by default, `ratio` "16 / 9" for wide art), the title under the art,
// one card per application.
// items: [{ id, title, text?, cover?, icon?, badge?, running?, actions?: [{ id, label, icon }] }]
//  - `running`: a badge on the art (the text is `running-label`); `actions`: a row of buttons over the foot of the art on hover and focus, `action` carries { id, item }.
//    The labels never wrap: where a row with its labels is wider than its card, that card's row is data-compact (icon buttons, the label as tooltip and aria-label).
//  - `selected`: array of ids puts the grid in selection mode (a checkmark on each card, `select` toggles).
//  - `reorderable`: cards can be dragged onto each other, or moved with Alt + arrow keys; `reorder` carries { from, to } ids.
//  - `context`: right click, the context-menu key or a long press on a card.
const props = defineProps({
  items: { type: Array, required: true },
  min: { type: Number, default: 148 },
  selected: { type: Array, default: null },
  reorderable: { type: Boolean, default: false },
  ratio: { type: String, default: '2 / 3' },
  runningLabel: { type: String, default: '' },
})
const emit = defineEmits(['select', 'context', 'reorder', 'image-error', 'action'])

const root = ref(null)
// One pass over every card: the width the row needs with its labels (the buttons do not shrink) against the room the card gives it. Per card: a running card has three actions and goes icon-only first, the others keep their labels while those fit. All the writes first and all the reads
// after, so the pass is one layout, not one per card. Runs on mount, when the grid is resized (window, sidebar, columns), when the items change and when fonts arrive.
function fit() {
  const bars = root.value ? [...root.value.querySelectorAll('.m-cover__actions')] : []
  for (const bar of bars) bar.removeAttribute('data-compact')
  const need = bars.map((bar) => {
    const kids = [...bar.children]
    const style = getComputedStyle(bar)
    const gap = parseFloat(style.columnGap) || 0
    const room = bar.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
    return compactNeeded(kids.map((kid) => kid.getBoundingClientRect().width), gap, room)
  })
  // one look per grid: if any card cannot fit its labels, every card shows icons only
  const anyCompact = need.some(Boolean)
  bars.forEach((bar) => {
    const compact = anyCompact
    if (compact) bar.setAttribute('data-compact', '')
    for (const kid of bar.children) { const label = kid.querySelector('span')?.textContent?.trim(); if (compact && label) kid.setAttribute('data-tip', label); else kid.removeAttribute('data-tip') }
  })
}
let frame = 0
const schedule = () => { if (!frame && typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(() => { frame = 0; fit() }) }
let observer = null
onMounted(() => {
  fit()
  if (typeof ResizeObserver === 'function' && root.value) { observer = new ResizeObserver(schedule); observer.observe(root.value) }
  document.fonts?.ready?.then(schedule)
})
onBeforeUnmount(() => { observer?.disconnect(); if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame) })
onUpdated(schedule)

const dragging = ref(null)
const over = ref(null)
const isSelected = (item) => !!props.selected && props.selected.includes(item.id)
function onKey(event, item, index) {
  if (!props.reorderable || !event.altKey) return
  const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
  const target = props.items[index + step]
  if (!step || !target) return
  event.preventDefault()
  emit('reorder', { from: item.id, to: target.id })
}
function onDrop(item) {
  if (dragging.value != null && dragging.value !== item.id) emit('reorder', { from: dragging.value, to: item.id })
  dragging.value = over.value = null
}

// An application without a cover is its first letter on a tonal shape; the shape and the tone come from the title, so the grid is varied and a title keeps its look.
const SHAPES = ['cookie', 'clover', 'sunny', 'gem', 'burst', 'squircle']
const monoOf = (item) => {
  const title = String(item.title || '?').trim()
  let h = 0
  for (const ch of title) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return { letter: [...title][0]?.toUpperCase() || '?', shape: SHAPES[h % SHAPES.length], tone: String((h >>> 3) % 3) }
}
</script>

<template>
  <ul ref="root" class="m-cover-grid" :class="{ 'is-selecting': !!selected }" :style="{ '--m-cover-min': `${min}px`, '--m-cover-ratio': ratio }">
    <li
      v-for="(item, index) in items"
      :key="item.id"
      :data-row="item.title"
      :class="{ 'is-over': over === item.id && dragging !== item.id, 'is-dragging': dragging === item.id }"
      :draggable="reorderable || undefined"
      @dragstart="dragging = item.id; $event.dataTransfer.effectAllowed = 'move'"
      @dragover.prevent="over = item.id"
      @dragleave="over === item.id && (over = null)"
      @drop.prevent="onDrop(item)"
      @dragend="dragging = over = null"
    >
      <article class="m-cover" :class="{ 'is-selected': isSelected(item), 'is-running': !!item.running }" @contextmenu="emit('context', $event, item)">
        <div class="m-cover__frame">
          <button type="button" class="m-cover__art" tabindex="-1" aria-hidden="true" @click="emit('select', item)">
            <img v-if="item.cover" :src="item.cover" alt="" loading="lazy" decoding="async" @error="emit('image-error', $event, item)">
            <span v-else class="m-cover__mono" :class="`m-shape--${monoOf(item).shape}`" :data-tone="monoOf(item).tone" aria-hidden="true">{{ monoOf(item).letter }}</span>
          </button>
          <span v-if="selected" class="m-cover__check" aria-hidden="true"><MIcon :name="isSelected(item) ? 'check_circle' : 'radio_button_unchecked'" :fill="isSelected(item)" /></span>
          <span v-if="item.running" class="m-cover__live"><i aria-hidden="true" />{{ runningLabel }}</span>
          <slot name="badge" :item="item" />
          <span v-if="item.actions?.length && !selected" class="m-cover__actions">
            <button v-for="a in item.actions" :key="a.id" type="button" class="m-cover__act" :aria-label="`${a.label}: ${item.title}`" @click="emit('action', { id: a.id, item, event: $event })"><MIcon :name="a.icon" /><span>{{ a.label }}</span></button>
          </span>
        </div>
        <button
          type="button"
          class="m-cover__label"
          :aria-pressed="selected ? isSelected(item) : undefined"
          @click="emit('select', item)"
          @keydown="onKey($event, item, index)"
        >
          <span class="m-cover__title">{{ item.title }}</span>
          <span v-if="item.text" class="m-cover__text">{{ item.text }}</span>
          <slot name="meta" :item="item" />
        </button>
      </article>
    </li>
  </ul>
</template>
