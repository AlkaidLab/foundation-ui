<script setup>
import { computed, ref } from 'vue'
import MChipSet from './MChipSet.vue'
import MIcon from './MIcon.vue'

// The frame rates the host offers a client (the `fps` list): the usual ones as chips to switch on and off, any other value typed
// in. At most five at a time and between 30 and 500, as the host allows. Shared by the settings page and a home card.
const model = defineModel({ type: Array, default: () => [] })
const props = defineProps({
  label: { type: String, default: 'FPS' },
  addLabel: { type: String, default: 'Add' },
  addText: { type: String, default: 'Add' },
  max: { type: Number, default: 5 },
})
const MIN_VALUE = 30
const MAX_VALUE = 500
const COMMON = ['30', '60', '90', '120', '144', '165', '240']
const draft = ref('')
const adding = ref(false)
const selected = computed({
  get: () => model.value.map(String),
  set: (value) => { model.value = value.slice(0, props.max) },
})
const options = computed(() => [...new Set([...COMMON, ...model.value.map(String)])].sort((a, b) => Number(a) - Number(b)).map((value) => ({ value, label: `${value} FPS` })))
const valid = (text) => /^\d+(\.\d+)?$/.test(text) && Number(text) >= MIN_VALUE && Number(text) <= MAX_VALUE
function add() {
  const value = draft.value.trim()
  if (valid(value) && !selected.value.includes(value)) selected.value = [...selected.value, value]
  draft.value = ''
  adding.value = false
}
</script>

<template>
  <div class="m-fps">
    <MChipSet v-model="selected" multiple :options="options" :label="label" />
    <form v-if="adding" class="m-fps__add" @submit.prevent="add">
      <input v-model="draft" class="m-fps__input m-input" inputmode="decimal" placeholder="119.88" :aria-label="addLabel" autofocus />
      <button type="submit" class="m-chipset__chip is-on" :disabled="!valid(draft.trim())">{{ addText }}</button>
    </form>
    <button v-else-if="model.length < max" type="button" class="m-chipset__chip" @click="adding = true"><MIcon name="add" />{{ addLabel }}</button>
  </div>
</template>
