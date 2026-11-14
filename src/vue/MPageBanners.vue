<script setup>
import MBanner from './MBanner.vue'
import MButton from './MButton.vue'
import { useNotify } from '../notify/store.js'

// The standing problems of one page, under its title: the page puts this first in its content. Banners come from notify.banner(page, …).
defineProps({ page: { type: String, required: true } })
const notify = useNotify()
</script>

<template>
  <MBanner v-for="b in notify.bannersOf(page)" :key="b.id" :tone="b.tone" :icon="b.icon || (b.tone === 'error' ? 'error' : b.tone === 'info' ? 'info' : 'warning')">
    <b v-if="b.title">{{ b.title }}</b><br v-if="b.title && b.text">{{ b.text }}
    <template v-if="b.actions?.length" #actions>
      <MButton v-for="a in b.actions" :key="a.id" variant="text" size="sm" @click="a.onClick?.()">{{ a.label }}</MButton>
    </template>
  </MBanner>
</template>
