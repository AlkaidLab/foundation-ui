<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import MDashCardView from './MDashCardView.vue'
import MDashStackSuggest from './MDashStackSuggest.vue'
import { createWheelGesture, rubber, swipeIntent, swipeVerdict, velocityOf } from './stackGesture.js'

// A smart stack (智能轮换组) on the overview: tiles of one size in one place, the one shown turns by a vertical swipe (the page follows the finger, the next one comes in under it, it snaps or springs back;
// stackGesture.js: the page keeps its own scroll), the wheel or a two-finger scroll over it (one member per gesture), the page dots and the keys
// (by hand), and by smart rotation (MHomeDash, dash/dashGrid.js: only when the page comes back after being away, never under the pointer). The pin keeps the card shown and turns smart rotation off for this stack.
// Only the member shown is drawn (and, for the moment of a turn, the one leaving): the others cost nothing. A turn by hand is a vertical shared-axis move on the spatial spring (the one leaving slides and
// fades up, the next comes in from below); a turn by the host is a short crossfade and nothing else; reduced motion: no movement at all.
const props = defineProps({
  card: { type: Object, required: true }, // { id, stack: { members: [boxed member cards at the stack's size], active, smartRotate }, ... }
  details: { type: Object, default: () => ({}) },
  texts: { type: Object, default: () => ({}) },
  preview: { type: Boolean, default: false },
})
const emit = defineEmits(['act', 'rotate', 'hover', 'suggest', 'say', 'flags'])
const members = computed(() => props.card.stack?.members || [])
// the member shown: by id when the card carries it (a member without data is not in the list), else the saved index
const active = computed(() => { const i = props.card.stack?.activeId ? members.value.findIndex((m) => m.id === props.card.stack.activeId) : -1; return i >= 0 ? i : Math.max(0, Math.min(members.value.length - 1, props.card.stack?.active ?? 0)) })
const pinned = computed(() => props.card.stack?.smartRotate === false)
const fade = ref(false) // the turn that is under way is the host's, not the person's: a crossfade
const shown = computed(() => members.value[active.value])
const dir = ref(1) // 1: the next one comes from below, -1: from above
const T = computed(() => props.texts)
// the suggestion (stack.suggestions on): one more page after the last tile, reached by turning by hand and never by smart rotation; it offers a tile that belongs with the others (MHomeDash suggestFor)
const suggestion = computed(() => (props.preview ? null : props.card.suggestion || null))
const sug = ref(false)
const total = computed(() => members.value.length + (suggestion.value ? 1 : 0))
const pos = computed(() => (sug.value && suggestion.value ? members.value.length : active.value))
const sugLabel = computed(() => String(T.value.stackSuggestLabel || 'Suggestion: add {name}').replace('{name}', suggestion.value?.title || ''))
const label = computed(() => (sug.value && suggestion.value ? sugLabel.value : String(T.value.stackLabel || '{k} / {n}: {name}').replace('{k}', active.value + 1).replace('{n}', members.value.length).replace('{name}', shown.value?.title || '')))
let last = active.value
let byHand = false
watch(active, (now) => { sug.value = false; fade.value = !byHand; if (byHand) dir.value = now > last || (last === members.value.length - 1 && now === 0) ? 1 : -1; byHand = false; last = now })
watch(suggestion, (v) => { if (!v) sug.value = false })
// the turns of the person are told by the page (MHomeDash: the polite live region); a turn of the host is not
const turn = (by, source = 'manual') => {
  if (total.value < 2) return
  const to = (pos.value + by + total.value) % total.value; dir.value = by > 0 ? 1 : -1
  if (suggestion.value && to === members.value.length) { sug.value = true; if (source === 'manual') emit('say', sugLabel.value); return }
  sug.value = false; byHand = source === 'manual'; emit('rotate', { id: props.card.id, index: to, tile: members.value[to]?.id, source })
}
// a page dot: that member, by hand
const pick = (to) => { if (to === pos.value) return; dir.value = to > pos.value ? 1 : -1; if (suggestion.value && to === members.value.length) { sug.value = true; emit('say', sugLabel.value); return } sug.value = false; byHand = true; emit('rotate', { id: props.card.id, index: to, tile: members.value[to]?.id, source: 'manual' }) }
const dotLabel = (m, i) => String(T.value.stackLabel || '{k} / {n}: {name}').replace('{k}', i + 1).replace('{n}', members.value.length).replace('{name}', m.title || '')
const pin = () => { const on = !pinned.value; emit('flags', { id: props.card.id, patch: { smartRotate: !on } }); emit('say', on ? (T.value.stackPinned || 'Pinned: {name}').replace('{name}', shown.value?.title || '') : (T.value.stackUnpinned || 'Unpinned').replace('{name}', shown.value?.title || '')) }
const sugAct = (action) => { const id = suggestion.value?.id; if (!id) return; sug.value = false; emit('suggest', { id: props.card.id, tile: id, action }) }
let backTimer = 0
const enter = () => { clearTimeout(backTimer); emit('hover', { id: props.card.id, on: true }) }
// the keyboard focus on the stack holds it too (nothing turns under someone who is reading it with the keys)
const focusIn = () => emit('hover', { id: props.card.id, on: true, by: 'focus' })
const focusOut = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) emit('hover', { id: props.card.id, on: false, by: 'focus' }) }
const leave = () => { emit('hover', { id: props.card.id, on: false }); clearTimeout(backTimer); if (sug.value) backTimer = setTimeout(() => { sug.value = false }, 8000) }
const root = ref(null)
const viewEl = ref(null)
// the member a step reaches: 0 .. members - 1, the suggestion after the last one (the ends do not wrap by gesture; the keys and the dots do)
const reach = (by) => { const i = pos.value + by; return i >= 0 && i < total.value ? i : -1 }
const canTurn = (by) => reach(by) >= 0
// ---- the wheel (a mouse wheel, a two-finger scroll on a trackpad): one member per gesture, only a gesture that began over the stack, never the page's own scroll (stackGesture.js)
const wheelGesture = createWheelGesture()
let anyWheelPrev = -Infinity, anyWheelLast = -Infinity
const seeWheel = (e) => { anyWheelPrev = anyWheelLast; anyWheelLast = e.timeStamp }
if (typeof window !== 'undefined') { window.addEventListener('wheel', seeWheel, { capture: true, passive: true }); onBeforeUnmount(() => window.removeEventListener('wheel', seeWheel, { capture: true })) }
const wheel = (e) => {
  if (props.preview || e.ctrlKey || settling.value) return
  const r = wheelGesture.handle(e, e.timeStamp, anyWheelPrev, canTurn, viewEl.value?.clientHeight || 400)
  if (r.own && e.cancelable) e.preventDefault()
  if (r.step) turn(r.step)
}
// ---- a swipe: the page follows the finger, the neighbour comes in under it; on the lift it snaps to the next member or springs back (touch: the first movement decides who has the finger)
const drag = ref({ on: false, y: 0, settling: false })
const peekBy = ref(0) // 1: the next one is under the page being moved, -1: the one before, 0: none
const skipAnim = ref(false) // the turn that ends a swipe has been drawn already: no second move
let startY = 0, startX = 0, pid = null, lock = '', pointerType = '', H = 1, samples = [], settleTimer = 0
const settling = computed(() => drag.value.settling)
const peekIndex = computed(() => (peekBy.value ? reach(peekBy.value) : -1))
const peekPage = computed(() => (peekIndex.value < 0 ? null : peekIndex.value === members.value.length ? { suggestion: suggestion.value } : { member: members.value[peekIndex.value] }))
const pageY = (y) => (peekBy.value && !canTurn(peekBy.value) ? rubber(y, H) : y)
const moveEase = 'var(--m-spring-default-spatial-duration, 300ms) var(--m-spring-default-spatial, ease)'
const pageStyle = computed(() => (drag.value.on ? { transform: `translateY(${drag.value.y}px)`, transition: drag.value.settling ? `transform ${moveEase}` : 'none' } : undefined))
const peekStyle = computed(() => (drag.value.on ? { transform: `translateY(${drag.value.y + (peekBy.value > 0 ? H : -H)}px)`, transition: drag.value.settling ? `transform ${moveEase}` : 'none' } : undefined))
const isReduced = () => document.documentElement.dataset.motion === 'reduced' || (document.documentElement.dataset.motion !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches)
// can the page (the nearest scroller above the stack) still scroll the way a finger moving this way takes it: finger up (dir 1) scrolls it down
const pageCanScroll = (dir) => {
  let el = root.value?.parentElement
  for (; el; el = el.parentElement) { const o = getComputedStyle(el).overflowY; if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) break }
  el = el || document.scrollingElement
  if (!el) return false
  return dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 1
}
const down = (e) => {
  if (props.preview || e.button > 0 || settling.value || e.target.closest('button, a, input, [role=switch]')) return
  pid = e.pointerId; pointerType = e.pointerType; startY = e.clientY; startX = e.clientX; lock = ''; samples = [{ t: e.timeStamp, y: e.clientY }]
  H = viewEl.value?.clientHeight || 1
  if (e.pointerType === 'touch') emit('hover', { id: props.card.id, on: true, by: 'touch' })
}
const move = (e) => {
  if (e.pointerId !== pid) return
  const dx = e.clientX - startX, dy = e.clientY - startY
  if (!lock) {
    const touch = pointerType === 'touch'
    const why = swipeIntent(dx, dy, { canTurn, pageCanScroll, touch })
    if (!why) return
    lock = why
    if (why === 'page') { pid = null; endTouch(); return }
    drag.value = { on: true, y: 0, settling: false }
    if (!touch) e.currentTarget.setPointerCapture?.(pid)
  }
  samples.push({ t: e.timeStamp, y: e.clientY }); if (samples.length > 12) samples.shift()
  const by = dy < 0 ? 1 : -1
  if (peekBy.value !== by) peekBy.value = by
  drag.value = { on: true, y: pageY(dy), settling: false }
}
// the page's own scroll is the browser's unless the stack has the finger: that is decided on the first movement, before the browser has started to scroll (a touchmove can be cancelled until then)
const touchMove = (e) => { if (lock === 'swipe' && e.cancelable) e.preventDefault() }
const endTouch = () => { if (pointerType === 'touch') emit('hover', { id: props.card.id, on: false, by: 'touch' }) }
const finish = () => { drag.value = { on: false, y: 0, settling: false }; peekBy.value = 0; settleTimer = 0 }
// the lift: the turn is made (and the neighbour, drawn under the page all the way, is the page that stays: no second move) and the drag state ends in the same frame
const commit = (verdict) => { if (verdict) { skipAnim.value = true; turn(verdict) } finish(); nextTick(() => { skipAnim.value = false }) }
const up = (e) => {
  if (e.pointerId !== pid) return
  pid = null; endTouch()
  if (lock !== 'swipe') { lock = ''; return }
  lock = ''
  const verdict = e.type === 'pointercancel' ? 0 : swipeVerdict(e.clientY - startY, velocityOf(samples, e.timeStamp), H, { canTurn })
  if (isReduced()) { commit(verdict); return }
  drag.value = { on: true, y: verdict ? (verdict > 0 ? -H : H) : 0, settling: true }
  clearTimeout(settleTimer)
  const from = pos.value
  // a member chosen meanwhile (a dot, a key) stands: the swipe that was settling does not turn it on from there
  settleTimer = setTimeout(() => commit(pos.value === from ? verdict : 0), 300)
}
const key = (e) => {
  if (e.target !== e.currentTarget && e.target.closest('button')) return
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') { e.preventDefault(); turn(1) } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') { e.preventDefault(); turn(-1) } else if (e.key === 'Home' && total.value > 1) { e.preventDefault(); pick(0) } else if (e.key === 'End' && total.value > 1) { e.preventDefault(); pick(members.value.length - 1) } else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); pin() }
}
onBeforeUnmount(() => { pid = null; clearTimeout(backTimer); clearTimeout(settleTimer); emit('hover', { id: props.card.id, on: false }); emit('hover', { id: props.card.id, on: false, by: 'focus' }) })
</script>

