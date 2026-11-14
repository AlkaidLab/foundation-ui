<script setup>
import { ref, useId } from 'vue'
import MIcon from './MIcon.vue'

// Split button (SplitButtonSmallTokens, Compose Material3; MDC SplitButton.md): the main action and a menu of related actions. items: [{ id, label, icon?, danger?, selected? }]
// Open (aria-expanded): the trailing button turns round and its arrow turns over; hovered or focused, the inner corners open from 4 to 12.
defineProps({
  label: { type: String, required: true },
  icon: { type: String, default: '' },
  items: { type: Array, required: true },
  variant: { type: String, default: 'filled' }, // filled | tonal | outlined
  menuLabel: { type: String, default: 'More' },
  disabled: { type: Boolean, default: false },
  /** the main action is running: its label stays, the press is ignored */
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['click', 'select'])
const menu = ref(null)
const open = ref(false)
const id = useId()
</script>

<template>
  <div class="m-split" :class="[`m-split--${variant}`, { 'is-open': open }]">
    <button type="button" class="m-split__main" :disabled="disabled" :aria-busy="busy || undefined" @click="busy || emit('click', $event)">
      <MIcon v-if="icon" :name="icon" /><span>{{ label }}</span>
    </button>
    <button :id="id" type="button" class="m-split__more" :disabled="disabled" :aria-label="menuLabel" :data-tip="menuLabel" aria-haspopup="menu" :aria-expanded="String(open)" @click="menu.open = !menu.open">
      <MIcon name="keyboard_arrow_down" />
    </button>
    <md-menu ref="menu" :anchor="id" positioning="popover" @opening="open = true" @closing="open = false" @closed="open = false">
      <md-menu-item v-for="item in items" :key="item.id" :class="{ 'm-danger': item.danger }" @click="emit('select', item)">
        <MIcon v-if="item.icon || item.selected !== undefined" slot="start" :name="item.selected ? 'check' : item.icon || 'radio_button_unchecked'" />
        <div slot="headline">{{ item.label }}</div>
      </md-menu-item>
    </md-menu>
  </div>
</template>
