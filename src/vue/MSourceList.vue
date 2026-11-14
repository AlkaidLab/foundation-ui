<script setup>
import { computed } from 'vue'
import MItem from './MItem.vue'
import MChip from './MChip.vue'

// The rows of the update source (自动 · CNB · GitHub · Mirror酱), one radio row each, for the guide step and 软件更新. They are rows only: the caller puts them in its group.
// Mirror酱 carries two quiet labels, 国内高速 and 付费, and says in its own line what it is (what it costs, who it pays); the other sources need no words.
const props = defineProps({
  /** updateSourceTexts(locale) */
  texts: { type: Object, required: true },
  source: { type: String, default: 'auto' },
  /** whether Mirror酱 is among the choices (the guide offers it to a Chinese interface, or when it is already the source) */
  mirror: { type: Boolean, default: true },
})
const emit = defineEmits(['pick'])
const ICONS = { auto: 'sync', cnb: 'cloud', github: 'code', mirror: 'bolt' }
const options = computed(() => ['auto', 'cnb', 'github', ...(props.mirror ? ['mirror'] : [])].map((value) => ({ value, icon: ICONS[value], label: props.texts.sources[value], text: value === 'mirror' ? props.texts.mirrorAbout : '' })))
</script>

<template>
  <MItem v-for="o in options" :key="o.value" action role="radio" :icon="o.icon" :title="o.label" :text="o.text" :wrap="o.value === 'mirror'" :selected="source === o.value" :aria-checked="source === o.value" :data-source="o.value" @click="emit('pick', o.value)">
    <template v-if="o.value === 'mirror'" #trail><span class="m-srclabels"><MChip>{{ texts.tagDomestic }}</MChip><MChip>{{ texts.tagPaid }}</MChip></span></template>
  </MItem>
</template>
