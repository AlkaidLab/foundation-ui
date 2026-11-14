<script setup>
import MIcon from './MIcon.vue'

// Split row: the main area (selects, opens) + a thin vertical divider + a gear (configures). For an item that can be
// chosen and also set up. The leading slot takes a radio, a check or an icon.
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  icon: { type: String, default: '' },
  selected: { type: Boolean, default: false },
  settingsLabel: { type: String, default: 'Settings' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['click', 'settings'])
</script>

<template>
  <div class="m-item m-split-item" :class="{ 'm-item--disabled': disabled, 'm-item--selected': selected }" role="listitem">
    <button type="button" class="m-split-item__main" :disabled="disabled" @click="emit('click', $event)">
      <span v-if="icon || $slots.lead" class="m-item__lead"><slot name="lead"><MIcon :name="icon" /></slot></span>
      <span class="m-item__body"><span class="m-item__title">{{ title }}</span><span v-if="text" class="m-item__text">{{ text }}</span></span>
    </button>
    <i class="m-split-item__divider" aria-hidden="true" />
    <button type="button" class="m-split-item__gear" :disabled="disabled" :aria-label="settingsLabel" :data-tip="settingsLabel" @click="emit('settings', $event)"><MIcon name="settings" /></button>
  </div>
</template>
