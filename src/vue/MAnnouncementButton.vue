<script setup>
import MIconButton from './MIconButton.vue'
import MBadge from './MBadge.vue'
import { announcementTexts } from './announcementTexts.js'
import { computed } from 'vue'

// The announcements button of the caption bar (the `announcements` slot of MCaption): a bell with the count of what has not been read; it opens the 公告 page.
const props = defineProps({ unread: { type: Number, default: 0 }, locale: { type: String, default: 'en' } })
const emit = defineEmits(['open'])
const T = computed(() => announcementTexts(props.locale))
</script>

<template>
  <span class="m-annbtn"><MIconButton icon="notifications" :label="T.button" @click="emit('open')" /><MBadge v-if="unread" class="m-annbtn__badge" :value="unread > 9 ? '9+' : unread" /></span>
</template>
