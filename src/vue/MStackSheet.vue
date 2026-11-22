<script setup>
import { computed, ref } from 'vue'
import MSheet from './MSheet.vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MSwitchItem from './MSwitchItem.vue'
import { STACK_MAX, canJoin } from './stackModel.js'

// The edit sheet of a smart stack: the members in order (drag the handle to reorder, ⊖ takes one out), 添加磁贴 (the tiles that offer the stack's size; the others are grey with the reason), the two
// switches (智能轮换, 磁贴建议) and 拆散轮换组. A stack that falls to one member dissolves into that tile (stackModel.js).
const open = defineModel({ type: Boolean, default: false })
const props = defineProps({
  stack: { type: Object, default: null }, // { members: [ids], size, smartRotate, suggestions }
  cards: { type: Array, default: () => [] }, // every card of the page (title, icon, data)
  windowClass: { type: String, default: 'large' },
  height: { type: Number, default: Infinity },
  texts: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['reorder', 'remove', 'add', 'flags', 'dissolve', 'out'])
const T = computed(() => props.texts)
const byId = computed(() => new Map(props.cards.map((c) => [c.id, c])))
const members = computed(() => (props.stack?.members || []).map((id) => byId.value.get(id) || { id, title: id }))
const adding = ref(false)
// the tiles that can join come first (the others stay below, grey, with the reason): a list that opens on a run of unusable tiles reads as empty on a phone
const candidates = computed(() => props.cards.filter((c) => c.available !== false && !(props.stack?.members || []).includes(c.id) && c.kind !== 'stack').map((c) => ({ card: c, ...canJoin(c, props.stack?.size || 's', props.windowClass, props.height) })).sort((a, b) => Number(b.ok) - Number(a.ok)))
const reason = (r) => (r === 'size' ? (T.value.stackNoSize || '这个磁贴没有这个大小') : (T.value.stackNoKind || '这个磁贴不能放进轮换组'))
// reorder by dragging the handle: the row under the pointer is the place
const list = ref(null)
const dragFrom = ref(-1)
const dragTo = ref(-1)
const dragDy = ref(0) // the row follows the pointer
let startY = 0
// the row that is carried is moved by the pointer (a transform): the place it is over is read from where the rows stand without that move
const rowAt = (y) => { const rows = [...(list.value?.querySelectorAll('.m-stacksheet__row') || [])]; for (let i = 0; i < rows.length; i++) { const r = rows[i].getBoundingClientRect(); if (y < r.bottom - (i === dragFrom.value ? dragDy.value : 0)) return i } return rows.length - 1 }
// a handle taken out of the sheet's panel, to any side, puts the tile on the page, where it is let go
const outside = ref(false)
const outOfPanel = (x, y) => { const r = list.value?.closest('.m-sheet__panel')?.getBoundingClientRect(); return !!r && (x < r.left - 16 || x > r.right + 16 || y < r.top - 16 || y > r.bottom + 16) }
const hdown = (e, i) => { if (e.button > 0) return; dragFrom.value = i; dragTo.value = i; dragDy.value = 0; startY = e.clientY; outside.value = false; e.currentTarget.setPointerCapture(e.pointerId) }
const hmove = (e) => { if (dragFrom.value < 0) return; outside.value = outOfPanel(e.clientX, e.clientY); dragTo.value = rowAt(e.clientY); dragDy.value = e.clientY - startY }
const hup = (e) => {
  if (dragFrom.value >= 0) {
    if (outside.value && e.type === 'pointerup') emit('out', { id: members.value[dragFrom.value].id, x: e.clientX, y: e.clientY })
    else if (dragTo.value !== dragFrom.value && !outside.value) emit('reorder', { from: dragFrom.value, to: dragTo.value })
  }
  dragFrom.value = -1; dragTo.value = -1; dragDy.value = 0; outside.value = false
}
const hkey = (e, i) => { if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); emit('reorder', { from: i, to: i - 1 }) } else if (e.key === 'ArrowDown' && i < members.value.length - 1) { e.preventDefault(); emit('reorder', { from: i, to: i + 1 }) } }
</script>

<template>
  <MSheet v-model="open" :title="T.stackSheetTitle || '轮换组'" side="end" :close-label="T.close || '关闭'" class="m-stacksheet">
    <div v-if="stack" class="m-stacksheet__body">
      <p class="m-stacksheet__count" aria-live="off">{{ outside ? (T.stackDropOut || '松开，放到页面上') : (T.stackCount || '{n} / {max} 个磁贴').replace('{n}', members.length).replace('{max}', STACK_MAX) }}</p>
      <ol ref="list" class="m-stacksheet__list">
        <li v-for="(m, i) in members" :key="m.id" class="m-stacksheet__row" :data-member="m.id" :class="{ 'is-drag': dragFrom === i, 'is-out': dragFrom === i && outside, 'is-over': dragFrom >= 0 && !outside && dragTo === i && dragFrom !== i }" :style="dragFrom === i ? { transform: `translateY(${dragDy}px) scale(1.02)`, transition: 'none' } : undefined">
          <button type="button" class="m-stacksheet__handle" :aria-label="`${T.stackReorder || '调整顺序'}: ${m.title}`" @pointerdown="hdown($event, i)" @pointermove="hmove" @pointerup="hup" @pointercancel="hup" @keydown="hkey($event, i)"><MIcon name="drag_indicator" /></button>
          <span class="m-stacksheet__name">{{ m.title }}</span>
          <button type="button" class="m-stacksheet__remove" :aria-label="`${T.stackRemove || '移出'}: ${m.title}`" @click="emit('remove', m.id)"><MIcon name="remove" /></button>
        </li>
      </ol>
      <MButton v-if="members.length < STACK_MAX" variant="tonal" icon="add" class="m-stacksheet__add" :aria-expanded="adding" @click="adding = !adding">{{ T.stackAdd || '添加磁贴' }}</MButton>
      <ul v-if="adding" class="m-stacksheet__pick">
        <li v-for="c in candidates" :key="c.card.id" :class="{ 'is-off': !c.ok }" :data-pick="c.card.id">
          <button type="button" :disabled="!c.ok" @click="emit('add', c.card.id); adding = false"><span>{{ c.card.title }}</span><small v-if="!c.ok">{{ reason(c.reason) }}</small></button>
        </li>
      </ul>
      <div class="m-group">
        <MSwitchItem :model-value="stack.smartRotate" :title="T.stackSmart || '智能轮换'" :text="T.stackSmartNote || '离开一阵再回来时，转到最相关的磁贴；你在看的时候不会转'" @update:model-value="(v) => emit('flags', { smartRotate: v })" />
        <MSwitchItem :model-value="stack.suggestions" :title="T.stackSuggest || '磁贴建议'" :text="T.stackSuggestNote || '偶尔显示一个相关但不在组里的磁贴，一点就能加入'" @update:model-value="(v) => emit('flags', { suggestions: v })" />
      </div>
      <MButton variant="danger" icon="delete" class="m-stacksheet__dissolve" @click="emit('dissolve')">{{ T.stackDissolve || '拆散轮换组' }}</MButton>
    </div>
  </MSheet>
</template>
