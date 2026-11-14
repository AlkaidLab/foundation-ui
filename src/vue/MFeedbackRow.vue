<script setup>
import { computed } from 'vue'
import MItem from './MItem.vue'
import { useErrors } from './useErrors.js'
import { diagnosticsTexts } from '../diagnostics/texts.js'

// 反馈: the row that opens the feedback form (the report dialog of MErrorHost, kind `manual`) from 帮助与关于. It shows only where a form
// host is mounted in this window (an embedded frame has none), and says what is sent: the person's text and the last log lines.
//   logs: the last log lines, when the page has them (the diagnostics page does; the help page sends none)
const props = defineProps({ locale: { type: String, default: 'en' }, logs: { type: String, default: '' } })
const { state, reportFeedback } = useErrors()
const T = computed(() => diagnosticsTexts(props.locale))
const available = computed(() => state.hosted > 0)
defineExpose({ open: () => reportFeedback({ logs: props.logs }) })
</script>

<template>
  <MItem v-if="available" action icon="send" :title="T.feedback" :text="T.feedbackHint" data-help-row="feedback" @click="reportFeedback({ logs })" />
</template>
