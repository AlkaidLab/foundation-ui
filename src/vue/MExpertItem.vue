<script setup>
import { computed, inject, onBeforeUnmount } from 'vue'
import MIcon from './MIcon.vue'
import MInfo from './MInfo.vue'
import MIconButton from './MIconButton.vue'

// A tier 3 (expert) row: the control works in place; what the person needs to judge it (what it does, what changes when it is touched, the default) is the row's help, behind
// the info icon like on every other row; a row that differs from the default is marked and has a reset button.
// The one rule for help and folds, app-wide: help sits behind an info icon (MInfo) that opens on a click, a tap or the keyboard; a fold (MExpander) holds a group of rows, never one row's help.
// Like every row it can be pinned to the overview (an overflow button, a long press): a tier 3 setting pins as a link to its page.
const props = defineProps({
  title: { type: String, required: true },
  /** the current value as the person reads it ("500 ms", "On") */
  value: { type: String, default: '' },
  changed: { type: Boolean, default: false },
  /** '' | 'medium' | 'high' | 'critical': marks a row that the save confirmation lists */
  risk: { type: String, default: '' },
  desc: { type: String, default: '' },
  defText: { type: String, default: '' },
  effect: { type: String, default: '' },
  /** control below the title (slider, button group, field) instead of beside it (switch) */
  stack: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  texts: { type: Object, default: () => ({}) },
  /** what the row can be pinned to the overview as (see MItem and pins/registry.js) */
  pin: { type: Object, default: null },
})
const emit = defineEmits(['reset'])
const t = (key, fallback) => props.texts[key] || fallback
const pinning = inject('m-pin', null)
const canPin = computed(() => !!props.pin && !!pinning && !props.disabled)
const openPin = (event) => { if (canPin.value) pinning.open(event, props.pin) }
// a long press (touch, pen) opens the same menu; the click that follows it is dropped
let press = 0, pressed = false, from = null
const cancelPress = () => { clearTimeout(press); press = 0 }
const onDown = (event) => { if (!canPin.value || event.pointerType === 'mouse' || event.button > 0) return; from = { x: event.clientX, y: event.clientY }; pressed = false; cancelPress(); press = setTimeout(() => { pressed = true; pinning.open({ clientX: from.x, clientY: from.y, preventDefault() {} }, props.pin) }, 550) }
const onMove = (event) => { if (press && from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 8) cancelPress() }
const onClick = (event) => { if (pressed) { pressed = false; event.preventDefault(); event.stopPropagation() } }
// the help of the row: what it does, what changes, the default (one line each)
const help = computed(() => [props.desc, props.effect && `${t('effect', 'Effect')}: ${props.effect}`, props.defText && `${t('default', 'Default')}: ${props.defText}`].filter(Boolean).join('\n'))
onBeforeUnmount(cancelPress)
</script>

<template>
  <div class="m-item m-expert" :class="{ 'is-changed': changed, 'm-expert--stack': stack, 'm-item--disabled': disabled }" role="listitem" @click.capture="onClick" @pointerdown="onDown" @pointermove="onMove" @pointerup="cancelPress" @pointercancel="cancelPress">
    <div class="m-expert__head">
      <div class="m-expert__toggle">
        <span class="m-item__body">
          <span class="m-item__title">{{ title }}</span>
          <span v-if="value" class="m-item__text">{{ value }}</span>
        </span>
        <span v-if="changed" class="m-chip m-chip--info m-expert__chip">{{ t('changed', 'Changed') }}</span>
        <span v-if="risk" class="m-chip m-chip--warn m-expert__chip"><MIcon name="warning" />{{ t('risk', 'Confirmed on save') }}</span>
        <MInfo v-if="help" :text="help" />
        <MIconButton v-if="changed" icon="restart_alt" :label="t('reset', 'Reset to default')" :disabled="disabled" @click="emit('reset')" />
      </div>
      <span v-if="canPin" class="m-item__more" role="button" tabindex="0" :aria-label="pin.title" aria-haspopup="menu" @click.stop.prevent="openPin" @keydown.enter.stop.prevent="openPin" @keydown.space.stop.prevent="openPin" @pointerdown.stop><MIcon name="more_vert" /></span>
      <div v-if="!stack" class="m-expert__control"><slot /></div>
    </div>
    <div v-if="stack" class="m-expert__control m-expert__control--stack"><slot /></div>
  </div>
</template>
