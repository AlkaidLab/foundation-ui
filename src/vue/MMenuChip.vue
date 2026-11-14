<script setup>
import { ref, useId } from 'vue'
import MIcon from './MIcon.vue'

// A chip that opens a menu (Material menu: arrow keys move, Enter or Space picks, Escape closes and gives the focus back to the chip).
// items: [{ id, label, count?, checked?, icon?, divider?, keepOpen? }]; `checked` (true or false) makes the row a check row, and `keepOpen` leaves the
// menu open after the pick (the rows of a multiple choice). `iconOnly` is the round form (an overflow button).
const props = defineProps({
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
  items: { type: Array, required: true },
  /** the chip shows a choice that is not the default */
  active: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
  iconOnly: { type: Boolean, default: false },
  /** the label shows only while the chip holds a choice (active); otherwise just the icon and the arrow */
  quiet: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])
const id = useId()
const menu = ref(null)
// Enter and Space pick the row that has the focus (the Material menu moves and closes with the keys; picking goes through the click of the row,
// which a key does not always send), once: a click that comes right after the key is the same pick.
let keyPickAt = 0
function pick(item) { emit('select', item.id) }
function onKey(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const row = event.target.closest?.('md-menu-item')
  if (!row) return
  const item = props.items.find((i) => String(i.id) === row.dataset.id)
  if (!item) return
  keyPickAt = Date.now(); event.preventDefault(); pick(item)
  if (!item.keepOpen) menu.value.open = false
}
function onClick(item) { if (Date.now() - keyPickAt > 120) pick(item) }
</script>

<template>
  <span class="m-mchip">
    <button :id="id" type="button" class="m-mchip__btn" :class="{ 'is-active': active, 'is-icon': iconOnly, 'is-quiet': quiet && !active }" aria-haspopup="menu" :aria-label="ariaLabel || label" @click="menu.open = !menu.open">
      <MIcon v-if="icon" :name="icon" />
      <span v-if="!iconOnly && (!quiet || active)" class="m-mchip__label">{{ label }}</span>
      <slot />
      <MIcon v-if="!iconOnly" class="m-mchip__arrow" name="keyboard_arrow_down" />
    </button>
    <md-menu ref="menu" :anchor="id" positioning="popover" @keydown="onKey">
      <template v-for="item in items" :key="item.id">
        <md-divider v-if="item.divider" />
        <md-menu-item v-else :data-id="String(item.id)" :keep-open="item.keepOpen || undefined" @click="onClick(item)">
          <span v-if="item.checked !== undefined" slot="start" class="m-mchip__tick"><MIcon v-if="item.checked" name="check" /></span>
          <MIcon v-else-if="item.icon" slot="start" :name="item.icon" />
          <div slot="headline">{{ item.label }}</div>
          <span v-if="item.count !== undefined" slot="end" class="m-mchip__count">{{ item.count }}</span>
        </md-menu-item>
      </template>
    </md-menu>
  </span>
</template>
