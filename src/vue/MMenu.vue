<script setup>
import { computed, ref } from 'vue'
import MMenuEntries from './MMenuEntries.vue'
import { scrollbarRef } from '../css/scrollbarRules.js'

// The one menu of the product (Material 3 vertical menu on the Material Web menu, standard colours: css/controls.css): surface container low, elevation 2, 44 dp rows with 20 dp icons, groups
// separated by dividers, a selected row in the secondary container, a submenu that opens beside its row.
// items: [{ id, label, icon?, text?, shortcut?, danger?, divider?, section?, disabled?, selected?, keepOpen?, children? }]. `anchor` is the id of the element it opens from.
// `submenus: false` shows an item with children as a row with a caret that only reports its selection (the menu window of the Panel shows one level at a time, see MMenuPopup).
const props = defineProps({
  items: { type: Array, required: true },
  anchor: { type: String, default: '' },
  positioning: { type: String, default: 'popover' },
  quick: { type: Boolean, default: false },
  align: { type: String, default: 'end' }, // end: the menu's right edge meets the anchor's right edge
  submenus: { type: Boolean, default: true },
})
const emit = defineEmits(['select', 'closed'])
const menu = ref(null)
const setMenu = (el) => { menu.value = el; scrollbarRef(el) }
// every item that can be chosen, by id (also those of the submenus): a key choice names its item by the `data-mid` of the element it came from
const byId = computed(() => {
  const map = new Map()
  const walk = (list) => { for (const item of list || []) { if (item?.id != null) map.set(String(item.id), item); if (props.submenus && Array.isArray(item?.children)) walk(item.children) } }
  walk(props.items)
  return map
})
// Enter and Space on an item do not click it (Material Web asks the menu to close instead): the choice is read from that request. A click selects through the row's @click.
const onCloseMenu = (event) => {
  const reason = event.detail?.reason
  if (reason?.kind !== 'keydown' || (reason.key !== 'Enter' && reason.key !== 'Space')) return
  const item = byId.value.get(String(event.detail.initiator?.dataset?.mid))
  if (item && !item.divider && !item.disabled && !(props.submenus && item.children?.length)) emit('select', item)
}
defineExpose({
  toggle: () => { if (menu.value) menu.value.open = !menu.value.open },
  show: () => { if (menu.value) menu.value.open = true },
  hide: () => { if (menu.value) menu.value.open = false },
  el: menu,
})
</script>

<template>
  <md-menu :ref="setMenu" class="m-menu" default-focus="first-item" @closed="emit('closed')" @close-menu="onCloseMenu" :anchor="anchor || undefined" :positioning="positioning" :quick="quick || undefined" :anchor-corner="align === 'end' ? 'end-end' : 'end-start'" :menu-corner="align === 'end' ? 'start-end' : 'start-start'">
    <MMenuEntries :items="items" :submenus="submenus" @select="(item) => emit('select', item)" />
  </md-menu>
</template>