<template>
  <div ref="root" class="m-dstack" role="group" aria-roledescription="轮换组" :aria-label="label" tabindex="0" :data-stack="card.id" :data-count="members.length" :class="{ 'is-dragging': drag.on }"
    @pointerenter="enter" @pointerleave="leave" @focusin="focusIn" @focusout="focusOut" @wheel="wheel" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @touchmove="touchMove" @keydown="key">
    <div ref="viewEl" class="m-dstack__view">
      <div v-if="drag.on && peekPage" class="m-dstack__page m-dstack__peek" :style="peekStyle" aria-hidden="true" inert>
        <MDashStackSuggest v-if="peekPage.suggestion" :suggestion="peekPage.suggestion" :texts="texts" />
        <MDashCardView v-else :card="peekPage.member" :details="details" :texts="texts" :preview="true" />
      </div>
      <Transition :name="skipAnim ? 'm-dstack-none' : fade ? 'm-dstack-fade' : dir > 0 ? 'm-dstack-up' : 'm-dstack-down'">
        <div :key="sug && suggestion ? `suggest:${suggestion.id}` : shown?.id" class="m-dstack__page" :style="pageStyle">
          <MDashStackSuggest v-if="sug && suggestion" :suggestion="suggestion" :texts="texts" @act="sugAct" />
          <MDashCardView v-else-if="shown" :card="shown" :details="details" :texts="texts" :preview="preview" @act="(a) => emit('act', a)" />
        </div>
      </Transition>
    </div>
    <div v-if="!preview" class="m-dstack__dots" :class="{ 'is-pinned': pinned }" role="group" :aria-label="T.stackDots || '轮换组'">
      <button v-for="(m, i) in members" :key="m.id" type="button" class="m-dstack__dot" :class="{ 'is-on': i === pos }" :data-dot="m.id" :aria-label="dotLabel(m, i)" :aria-current="i === pos ? 'true' : undefined" :data-tip="m.title" @click.stop="pick(i)" @pointerdown.stop><i /></button>
      <button v-if="suggestion" type="button" class="m-dstack__dot is-suggest" :class="{ 'is-on': pos === members.length }" :aria-label="sugLabel" @click.stop="pick(members.length)" @pointerdown.stop><i /></button>
      <button type="button" class="m-dstack__pin" :class="{ 'is-on': pinned }" data-stack-pin :aria-pressed="pinned" :aria-label="pinned ? (T.stackUnpin || '取消固定') : (T.stackPin || '固定这张卡片')" :data-tip="pinned ? (T.stackUnpin || '取消固定') : (T.stackPin || '固定这张卡片')" @click.stop="pin" @pointerdown.stop><MIcon name="keep" /></button>
    </div>
    <span v-if="preview" class="m-dstack__mark"><MIcon name="library_add" />{{ members.length }}</span>
  </div>
</template>
