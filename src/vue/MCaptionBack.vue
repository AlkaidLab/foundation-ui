<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import { captionTexts, fill } from '../nav/captionTexts.js'

// Variant A of the global back: a round button at the far left of the caption bar, left of the logo. Enabled only while there is a place to go back to; its tooltip names the place.
const props = defineProps({
  /** the name of the place the button goes back to; '' when there is none */
  page: { type: String, default: '' },
  locale: { type: String, default: 'en' },
  texts: { type: Object, default: null },
})
const emit = defineEmits(['back'])
const T = computed(() => captionTexts(props.locale, props.texts))
const enabled = computed(() => !!props.page)
const label = computed(() => (enabled.value ? fill(T.value.backTo, { page: props.page }) : T.value.backNowhere))
</script>

<template>
  <button type="button" class="m-capback" :disabled="!enabled" :aria-label="label" :data-tip="label" @click="emit('back')">
    <MIcon name="arrow_back" />
  </button>
</template>
