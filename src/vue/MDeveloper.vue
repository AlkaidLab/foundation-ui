<script setup>
import { computed, ref } from 'vue'
import MField from './MField.vue'
import MButton from './MButton.vue'
import MBanner from './MBanner.vue'
import { announcementTexts } from './announcementTexts.js'
import { useDeveloperMode } from './useDeveloperMode.js'

// The developer entry: what only the people who build the product need. It exists once developer mode is on (seven taps on the version in 关于, nowhere else) and holds the local
// announcement source, whatever the product adds in the default slot, and the way to turn developer mode off again.
const props = defineProps({
  locale: { type: String, default: 'en' },
  /** fetch the announcements again (after the source changed) */
  onRefresh: { type: Function, default: null },
})
const emit = defineEmits(['disabled'])
const T = computed(() => announcementTexts(props.locale).dev)
const dev = useDeveloperMode()
const draft = ref(dev.source.value)
const note = ref('')
function apply() { const ok = dev.setSource(draft.value); note.value = ok ? T.value.applied : T.value.bad; if (ok) props.onRefresh?.() }
function reset() { draft.value = ''; dev.setSource(''); note.value = T.value.applied; props.onRefresh?.() }
function turnOff() { dev.disable(); emit('disabled') }
</script>

<template>
  <div class="m-dev">
    <section class="m-dev__block">
      <MField v-model="draft" :label="T.source" placeholder="http://127.0.0.1:18095/announcements.json" :supporting="T.sourceHint" />
      <div class="m-dev__row">
        <MButton variant="tonal" size="sm" icon="check" @click="apply">{{ T.apply }}</MButton>
        <MButton variant="text" size="sm" @click="reset">{{ T.reset }}</MButton>
        <MButton variant="text" size="sm" icon="refresh" @click="onRefresh?.()">{{ T.refresh }}</MButton>
      </div>
      <MBanner v-if="note" tone="info" icon="info">{{ note }}</MBanner>
    </section>
    <slot />
    <div class="m-dev__row m-dev__off"><MButton variant="outlined" icon="power_settings_new" @click="turnOff">{{ T.turnOff }}</MButton></div>
  </div>
</template>
