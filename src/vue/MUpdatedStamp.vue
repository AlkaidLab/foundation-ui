<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MIcon from './MIcon.vue'
import { stampLabel, stampTexts } from '../stamp/index.js'

// "更新于 14:05" / "Updated 3 min ago": when the data on this page was last read. The text keeps itself current (every 30 s, paused while the
// window is hidden). Clicking it refreshes, when the page can; the time stays as it was if the refresh fails.
const props = defineProps({
  /** the time of the last read (ms since epoch); nothing is drawn without it */
  at: { type: [Number, Date], default: 0 },
  locale: { type: String, default: 'en' },
  refreshing: { type: Boolean, default: false },
  /** the page can refresh; without it the stamp is plain text */
  refreshable: { type: Boolean, default: true },
})
const emit = defineEmits(['refresh'])
const now = ref(Date.now())
let timer = 0
const tick = () => { now.value = Date.now() }
const visible = () => { if (typeof document === 'undefined' || !document.hidden) tick() }
onMounted(() => {
  timer = setInterval(() => { if (typeof document === 'undefined' || !document.hidden) tick() }, 30000)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visible)
})
onBeforeUnmount(() => { clearInterval(timer); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visible) })
const T = computed(() => stampTexts(props.locale))
const text = computed(() => stampLabel(props.at, { now: now.value, locale: props.locale }))
const label = computed(() => (props.refreshing ? T.value.refreshing : text.value))
</script>

<template>
  <component :is="refreshable ? 'button' : 'span'" v-if="text" class="m-stamp" :class="{ 'm-stamp--busy': refreshing }" :type="refreshable ? 'button' : undefined" :disabled="refreshable && refreshing" :aria-label="refreshable ? `${text}. ${T.refresh}` : undefined" :data-tip="refreshable ? T.refresh : undefined" data-stamp @click="refreshable && emit('refresh')">
    <MIcon v-if="refreshable" name="refresh" class="m-stamp__icon" />
    <span class="m-stamp__text">{{ label }}</span>
  </component>
</template>
