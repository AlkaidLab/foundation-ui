<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import MDashCardView from './MDashCardView.vue'

// A smart stack (智能轮换组) on the overview: tiles of one size in one place, the one shown turns by a vertical swipe, the wheel while the pointer rests on it, the page dots and the keys
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
// a sideways wheel turns the stack only while the pointer has rested on it a moment (the page scrolls under a pointer that is only passing) and with a pause between turns
let enteredAt = 0, wheelAt = 0
const enter = () => { enteredAt = performance.now(); clearTimeout(backTimer); emit('hover', { id: props.card.id, on: true }) }
// the keyboard focus on the stack holds it too (nothing turns under someone who is reading it with the keys)
const focusIn = () => emit('hover', { id: props.card.id, on: true, by: 'focus' })
const focusOut = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) emit('hover', { id: props.card.id, on: false, by: 'focus' }) }
const leave = () => { enteredAt = 0; emit('hover', { id: props.card.id, on: false }); clearTimeout(backTimer); if (sug.value) backTimer = setTimeout(() => { sug.value = false }, 8000) }
// only a sideways wheel turns it (a tilt wheel, Shift + wheel): a plain vertical wheel always scrolls the page, so the wheel never gets stuck over a tile
const stackWheelTurn = (e) => (Math.abs(e.deltaX) >= 6 && Math.abs(e.deltaX) > Math.abs(e.deltaY) ? (e.deltaX > 0 ? 1 : -1) : 0)
const wheel = (e) => {
  const dir = stackWheelTurn(e)
  if (props.preview || !enteredAt || performance.now() - enteredAt < 350 || !dir) return
  if (performance.now() - wheelAt < 450) { if (e.cancelable) e.preventDefault(); return }
  wheelAt = performance.now(); if (e.cancelable) e.preventDefault(); turn(dir)
}
// a vertical swipe: the page under the finger follows (with resistance), on release a turn (past 40 px) or a spring back
const drag = ref({ on: false, y: 0 })
let startY = 0, startX = 0, pid = null, moved = false
const down = (e) => { if (props.preview || e.button > 0 || e.target.closest('button, a, input, [role=switch]')) return; pid = e.pointerId; startY = e.clientY; startX = e.clientX; moved = false; drag.value = { on: true, y: 0 } }
const move = (e) => { if (e.pointerId !== pid) return; const dy = e.clientY - startY, dx = e.clientX - startX; if (!moved && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) { moved = true; e.currentTarget.setPointerCapture?.(pid) } if (moved) drag.value = { on: true, y: Math.max(-70, Math.min(70, dy * 0.5)) } }
const up = (e) => { if (e.pointerId !== pid) return; const dy = e.clientY - startY; pid = null; drag.value = { on: false, y: 0 }; if (moved && Math.abs(dy) > 40) turn(dy < 0 ? 1 : -1) }
const key = (e) => {
  if (e.target !== e.currentTarget && e.target.closest('button')) return
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') { e.preventDefault(); turn(1) } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') { e.preventDefault(); turn(-1) } else if (e.key === 'Home' && total.value > 1) { e.preventDefault(); pick(0) } else if (e.key === 'End' && total.value > 1) { e.preventDefault(); pick(members.value.length - 1) } else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); pin() }
}
onBeforeUnmount(() => { pid = null; clearTimeout(backTimer); emit('hover', { id: props.card.id, on: false }); emit('hover', { id: props.card.id, on: false, by: 'focus' }) })
</script>

<template>
  <div class="m-dstack" role="group" aria-roledescription="轮换组" :aria-label="label" tabindex="0" :data-stack="card.id" :data-count="members.length" :class="{ 'is-dragging': drag.on }"
    @pointerenter="enter" @pointerleave="leave" @focusin="focusIn" @focusout="focusOut" @wheel="wheel" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @keydown="key">
    <div class="m-dstack__view">
      <Transition :name="fade ? 'm-dstack-fade' : dir > 0 ? 'm-dstack-up' : 'm-dstack-down'">
        <div :key="sug && suggestion ? `suggest:${suggestion.id}` : shown?.id" class="m-dstack__page" :style="drag.on ? { transform: `translateY(${drag.y}px)`, transition: 'none' } : undefined">
          <div v-if="sug && suggestion" class="m-dstack__sug">
            <span class="m-dstack__sugtag">{{ T.stackSuggestTag || '建议' }}</span>
            <span class="m-dstack__sugicon" aria-hidden="true"><MIcon :name="suggestion.icon || 'add'" /></span>
            <b class="m-dstack__sugtitle">{{ suggestion.title }}</b>
            <span class="m-dstack__sugbtns">
              <button type="button" class="m-dpill m-dpill--fill" data-stack-suggest="add" @click.stop="sugAct('add')"><MIcon name="add" />{{ T.stackSuggestAdd || '加入' }}</button>
              <button type="button" class="m-dstack__sugx" data-stack-suggest="hide" :aria-label="T.stackSuggestHide || '不再建议'" :title="T.stackSuggestHide || '不再建议'" @click.stop="sugAct('hide')"><MIcon name="close" /></button>
            </span>
          </div>
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
