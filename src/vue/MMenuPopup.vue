<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MMenu from './MMenu.vue'
import { installModality } from '../a11y/modality.js'
import { POPUP_PAD, applyThemeSnapshot, choose, levelItems, levelKey, menuSize } from '../contextmenu/popup.js'

// The page of the menu window: the same Material menu as the in-page one (MMenu), drawn in a window of its own that the host places at the pointer and may let extend beyond the main window.
// The host (the Panel) sends the menu and the theme of the window it belongs to, shows the window when this page has measured the menu, and takes the choice back to the main window.
//
//   transport = {
//     onOpen(cb)     cb({ token, items, back, maxHeight, theme }) for every menu; returns a function that stops listening
//     onClose(cb)    cb({ token }) when the host closed the menu (the page closes its own menu without answering)
//     ready(token, { w, h })  the menu is drawn: its size in CSS px (the host sizes and places the window, then shows it; also after a change of level)
//     pick(token, path)       an item was chosen: the indexes of the item in the menu
//     cancel(token)           the menu closed without a choice (Escape, a press outside, the focus left)
//   }
const props = defineProps({ transport: { type: Object, required: true } })

const gen = ref(0)
const model = ref([])
const trail = ref([])
const back = ref('Back')
const room = ref(Infinity)
const view = computed(() => levelItems(model.value, trail.value, back.value))
const menu = ref(null)
const anchor = ref(null)
const anchorId = 'm-popup-anchor'
let token = 0
let open = false // a menu is on: it has not been answered or closed yet
const stops = []

const surfaceOf = () => menu.value?.el?.shadowRoot?.querySelector('.menu') || null
async function measure() {
  const el = menu.value?.el
  if (!el) return null
  await el.updateComplete
  // the surface is laid out once the menu is open; a window that paints no frame yet needs the next one for it
  for (let tries = 0; tries < 4; tries++) {
    const surface = surfaceOf()
    const list = surface?.querySelector('.items')
    if (surface && list && surface.offsetWidth > 0 && list.scrollHeight > 0) return menuSize({ width: surface.offsetWidth, height: list.scrollHeight, maxHeight: room.value })
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  return null
}
async function present() {
  const el = menu.value?.el
  if (!el) return
  anchor.value.style.left = `${POPUP_PAD}px`
  anchor.value.style.top = `${POPUP_PAD - 1}px` // the anchor is 1 px high and the menu opens at its bottom-left corner
  el.style.maxHeight = Number.isFinite(room.value) ? `${room.value}px` : ''
  // a level change replaces the focused item: that must not close the menu. Losing the focus of the window ends it (the host sees that), and so does a press outside (onPress).
  el.stayOpenOnFocusout = true
  menu.value.show()
  const size = await measure()
  if (!open || !size) return
  el.reposition?.()
  props.transport.ready(token, { w: size.w, h: size.h })
  // Material 3: focus goes to the first item when a menu opens
  requestAnimationFrame(() => el.querySelector('md-menu-item:not([disabled])')?.focus({ preventScroll: true }))
}
async function onOpen(msg) {
  if (open) { open = false } // a new menu replaces the one on: the host answered the old one
  applyThemeSnapshot(document, msg.theme)
  token = msg.token
  model.value = Array.isArray(msg.items) ? msg.items : []
  trail.value = []
  back.value = msg.back || 'Back'
  room.value = Number.isFinite(msg.maxHeight) ? msg.maxHeight : Infinity
  open = true
  clearTimeout(closing)
  gen.value++ // a menu element of its own for every menu: nothing of the last (focus, scroll, state) is left
  await nextTick()
  await present()
}
function onClose() { open = false; clearTimeout(closing); menu.value?.hide() }

function answer(path) {
  if (!open) return
  open = false
  if (path) props.transport.pick(token, path)
  else props.transport.cancel(token)
}
async function relevel() {
  await nextTick()
  const size = await measure()
  if (!open || !size) return
  props.transport.ready(token, { w: size.w, h: size.h })
  requestAnimationFrame(() => menu.value?.el?.querySelector('md-menu-item:not([disabled])')?.focus())
}
function onSelect(entry) {
  const act = choose(model.value, trail.value, entry)
  if (act.kind === 'pick') answer(act.path)
  else if (act.kind === 'into' || act.kind === 'up') { trail.value = act.trail; relevel() }
}
// the menu closed by itself (Escape, the focus left it): no choice, unless the choice was answered already. The keyboard closes the menu (close-menu) before the item's click arrives, so the
// answer waits a moment for the click.
let closing = 0
const onClosed = () => { clearTimeout(closing); const level = gen.value; closing = setTimeout(() => { if (level === gen.value) answer(null) }, 40) }

function entryOfFocus() {
  const el = menu.value?.el
  const active = document.activeElement
  if (!el || !active) return null
  const index = Array.from(el.children).indexOf(active)
  return index >= 0 ? view.value[index] : null
}
function onKey(event) {
  if (!open) return
  // Enter and Space on an item that stays open (a submenu, the way back) do nothing in Material Web: here they enter / leave the level
  if (event.key === 'Enter' || event.key === ' ') {
    const entry = entryOfFocus()
    if (entry?.keepOpen && !entry.disabled) { event.preventDefault(); event.stopPropagation(); onSelect(entry) }
    return
  }
  const intent = levelKey(event.key, { entry: entryOfFocus(), depth: trail.value.length, rtl: document.dir === 'rtl' })
  if (!intent) return
  event.preventDefault(); event.stopPropagation()
  if (intent === 'into') onSelect(entryOfFocus())
  else onSelect(view.value[0])
}
// a press on the transparent room around the menu is a press outside it
function onPress(event) {
  if (!open) return
  if (!event.target?.closest?.('md-menu')) answer(null)
}
const onContext = (event) => event.preventDefault()

onMounted(async () => {
  installModality(document) // the focus ring is for the keyboard: a menu opened with the mouse shows none on its first item (the window starts with the modality of the window it belongs to)
  stops.push(await props.transport.onOpen(onOpen), await props.transport.onClose(onClose))
  document.addEventListener('keydown', onKey, true)
  document.addEventListener('pointerdown', onPress, true)
  document.addEventListener('contextmenu', onContext, true)
  props.transport.loaded?.()
})
onBeforeUnmount(() => {
  for (const stop of stops.splice(0)) { try { stop?.() } catch { /* already gone */ } }
  document.removeEventListener('keydown', onKey, true)
  document.removeEventListener('pointerdown', onPress, true)
  document.removeEventListener('contextmenu', onContext, true)
})
defineExpose({ onOpen, onClose, view, trail })
</script>

<template>
  <div class="m-popup">
    <span ref="anchor" :id="anchorId" class="m-context-anchor" aria-hidden="true" />
    <MMenu :key="gen" ref="menu" :submenus="false" :anchor="anchorId" :items="view" positioning="fixed" quick align="start" @select="onSelect" @closed="onClosed" />
  </div>
</template>

<style>
/* the window is transparent: only the menu and its shadow are on it. Scoped to the menu window (the document that holds .m-popup): this sheet is bundled with every product that imports the vue barrel, and a bare html/body rule made every page that scrolls the document (the Web UI inside the Panel frame) unscrollable. */
html:has(> body .m-popup), html:has(> body .m-popup) body { background: transparent !important; margin: 0; overflow: hidden; }
.m-popup { position: fixed; inset: 0; }
html:not([data-modality='keyboard']) md-menu-item { --md-focus-ring-color: transparent; }
</style>
