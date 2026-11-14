<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import { SLIDERS, SLIDER_KEYS, TILE_IDS, hideItem, isDefaultLayout, layoutRecord, moveItem, normalizeLayout, showItem, tileAvailable, tileView, tx } from '../tray/trayModel.js'

// The editor of the quick panel's layout (the pencil of the V3 menu, and 设置 > 个性化 > 托盘 in the Panel): which tiles and which sliders, in which order. A shown item is a row you can move
// (drag the handle, or press Space on it and use the arrow keys; Alt + Up / Down moves it at once) and hide; an item that is not shown is a chip you press to add. v-model:layout is the stored record
// { tiles, sliders } (null = the default); the editor changes a working copy at once and hands the record over a moment after the last change. It keeps no host call.
//   layout   the record (or anything: it is normalised)       state   what the words and the availability come from ({ locale, labels, rtss, vdd })       compact   the popup's version (done / reset bar)
//   only     'tiles' | 'sliders': edit that list alone (设置 > 个性化 has one editor for each: the sliders are shared by all three menus); the record it hands over keeps the other list as the page has it
const props = defineProps({
  layout: { type: Object, default: null },
  state: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  only: { type: String, default: '' },
})
const emit = defineEmits(['update:layout', 'done'])

const t = computed(() => tx(props.state))
const e = computed(() => t.value.edit)
const work = reactive(normalizeLayout(props.layout))
const allGroups = computed(() => [
  { key: 'tiles', title: e.value.tiles, all: TILE_IDS, ok: (id) => tileAvailable(id, props.state), name: (id) => tileView(id, props.state).name, icon: (id) => tileView(id, props.state).icon },
  { key: 'sliders', title: e.value.sliders, all: SLIDER_KEYS, ok: () => true, name: (id) => t.value.sliders[id], icon: (id) => SLIDERS[id].icon },
])
const groups = computed(() => allGroups.value.filter((g) => !props.only || g.key === props.only))
const hiddenOf = (g) => g.all.filter((id) => !work[g.key].includes(id) && g.ok(id))
const custom = computed(() => (props.only ? layoutRecord(work)[props.only] !== null : !isDefaultLayout(work)))

// the working copy follows the stored record, except while the person is moving something or the last change is still on its way
const grabbed = ref('') // `${group}:${id}` picked up with the keyboard
const drag = ref(null) // { group, id } under the pointer
const say = ref('')
let timer = 0
let before = null // the list as it was when an item was picked up (Escape puts it back)
let refocus = false
watch(() => JSON.stringify(normalizeLayout(props.layout)), () => {
  if (grabbed.value || drag.value || timer) return
  Object.assign(work, normalizeLayout(props.layout))
})
function push() {
  clearTimeout(timer); timer = 0
  // one list alone: the other one is the page's own, not this copy of it (the other editor may have changed it a moment ago)
  emit('update:layout', layoutRecord(props.only ? { ...normalizeLayout(props.layout), [props.only]: work[props.only] } : work))
}
const schedule = (now) => { clearTimeout(timer); if (now) push(); else timer = setTimeout(push, 220) }
onBeforeUnmount(() => { if (timer) push() })

function move(group, id, to) {
  const next = moveItem(work[group], id, to)
  if (next === work[group]) return false
  work[group] = next
  schedule(false)
  return true
}
const hide = (group, id) => { work[group] = hideItem(work[group], id); schedule(true) }
const show = (group, id) => { work[group] = showItem(work[group], id); schedule(true) }
function reset() {
  const base = normalizeLayout(null)
  if (props.only) work[props.only] = base[props.only]
  else Object.assign(work, base)
  schedule(true)
}

