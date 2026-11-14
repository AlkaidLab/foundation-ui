<script setup>
import { ref } from 'vue'
import MIcon from './MIcon.vue'

// A check that can expand: a status icon (ok / warn / error / pending), a title, one line of result, details below.
const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  state: { type: String, default: 'ok' }, // ok | warn | error | pending | info
})
const icon = { ok: 'check_circle', warn: 'warning', error: 'error', pending: 'schedule', info: 'info' }
const id = ref(`m-check-${Math.random().toString(36).slice(2, 8)}`)
</script>

<template>
  <div class="m-item m-check" :class="`m-check--${state}`" role="listitem">
    <button type="button" class="m-check__head" :aria-expanded="$slots.default ? open : undefined" :aria-controls="id" @click="$slots.default && (open = !open)">
      <span class="m-item__lead m-check__icon"><MIcon :name="icon[props.state] || 'info'" fill /></span>
      <span class="m-item__body"><span class="m-item__title">{{ title }}</span><span v-if="text" class="m-item__text">{{ text }}</span></span>
      <MIcon v-if="$slots.default" class="m-check__more" :name="open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
    </button>
    <div v-if="$slots.default && open" :id="id" class="m-check__body"><slot /></div>
  </div>
</template>
