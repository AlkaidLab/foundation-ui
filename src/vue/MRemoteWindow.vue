<script setup>
import { computed } from 'vue'
import MIconButton from './MIconButton.vue'
import MOnboardWindow from './MOnboardWindow.vue'
import MRemoteAccess from './MRemoteAccess.vue'
import { remoteTexts } from './remoteTexts.js'

// The remote access tutorials in the window of the first run (a floating dialog), for the places that are not the first run: 主机设置 › 网络, 帮助 and the fix of a reason
// of the reachability check. Same component and same words as the step of the guide.
const open = defineModel({ type: Boolean, default: false })
const props = defineProps({
  locale: { type: String, default: 'en' },
  state: { type: Object, default: () => ({}) },
  callbacks: { type: Object, default: () => ({}) },
  initialMode: { type: String, default: '' },
})
const T = computed(() => remoteTexts(props.locale))
</script>

<template>
  <MOnboardWindow v-if="open" mode="dialog" :label="T.title" @close="open = false">
    <div class="m-remotewin">
      <header class="m-remotewin__bar"><h2>{{ T.title }}</h2><MIconButton icon="close" :label="T.close" @click="open = false" /></header>
      <div class="m-remotewin__body"><div class="m-remotewin__col"><MRemoteAccess :locale="locale" :state="state" :callbacks="callbacks" :initial-mode="initialMode" /></div></div>
    </div>
  </MOnboardWindow>
</template>
