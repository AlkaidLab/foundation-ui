<script setup>
import MSwitch from './MSwitch.vue'

// A switch card of the control strip.
const model = defineModel({ type: Boolean, default: false })
defineProps({ label: { type: String, required: true }, sub: { type: String, default: '' }, disabled: { type: Boolean, default: false } })
</script>

<template>
  <div class="m-dstrip m-dcard m-dstrip--switch">
    <span class="m-dstrip__text"><b>{{ label }}</b><small v-if="sub">{{ sub }}</small></span>
    <MSwitch v-model="model" :label="label" :disabled="disabled" />
  </div>
</template>
