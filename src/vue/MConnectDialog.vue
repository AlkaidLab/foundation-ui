<script setup>
import MSheet from './MSheet.vue'
import MSeg from './MSeg.vue'
import MConnectPanel from './MConnectPanel.vue'
import { connectTexts } from '../clients/recommend.js'

// 连接设备: the dialog the caption button, the search and the pairing prompt open. Two tabs, 配对 and 安装客户端, over the same choice of the device's system.
const open = defineModel({ type: Boolean, default: false })
const tab = defineModel('tab', { type: String, default: 'pair' })
const os = defineModel('os', { type: String, default: 'android' })
defineProps({
  locale: { type: String, default: 'en' }, qr: { type: Function, default: null }, pairQr: { type: Object, default: null },
  canPin: { type: Boolean, default: true }, count: { type: Number, default: 0 }, latest: { type: String, default: '' }, closeLabel: { type: String, default: 'Close' },
  assetsOf: { type: Function, default: null }, versionOf: { type: Function, default: null },
})
const emit = defineEmits(['pair-pin', 'pair-qr-begin', 'pair-qr-stop', 'open-url', 'open-downloads'])
const T = (locale) => connectTexts(locale)
</script>

<template>
  <MSheet v-model="open" class="m-connect" :title="T(locale).title" side="center" :close-label="closeLabel">
    <MSeg v-model="tab" block :label="T(locale).title" :options="[{ value: 'pair', label: T(locale).tabs.pair, icon: 'link' }, { value: 'install', label: T(locale).tabs.install, icon: 'download' }]" />
    <MConnectPanel v-if="open" v-model:os="os" :view="tab" :locale="locale" :qr="qr" :pair-qr="pairQr" :can-pin="canPin" :count="count" :latest="latest" :assets-of="assetsOf" :version-of="versionOf"
      @pair-pin="(e) => emit('pair-pin', e)" @pair-qr-begin="emit('pair-qr-begin')" @pair-qr-stop="emit('pair-qr-stop')" @open-url="(u) => emit('open-url', u)" @open-downloads="emit('open-downloads')" />
  </MSheet>
</template>
