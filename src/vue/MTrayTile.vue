<script setup>
import MIcon from './MIcon.vue'

// One pill of the quick panel (the first page's tiles and the later pages' cells): the icon part acts, a toggled pill is filled with the primary container, an optional chevron opens the page of its settings.
// A `group` pill holds several choices and opens them in place (the grid draws them under it): its whole face is the one button, with a fold arrow where a tile has a chevron.
defineProps({
  tile: { type: Object, required: true },
  open: { type: Boolean, default: false }, // group: its choices are shown
  sheet: { type: String, default: '' }, // group: the id of the element that holds the choices
  drillTitle: { type: String, default: '' },
})
const emit = defineEmits(['act', 'open', 'fold'])
</script>

<template>
  <div v-if="tile.group" class="m-tray__tile is-group" :class="{ 'is-open': open, 'is-wide': tile.wide }">
    <button class="m-tray__tile-main" type="button" aria-haspopup="true" :aria-expanded="open" :aria-controls="sheet || undefined" @click="emit('fold', tile.group)">
      <span class="m-tray__tile-chip"><MIcon :name="tile.icon" /></span>
      <span class="m-tray__tile-text"><span class="m-tray__tile-label">{{ tile.label }}</span><span v-if="tile.text" class="m-tray__tile-state">{{ tile.text }}</span></span>
      <span class="m-tray__tile-fold" aria-hidden="true"><MIcon name="keyboard_arrow_down" /></span>
    </button>
  </div>
  <div v-else class="m-tray__tile" :class="{ 'is-on': tile.on, 'is-lock': tile.locked, 'is-off': tile.disabled, 'is-fresh': tile.fresh, 'is-plain': !tile.text, 'is-danger': tile.danger, 'is-wide': tile.wide }">
    <button class="m-tray__tile-main" type="button" :role="tile.kind === 'toggle' ? 'switch' : 'button'" :aria-checked="tile.kind === 'toggle' ? tile.on : undefined" :disabled="tile.disabled" :title="tile.name" @click="emit('act', tile.act)">
      <span class="m-tray__tile-chip"><MIcon :name="tile.icon" :fill="tile.on" /></span>
      <span class="m-tray__tile-text"><span class="m-tray__tile-label">{{ tile.label }}</span><span v-if="tile.text" class="m-tray__tile-state">{{ tile.text }}</span></span>
    </button>
    <button v-if="tile.drill" class="m-tray__tile-drill" type="button" :title="drillTitle" :aria-label="drillTitle" @click="emit('open', tile.drill)"><MIcon name="chevron_right" /></button>
  </div>
</template>
