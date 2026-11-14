<script setup>
import MIcon from './MIcon.vue'

// The one announcement a person has not dismissed, as a strip at the top of the home. Plain text only; the link goes through the product's own external-link path.
defineProps({
  item: { type: Object, required: true }, // from activeItems(): { id, severity, title, body, url, dismissible }
  /** the number of unread announcements (the bell of the caption bar shows the same) */
  total: { type: Number, default: 1 },
  texts: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['dismiss', 'open-url', 'open-list'])
const ICON = { info: 'info', warn: 'warning', critical: 'error' }
const T = { open: 'Open', dismiss: 'Dismiss', all: 'All announcements' }
</script>

<template>
  <div class="m-announce" :class="`m-announce--${item.severity}`" role="status">
    <MIcon class="m-announce__icon" :name="ICON[item.severity] || 'info'" fill />
    <div class="m-announce__text"><b>{{ item.title }}</b><span v-if="item.body" class="m-announce__body">{{ item.body }}</span></div>
    <div class="m-announce__actions">
      <button v-if="item.url" type="button" class="m-announce__btn" @click="emit('open-url', item.url)">{{ texts.open || T.open }}</button>
      <button v-if="total > 1" type="button" class="m-announce__btn" @click="emit('open-list')">{{ texts.all || T.all }} · {{ total }}</button>
      <button v-if="item.dismissible" type="button" class="m-announce__close" :aria-label="texts.dismiss || T.dismiss" :data-tip="texts.dismiss || T.dismiss" @click="emit('dismiss', item.id)"><MIcon name="close" /></button>
    </div>
  </div>
</template>
