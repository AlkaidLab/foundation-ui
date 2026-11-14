<script setup>
import MIcon from './MIcon.vue'
import MPrepArt from './MPrepArt.vue'

// The handling of the physical displays during a stream as connected buttons, each with a small diagram of what it leaves on. The picture is the same MPrepArt the
// first-run guide draws, so the setting looks the same everywhere. One choice, a radio group.
const model = defineModel({ type: String, default: 'no_operation' })
defineProps({
  /** [{ value, label, disabled? }] */
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
</script>

<template>
  <div class="m-prepseg" role="radiogroup" :aria-label="label">
    <button v-for="option in options" :key="option.value" type="button" role="radio" class="m-prepseg__btn" :class="{ 'is-on': option.value === model }" :aria-checked="option.value === model" :disabled="disabled || option.disabled" @click="model = option.value">
      <MPrepArt :mode="option.value" />
      <span class="m-prepseg__label">{{ option.label }}</span>
      <MIcon v-if="option.value === model" class="m-prepseg__mark" name="check_circle" fill />
    </button>
  </div>
</template>

<style>
.m-prepseg { display: flex; gap: 2px; }
.m-prepseg__btn { all: unset; box-sizing: border-box; flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 6px 12px; background: var(--m-card); color: var(--md-sys-color-on-surface-variant); cursor: pointer; border-radius: 8px; transition: background-color .2s, border-radius .2s, color .2s; }
.m-prepseg__btn:first-child { border-radius: 24px 8px 8px 24px; }
.m-prepseg__btn:last-child { border-radius: 8px 24px 24px 8px; }
.m-prepseg__btn:hover { background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, var(--m-card)); }
.m-prepseg__btn:focus-visible { outline: 2px solid var(--md-sys-color-primary); outline-offset: 2px; z-index: 1; }
.m-prepseg__btn:disabled { opacity: .38; cursor: not-allowed; }
.m-prepseg__btn.is-on { background: color-mix(in srgb, var(--md-sys-color-primary) 20%, var(--m-card)); color: var(--md-sys-color-on-surface); border-radius: 24px; }
.m-prepseg__btn { position: relative; }
.m-prepseg__mark { position: absolute; top: 8px; right: 10px; font-size: 20px; color: var(--md-sys-color-primary-text); }
.m-prepseg__btn .m-prepart { max-width: 104px; }
.m-prepseg__label { font: var(--m-label-large, 500 14px/20px sans-serif); text-align: center; }
@media (max-width: 480px) { .m-prepseg { flex-wrap: wrap; } .m-prepseg__btn { flex: 1 1 calc(50% - 2px); border-radius: 18px !important; } }
</style>
