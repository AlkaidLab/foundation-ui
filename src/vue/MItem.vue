<script setup>
import { computed, inject, onBeforeUnmount, useAttrs, useSlots } from 'vue'
import { redactKindOf } from '../devmode/shot.js'
import MIcon from './MIcon.vue'

// One row of a group. Title, at most one short second line (the value, or a few words on what the row does), a plain
// outline icon only where the group needs one, a control at the end. Rows that lead somewhere show no caret.
// a settings row (data-cfg is the key) whose key holds a name, an address, a path or a serial is a box of the screenshot redaction; a data-redact given by the caller wins
const rowAttrs = useAttrs()
const autoRedact = computed(() => ((rowAttrs['data-cfg'] || rowAttrs['data-diff']) ? redactKindOf(rowAttrs['data-cfg'] || rowAttrs['data-diff']) || undefined : undefined))
const props = defineProps({
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  icon: { type: String, default: '' },
  /** kept for older callers; deep pages show plain monochrome icons */
  tone: { type: String, default: '' },
  /** Whole row is a button (opens a page or a dialog). */
  action: { type: Boolean, default: false },
  /** Caret: only for promotional rows. */
  chevron: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Control (slider, button group) sits below the text instead of beside it. */
  stack: { type: Boolean, default: false },
  /** The end controls drop below the text, right-aligned, when the row is too narrow for both (a row with three buttons on a phone); the title never shrinks to a column of single characters. */
  wrap: { type: Boolean, default: false },
  plain: { type: Boolean, default: false },
  href: { type: String, default: '' },
  /** Current value, shown as the second line. */
  value: { type: String, default: '' },
  /** what the row can be pinned to the overview as (see pins/registry.js); with a product's MPinHost the row gets an overflow button, a right click and a long press that open the pin menu */
  pin: { type: Object, default: null },
})
const emit = defineEmits(['click'])
const slots = useSlots()
const pinning = inject('m-pin', null)
const canPin = computed(() => !!props.pin && !!pinning && !props.disabled)
const openPin = (event) => { if (canPin.value) pinning.open(event, props.pin) }
const onContext = (event) => { if (canPin.value) { event.preventDefault(); pinning.open(event, props.pin) } }
// a long press (touch, pen) opens the same menu; the click that follows it is dropped
let press = 0, pressed = false, from = null
const cancelPress = () => { clearTimeout(press); press = 0 }
const onDown = (event) => { if (!canPin.value || event.pointerType === 'mouse' || event.button > 0) return; from = { x: event.clientX, y: event.clientY }; pressed = false; cancelPress(); press = setTimeout(() => { pressed = true; pinning.open({ clientX: from.x, clientY: from.y, preventDefault() {} }, props.pin) }, 550) }
const onMove = (event) => { if (press && from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 8) cancelPress() }
const onClick = (event) => { if (pressed) { pressed = false; event.preventDefault(); event.stopPropagation(); return } emit('click', event) }
onBeforeUnmount(cancelPress)
const tag = computed(() => (props.href ? 'a' : props.action ? 'button' : 'div'))
const classes = computed(() => ({
  'm-item--action': props.action || !!props.href,
  'm-item--selected': props.selected,
  'm-item--disabled': props.disabled,
  'm-item--stack': props.stack,
  'm-item--wrap': props.wrap,
  'm-item--plain': props.plain || (!props.icon && !slots.lead),
}))
</script>

<template>
  <component
    :is="tag"
    class="m-item"
    :data-redact="autoRedact"
    :class="classes"
    role="listitem"
    :type="tag === 'button' ? 'button' : undefined"
    :href="href || undefined"
    :disabled="tag === 'button' ? disabled : undefined"
    :aria-disabled="disabled || undefined"
    @click="onClick"
    @contextmenu="onContext"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="cancelPress"
    @pointercancel="cancelPress"
  >
    <div v-if="icon || $slots.lead" class="m-item__lead">
      <slot name="lead"><MIcon :name="icon" /></slot>
    </div>
    <div class="m-item__body">
      <span class="m-item__title"><slot name="title">{{ title }}</slot></span>
      <span v-if="value || text || $slots.default" class="m-item__text"><slot>{{ value || text }}</slot></span>
    </div>
    <div v-if="$slots.trail || chevron || canPin" class="m-item__trail">
      <span v-if="canPin" class="m-item__more" role="button" tabindex="0" :aria-label="pin.title" aria-haspopup="menu" @click.stop.prevent="openPin" @keydown.enter.stop.prevent="openPin" @keydown.space.stop.prevent="openPin" @pointerdown.stop><MIcon name="more_vert" /></span>
      <slot name="trail" />
      <MIcon v-if="chevron" class="m-item__chev" name="chevron_right" />
    </div>
    <div v-if="$slots.control" class="m-item__control"><slot name="control" /></div>
  </component>
</template>
