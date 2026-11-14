<script setup>
import MIcon from './MIcon.vue'

// One row of a menu (the Material Web menu item): leading icon, label, supporting text, and either the shortcut (trailing text) or the submenu caret (trailing icon).
// `first` / `last`: the row opens / closes its group (the outer corners of a group are rounder than the inner ones, see css/controls.css).
defineProps({
  item: { type: Object, required: true },
  first: { type: Boolean, default: false },
  last: { type: Boolean, default: false },
})
</script>

<template>
  <md-menu-item :class="{ 'm-danger': item.danger, 'm-selected': item.selected, 'm-first': first, 'm-last': last }" :data-mid="item.id" :disabled="item.disabled || undefined" :selected="item.selected || undefined" :keep-open="item.keepOpen || undefined" :title="item.reason || undefined" :aria-keyshortcuts="item.shortcut || undefined">
    <MIcon v-if="item.icon" slot="start" :name="item.icon" />
    <div slot="headline">{{ item.label }}</div>
    <div v-if="item.text" slot="supporting-text">{{ item.text }}</div>
    <div v-if="item.shortcut" slot="trailing-supporting-text">{{ item.shortcut }}</div>
    <MIcon v-else-if="item.children" slot="end" name="chevron_right" />
  </md-menu-item>
</template>
