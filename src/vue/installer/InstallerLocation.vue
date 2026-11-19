<script setup>
import MButton from '../MButton.vue'
import MIcon from '../MIcon.vue'

// The install-location row of the first page and the maintenance page: where the program goes, how much room the drive has, and (a fresh install only) the Change button that makes the host open the system folder picker.
// A refused folder shows its reason under the row. The host owns every check (installDir.error); the row only draws what it was told.
defineProps({ model: { type: Object, required: true }, busy: { type: Boolean, default: false } })
const emit = defineEmits(['action'])
</script>

<template>
  <div class="m-inst__loc" :class="{ 'is-error': !!model.error }" data-inst-location>
    <div class="m-inst__loc-row">
      <span class="m-inst__loc-icon"><MIcon name="folder" /></span>
      <span class="m-inst__loc-text">
        <b>{{ model.label }}</b>
        <span class="m-inst__loc-path" :title="model.path"><span class="m-inst__loc-head">{{ model.head }}</span><span class="m-inst__loc-tail">{{ model.tail }}</span></span>
        <span v-if="model.free" class="m-inst__loc-free">{{ model.free }}</span>
      </span>
      <MButton v-if="model.editable" variant="tonal" class="m-inst__loc-change" :loading="busy" @click="emit('action', { type: 'choose-dir' })">{{ model.change }}</MButton>
    </div>
    <p v-if="model.error" class="m-inst__loc-error" role="alert" :data-code="model.error.code"><MIcon name="error" fill /><span>{{ model.error.text }}</span></p>
  </div>
</template>
