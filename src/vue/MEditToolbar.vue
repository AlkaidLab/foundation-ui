<script setup>
import MFab from './MFab.vue'
import MIcon from './MIcon.vue'
import MToolbar from './MToolbar.vue'

// The edit mode of a page of tiles (the overview): a vibrant floating toolbar at the bottom centre (FloatingToolbarTokens: 64 px, full corners,
// 16 px from the window edge) holding the edit actions, and the 完成 FAB at its end. The page owns the state: an item is { id, icon, label,
// disabled?, selected? }; a press emits `action` with its id, the FAB emits `done`. The default slot takes a control of the page's own
// (a layout switch). Below 840 px the items show their icons only (the label is the tooltip and the accessible name).
defineProps({
  label: { type: String, required: true },
  items: { type: Array, default: () => [] },
  doneLabel: { type: String, required: true },
  doneIcon: { type: String, default: 'check' },
  /** vibrant (PrimaryContainer, the default) | standard (SurfaceContainer) */
  tone: { type: String, default: 'vibrant' },
  /** into <body> (the default), so that no scrolling container clips or moves it */
  teleport: { type: Boolean, default: true },
})
defineEmits(['action', 'done'])
</script>

<template>
  <Teleport to="body" :disabled="!teleport">
    <div class="m-edittoolbar">
      <MToolbar :label="label" :tone="tone">
        <button v-for="item in items" :key="item.id" type="button" class="m-toolbar__item" :class="{ 'is-selected': item.selected }" :aria-pressed="item.selected === undefined ? undefined : String(!!item.selected)" :aria-label="item.label" :data-tip="item.label" :disabled="item.disabled" @click="$emit('action', item.id)">
          <MIcon :name="item.icon" /><span class="m-toolbar__label">{{ item.label }}</span>
        </button>
        <slot />
        <template #fab><MFab inline extended :icon="doneIcon" :label="doneLabel" @click="$emit('done')" /></template>
      </MToolbar>
    </div>
  </Teleport>
</template>
