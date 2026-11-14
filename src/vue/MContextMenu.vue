<script>
let counter = 0
</script>

<script setup>
import { nextTick, ref } from 'vue'
import MMenu from './MMenu.vue'
import { placeMenu } from '../contextmenu/place.js'
import { menuPresenter, presentMenu } from '../contextmenu/presenter.js'

// One context menu for the whole window. Call `show(event, items)` from a `contextmenu` handler (use the exposed ref);
// items: [{ id, label, icon?, danger?, divider? }]; `select` carries the item and the `context` given to show().
// Where the host has a window of its own for menus (setMenuPresenter: the Panel's menu window, which may extend beyond the main window) the menu is shown there and `select` / `closed` come when it
// closes; a host that cannot show it (or has no such window) leaves the menu to the page: the code below.
const emit = defineEmits(['select', 'closed'])
const menu = ref(null)
const anchor = ref(null)
// one anchor per menu: two menus in a window (a product has the list menu and the pin menu) must not share an id
const anchorId = `m-context-anchor-${++counter}`
const items = ref([])
let context = null
async function show(event, list, ctx = null) {
  event.preventDefault()
  // the window's own menu (MContextProvider) leaves an event alone that a component has opened a menu for
  event.__mContext = true
  items.value = list
  context = ctx
  const point = { x: event.clientX, y: event.clientY }
  if (await presented(event, list, point, ctx)) return
  anchor.value.style.left = `${point.x}px`
  anchor.value.style.top = `${point.y}px`
  await nextTick()
  // a menu that is open already (a submenu replaced its items) gives its focus back to the first item: the arrows and Escape keep working
  const el = menu.value.el
  const wasOpen = !!el?.open
  // hidden until it is placed: the first layout is at the pointer, the second is where the whole menu fits
  if (!wasOpen && el) el.style.visibility = 'hidden'
  menu.value.show()
  await fit(el, point, wasOpen)
  if (wasOpen) requestAnimationFrame(() => el.querySelector('md-menu-item:not([disabled])')?.focus())
}
// The host's menu window, when there is one and it takes the menu. Returns true when the menu was shown and has closed (the chosen item is `select`ed).
async function presented(event, list, point, ctx) {
  // a menu that is open in the page (a submenu replaced its items) stays in the page
  if (!menuPresenter() || menu.value?.el?.open) return false
  const pointer = event.pointer ?? (event.type === 'contextmenu' && (point.x !== 0 || point.y !== 0))
  const shown = await presentMenu({ items: list, point, pointer })
  if (!shown.handled) return false
  if (shown.picked) emit('select', shown.picked, ctx)
  emit('closed')
  return true
}
// The Material Web menu flips to the side of the anchor with more room and then cuts its height to that room: a pointer in the middle of a tall window left half of a long menu behind its
// scroll. Native menus move so that the whole menu is in the window; this does the same: measure the menu, place its top-left corner (src/contextmenu/place.js), and let the menu scroll only when the
// window is shorter than the menu.
async function fit(el, point, wasOpen = false) {
  try {
    await el?.updateComplete
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const surface = el?.shadowRoot?.querySelector('.menu')
    const list = surface?.querySelector('.items')
    if (!surface || !list) return
    const at = placeMenu({ x: point.x, y: point.y, width: surface.offsetWidth, height: list.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight })
    // the anchor is 1 px high and the menu opens at its bottom-left corner
    anchor.value.style.left = `${at.left}px`
    anchor.value.style.top = `${at.top - 1}px`
    el.reposition?.()
  } finally {
    if (el) el.style.visibility = ''
    // Material 3: "When a menu opens, focus should be placed on the first menu item". The menu was hidden while it was placed, and a hidden element takes no focus, so it is given here.
    if (el && !wasOpen) requestAnimationFrame(() => el.querySelector('md-menu-item:not([disabled])')?.focus({ preventScroll: true }))
  }
}
defineExpose({ show })
</script>

<template>
  <span ref="anchor" :id="anchorId" class="m-context-anchor" aria-hidden="true" />
  <MMenu ref="menu" :anchor="anchorId" :items="items" positioning="fixed" quick align="start" @select="(item) => emit('select', item, context)" @closed="emit('closed')" />
</template>
