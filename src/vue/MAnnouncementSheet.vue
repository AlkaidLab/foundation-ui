<script setup>
import MSheet from './MSheet.vue'
import MIcon from './MIcon.vue'

// Every active announcement, read ones included (dimmed). Dismissing marks one as read; a critical item has no dismiss button.
defineProps({
  modelValue: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  title: { type: String, default: 'Announcements' },
  texts: { type: Object, default: () => ({}) },
  closeLabel: { type: String, default: 'Close' },
})
const emit = defineEmits(['update:modelValue', 'dismiss', 'open-url'])
const ICON = { info: 'info', warn: 'warning', critical: 'error' }
</script>

<template>
  <MSheet :model-value="modelValue" :title="title" side="end" :close-label="closeLabel" @update:model-value="(v) => emit('update:modelValue', v)">
    <ul v-if="items.length" class="m-announce-list">
      <li v-for="item in items" :key="item.id" class="m-announce-list__item" :class="[`m-announce-list__item--${item.severity}`, { 'is-read': item.read }]">
        <MIcon class="m-announce-list__icon" :name="ICON[item.severity] || 'info'" fill />
        <div class="m-announce-list__text">
          <b>{{ item.title }}</b>
          <p v-if="item.body">{{ item.body }}</p>
          <div class="m-announce-list__actions">
            <button v-if="item.url" type="button" class="m-announce__btn" @click="emit('open-url', item.url)">{{ texts.open || 'Open' }}</button>
            <button v-if="item.dismissible && !item.read" type="button" class="m-announce__btn" @click="emit('dismiss', item.id)">{{ texts.dismiss || 'Dismiss' }}</button>
            <span v-else-if="item.read" class="m-announce-list__read">{{ texts.read || 'Read' }}</span>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="m-ddetail__note">{{ texts.none || 'No announcements' }}</p>
  </MSheet>
</template>
