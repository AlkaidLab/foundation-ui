<script setup>
import { computed } from 'vue'
import MItem from './MItem.vue'
import MIconButton from './MIconButton.vue'
import MInfo from './MInfo.vue'

// A path setting: the field shows and edits the path, the button next to it browses (the product passes `browse`, a
// function that returns the chosen path or ''; without it no button shows). The default is a placeholder.
const model = defineModel({ type: String, default: '' })
const props = defineProps({
  label: { type: String, required: true },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: 'folder_open' },
  browseLabel: { type: String, default: 'Browse' },
  browse: { type: Function, default: null },
  disabled: { type: Boolean, default: false },
  info: { type: String, default: '' },
  error: { type: String, default: '' },
})
const canBrowse = computed(() => typeof props.browse === 'function')
async function pick() {
  const chosen = await props.browse()
  if (chosen) model.value = chosen
}
</script>

<template>
  <MItem class="m-item--path" :disabled="disabled">
    <template #title><span class="m-path__label">{{ label }}</span></template>
    <div class="m-path">
      <input v-model="model" class="m-path__input m-input" type="text" spellcheck="false" :placeholder="placeholder" :aria-label="label" :aria-invalid="!!error || undefined" :disabled="disabled" />
      <MIconButton v-if="canBrowse" :icon="icon" tonal :label="browseLabel" :disabled="disabled" @click="pick" />
    </div>
    <p v-if="error" class="m-path__error" role="alert">{{ error }}</p>
    <template v-if="info" #trail><MInfo :text="info" /></template>
  </MItem>
</template>