// ---- keyboard: Space picks up / puts down, the arrows move, Escape puts it back
const itemEl = (group, id) => document.querySelector?.(`.m-trayed__list[data-group="${group}"] [data-id="${id}"] .m-trayed__handle`)
async function keepFocus(group, id) {
  refocus = true
  await nextTick()
  itemEl(group, id)?.focus({ focusVisible: true })
  refocus = false
}
function announce(g, id) {
  const list = work[g.key]
  say.value = e.value.moved(g.name(id), list.indexOf(id) + 1, list.length)
}
function onHandleKey(g, id, ev) {
  const key = `${g.key}:${id}`
  const k = ev.key
  const live = grabbed.value === key
  const step = k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0
  if (k === ' ' || k === 'Enter') {
    ev.preventDefault(); ev.stopPropagation()
    if (live) { grabbed.value = ''; before = null; schedule(true); say.value = e.value.drop(g.name(id)) } else { grabbed.value = key; before = work[g.key].slice(); say.value = e.value.grab(g.name(id)) }
    return
  }
  if (k === 'Escape' && live) {
    ev.preventDefault(); ev.stopPropagation()
    work[g.key] = before || work[g.key]; grabbed.value = ''; before = null; schedule(true); say.value = e.value.cancel(g.name(id)); keepFocus(g.key, id)
    return
  }
  if (!live && !(ev.altKey && step)) return
  if (step || k === 'Home' || k === 'End') {
    ev.preventDefault(); ev.stopPropagation()
    const list = work[g.key]
    const at = list.indexOf(id)
    if (move(g.key, id, k === 'Home' ? 0 : k === 'End' ? list.length - 1 : at + step)) { announce(g, id); keepFocus(g.key, id) }
  }
}
function onHandleBlur() {
  if (refocus || !grabbed.value) return
  grabbed.value = ''; before = null; schedule(true)
}

// ---- pointer: the item follows the pointer along its list (the rows are of one height, so the index is the pointer's position in the list)
function startDrag(g, id, ev) {
  if (ev.button !== undefined && ev.button !== 0) return
  const list = ev.currentTarget.closest('.m-trayed__list')
  drag.value = { group: g.key, id }
  const onMove = (m) => {
    const rows = list.querySelectorAll('.m-trayed__item')
    if (!rows.length) return
    const top = list.getBoundingClientRect().top
    const step = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : rows[0].offsetHeight
    const to = Math.floor((m.clientY - top) / step)
    move(g.key, id, to)
  }
  const end = () => {
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end)
    drag.value = null
    schedule(true)
  }
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end)
}
</script>

<template>
  <div class="m-trayed" :class="{ 'is-compact': compact }">
    <div v-if="compact" class="m-trayed__bar">
      <span class="m-trayed__title">{{ e.title }}</span>
      <button class="m-trayed__text" :class="{ 'is-off': !custom }" type="button" :aria-disabled="!custom" @click="custom && reset()"><MIcon name="restart_alt" />{{ e.reset }}</button>
      <button class="m-trayed__text is-filled" type="button" @click="emit('done')"><MIcon name="check" />{{ e.done }}</button>
    </div>
    <div class="m-trayed__body">
      <section v-for="g in groups" :key="g.key" class="m-trayed__group" :aria-label="g.title">
        <h3 v-if="!only" class="m-trayed__h">{{ g.title }}</h3>
        <TransitionGroup tag="ul" name="m-trayed-flip" class="m-trayed__list" :data-group="g.key">
          <li v-for="id in work[g.key]" :key="id" :data-id="id" class="m-trayed__item" :class="{ 'is-grabbed': grabbed === `${g.key}:${id}`, 'is-drag': drag && drag.group === g.key && drag.id === id }">
            <button class="m-trayed__handle" type="button" :aria-label="g.name(id)" :aria-roledescription="e.handle" :aria-pressed="grabbed === `${g.key}:${id}`" @pointerdown.prevent="startDrag(g, id, $event)" @keydown="onHandleKey(g, id, $event)" @blur="onHandleBlur"><MIcon name="drag_indicator" /></button>
            <MIcon class="m-trayed__icon" :name="g.icon(id)" />
            <span class="m-trayed__name">{{ g.name(id) }}</span>
            <button class="m-trayed__btn" type="button" :aria-label="e.hide(g.name(id))" :title="e.hide(g.name(id))" @click="hide(g.key, id)"><MIcon name="remove" /></button>
          </li>
        </TransitionGroup>
        <div v-if="hiddenOf(g).length" class="m-trayed__adds" role="group" :aria-label="e.add">
          <button v-for="id in hiddenOf(g)" :key="id" class="m-trayed__chip" type="button" :aria-label="e.show(g.name(id))" :title="e.show(g.name(id))" @click="show(g.key, id)"><MIcon name="add" /><span>{{ g.name(id) }}</span></button>
        </div>
      </section>
    </div>
    <div v-if="!compact" class="m-trayed__foot"><button class="m-trayed__text" :class="{ 'is-off': !custom }" type="button" :aria-disabled="!custom" @click="custom && reset()"><MIcon name="restart_alt" />{{ e.reset }}</button></div>
    <p class="m-trayed__sr" role="status" aria-live="polite">{{ say }}</p>
  </div>
</template>
