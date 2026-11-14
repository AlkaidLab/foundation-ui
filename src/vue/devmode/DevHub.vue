<script setup>
import { computed } from 'vue'
import MGroup from '../MGroup.vue'
import MItem from '../MItem.vue'
import { devmodeTexts } from '../../devmode/texts.js'

// 开发者 on a phone: the pages as one list (the rails have no list pane there). `pages`: [{ id, route }], `open(page)`.
const props = defineProps({ locale: { type: String, default: 'zh' }, pages: { type: Array, required: true } })
const emit = defineEmits(['open'])
const T = computed(() => devmodeTexts(props.locale))
const ICON = { issues: 'bug_report', logs: 'terminal', api: 'api', flags: 'flag', build: 'deployed_code', tests: 'science', options: 'code' }
</script>

<template>
  <MGroup data-dev="hub">
    <MItem v-for="p in pages" :key="p.id" action :icon="ICON[p.id]" :title="T.pages[p.id]" :text="T.lines[p.id]" :data-dev="`hub-${p.id}`" @click="emit('open', p)" />
  </MGroup>
</template>
