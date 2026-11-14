<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import { captionTexts, fill } from '../nav/captionTexts.js'

// Variant B of the global back: after a jump between areas, a small 「← 返回<页面>」 chip at the top of the page you landed on. It goes away when you navigate anywhere else.
const props = defineProps({
  page: { type: String, default: '' },
  locale: { type: String, default: 'en' },
  texts: { type: Object, default: null },
})
const emit = defineEmits(['back'])
const T = computed(() => captionTexts(props.locale, props.texts))
const text = computed(() => fill(T.value.chipBack, { page: props.page || T.value.here }))
</script>

<template>
  <button type="button" class="m-backchip" :aria-label="text" @click="emit('back')">
    <MIcon name="arrow_back" />
    <span>{{ text }}</span>
  </button>
</template>
