<script setup>
import MIcon from './MIcon.vue'
import MBadge from './MBadge.vue'

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  tonal: { type: Boolean, default: false },
  /** the destination this button opens is the current one */
  current: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** xs 32 | s 40 | m 56 | l 96 | xl 136 (M3 Expressive); empty: the kit's 48 px round button */
  size: { type: String, default: '' },
  /** narrow | uniform | wide (with a size) */
  width: { type: String, default: 'uniform' },
  /** round | square (with a size) */
  shape: { type: String, default: 'round' },
  /** standard | filled | tonal | outlined */
  variant: { type: String, default: 'standard' },
  /** a toggle button when given: aria-pressed, round and square swap when selected; v-model:selected */
  selected: { type: Boolean, default: undefined },
  /** a mark in the corner: 'dot' or a count; empty: none (the update dot on the 关于 button of the rail) */
  badge: { type: [String, Number], default: '' },
})
const emit = defineEmits(['update:selected'])
const toggle = () => { if (props.selected !== undefined) emit('update:selected', !props.selected) }
</script>

<template>
  <button
    type="button"
    class="m-icon-btn"
    :class="[{ 'm-icon-btn--tonal': tonal || current || variant === 'tonal', 'is-sized': !!size, 'm-icon-btn--square': size && shape === 'square' }, size && `m-icon-btn--${size}`, size && width !== 'uniform' && `m-icon-btn--${width}`, variant !== 'tonal' && `m-icon-btn--${variant}`]"
    :aria-current="current ? 'page' : undefined"
    :aria-pressed="selected === undefined ? undefined : String(selected)"
    :aria-label="label"
    :data-tip="label"
    :disabled="disabled"
    @click="toggle"
  >
    <MIcon :name="icon" />
    <MBadge v-if="badge" class="m-icon-btn__badge" :value="badge === 'dot' ? null : badge" />
  </button>
</template>
