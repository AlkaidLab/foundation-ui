<script setup>
import MSwitch from './MSwitch.vue'

// Master switch of a feature: a large saturated pill at the top of the page; the options sit in groups below it.
const model = defineModel({ type: Boolean, default: false })
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
</script>

<template>
  <div class="m-master" :class="{ 'is-on': model, 'is-disabled': disabled }" role="group" @click="!disabled && (model = !model)">
    <span class="m-master__body"><b>{{ title }}</b><span v-if="text">{{ text }}</span></span>
    <MSwitch v-model="model" :label="title" :disabled="disabled" @click.stop />
  </div>
</template>
