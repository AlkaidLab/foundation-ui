<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import MBanner from './MBanner.vue'
import MGroup from './MGroup.vue'
import MItem from './MItem.vue'
import MButton from './MButton.vue'
import { GUIDE_DEVICES, clientFor } from './guideModel.js'

// The end of the host part of the guide: this computer is ready, and the recommended client of every kind of device is one click away (the next steps install, pair and connect).
const props = defineProps({ T: { type: Object, required: true }, locale: { type: String, default: 'en' } })
const emit = defineEmits(['open-url'])
const clients = computed(() => GUIDE_DEVICES.map((d) => ({ id: d.id, icon: d.icon, client: clientFor(d.id, props.locale) })).filter((d) => d.client))
const name = (d) => props.T.install.devices[d.id] || d.id
</script>

<template>
  <MBanner tone="info" icon="check_circle">{{ T.hostdone.done }}</MBanner>
  <h2 class="m-guide__label">{{ T.hostdone.download }}</h2>
  <MGroup>
    <MItem v-for="d in clients" :key="d.id" :icon="d.icon" :title="name(d)" :text="d.client.name">
      <template #trail><MButton variant="tonal" icon="open_in_new" :aria-label="`${name(d)}: ${T.open}`" @click="emit('open-url', d.client.url)">{{ T.open }}</MButton></template>
    </MItem>
  </MGroup>
  <p class="m-guide__note"><MIcon name="info" />{{ T.hostdone.note }}</p>
</template>
