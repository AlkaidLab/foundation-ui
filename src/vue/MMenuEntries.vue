<script setup>
import { computed } from 'vue'
import MMenuRow from './MMenuRow.vue'
import { scrollbarRef } from '../css/scrollbarRules.js'

defineOptions({ name: 'MMenuEntries' })
// The entries of one menu level: rows, dividers between groups, section labels, and (when `submenus`) an item with `children` as a submenu that opens beside it (md-sub-menu).
// items: [{ id, label, icon?, text?, shortcut?, danger?, disabled?, selected?, keepOpen?, divider?, section?, children? }]
const props = defineProps({
  items: { type: Array, required: true },
  submenus: { type: Boolean, default: true },
})
const emit = defineEmits(['select'])
const isRow = (item) => !!item && !item.divider && !item.section
// a row opens its group when the entry before it is not a row, and closes it when the entry after it is not a row
const rows = computed(() => props.items.map((item, i) => ({ item, first: isRow(item) && !isRow(props.items[i - 1]), last: isRow(item) && !isRow(props.items[i + 1]) })))
const hasSub = (item) => props.submenus && Array.isArray(item.children) && item.children.length > 0
</script>

<template>
  <template v-for="row in rows" :key="row.item.id">
    <md-divider v-if="row.item.divider" />
    <div v-else-if="row.item.section" class="m-menu__label" role="presentation">{{ row.item.label }}</div>
    <md-sub-menu v-else-if="hasSub(row.item)">
      <MMenuRow slot="item" :item="row.item" :first="row.first" :last="row.last" />
      <md-menu :ref="scrollbarRef" slot="menu" class="m-menu" positioning="fixed" quick anchor-corner="start-end" menu-corner="start-start">
        <MMenuEntries :items="row.item.children" :submenus="submenus" @select="(item) => emit('select', item)" />
      </md-menu>
    </md-sub-menu>
    <MMenuRow v-else :item="row.item" :first="row.first" :last="row.last" @click="emit('select', row.item)" />
  </template>
</template>
