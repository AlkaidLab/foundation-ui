<script setup>
import MIcon from './MIcon.vue'
import MLoading from './MLoading.vue'

// Busy keeps the button as it is (same colour, same width, the same place for the glyph): the progress indicator takes the place of the icon with a crossfade
// and a press is ignored until it ends. It is not `disabled`, so nothing flashes grey when a short action starts and ends.
const props = defineProps({
  variant: { type: String, default: 'filled' }, // filled | tonal | outlined | text | danger | warning
  /** xs 32 | s 40 (the default) | m 56 | l 96 | xl 136 (M3 Expressive); the older sm = xs, md = s, lg = m */
  size: { type: String, default: 'md' },
  /** round (CornerFull) or square (the size's square corner) */
  shape: { type: String, default: 'round' },
  /** a toggle button when given: aria-pressed, the selected colours, round and square swap when selected; v-model:selected */
  selected: { type: Boolean, default: undefined },
  icon: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})
const emit = defineEmits(['update:selected'])
const SIZES = { xs: 'xs', sm: 'sm', s: '', md: '', m: 'm', lg: 'lg', l: 'l', xl: 'xl' }
const block = (event) => { if (props.loading) { event.preventDefault(); event.stopImmediatePropagation() } else if (props.selected !== undefined) emit('update:selected', !props.selected) }
</script>

<template>
  <button
    :type="type"
    class="m-btn"
    :class="[variant !== 'filled' && `m-btn--${variant}`, SIZES[size] && `m-btn--${SIZES[size]}`, shape === 'square' && 'm-btn--square', { 'is-loading': loading }]"
    :disabled="disabled"
    :aria-pressed="selected === undefined ? undefined : String(selected)"
    :aria-busy="loading || undefined"
    :aria-disabled="loading || undefined"
    @click.capture="block"
  >
    <span v-if="loading || icon" class="m-btn__lead" :class="{ 'is-busy': loading }" aria-hidden="true">
      <MLoading class="m-btn__loading" size="18px" />
      <MIcon v-if="icon" :name="icon" />
    </span>
    <slot />
  </button>
</template>
