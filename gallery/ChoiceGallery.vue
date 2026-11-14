<script setup>
import { ref } from 'vue'
import { MTraySettings, MWebAccess, MAppearance, MCoverGrid, MChoiceCards, MSwatches, MSection } from '../src/vue/index.js'

// Every selectable card / choice of the package in its selected state, with mock data (no host): the page the selected-state QA looks at.
// ?only=tray|reach|appearance|cover|cards|swatches shows one block.
const q = new URLSearchParams(location.search)
const only = q.get('only') || ''
const locale = q.get('locale') || 'zh'
const show = (k) => !only || only === k
const prefs = ref({ right: 'v3', click: 'panel', double: 'v2', forceNative: false })
const scope = ref(q.get('scope') || 'lan')
const bind = ref('')
const listeners = { active: { scope: 'lan' }, saved: { scope: 'lan' }, addresses: [{ name: 'Ethernet', address: '192.168.7.20' }, { name: 'Wi-Fi', address: '192.168.7.31' }] }
const cards = ref('b')
const options = [
  { value: 'a', label: '低延迟', text: '画面优先让位,延迟最小', icon: 'bolt' },
  { value: 'b', label: '均衡', text: '延迟与画质折中', icon: 'balance' },
  { value: 'c', label: '高画质', text: '画质优先', icon: 'hd' },
]
const swatches = ref('#3a6ea5')
const colors = ['#3a6ea5', '#b5446e', '#2e8b57', '#c97b1a', '#6a4fb3', '#1a1a1a', '#f2f2f2'].map((value) => ({ value, label: value }))
const picked = ref(['b', 'e'])
const items = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ id, title: ['Steam', 'Desktop', 'Cyberpunk 2077', 'Elden Ring', 'Hades II', 'Balatro'][i], text: i === 1 ? '1920x1080' : '' }))
const toggle = (item) => { picked.value = picked.value.includes(item.id) ? picked.value.filter((x) => x !== item.id) : [...picked.value, item.id] }
</script>

<template>
  <main class="cg" style="max-width: 980px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); min-height: 100vh; box-sizing: border-box">
    <MSection v-if="show('tray')" title="托盘图标" data-block="tray"><MTraySettings v-model="prefs" :locale="locale" /></MSection>
    <MSection v-if="show('reach')" title="访问范围" data-block="reach"><MWebAccess v-model:scope="scope" v-model:bind="bind" :locale="locale" :listeners="listeners" :password="true" :advanced="false" /></MSection>
    <MSection v-if="show('appearance')" title="外观" data-block="appearance"><MAppearance :locale="locale" /></MSection>
    <MSection v-if="show('cover')" title="应用封面(选择模式)" data-block="cover"><MCoverGrid :items="items" :selected="picked" @select="toggle" /></MSection>
    <MSection v-if="show('cards')" title="选择卡片" data-block="cards"><MChoiceCards v-model="cards" :options="options" :columns="3" label="x" /></MSection>
    <MSection v-if="show('swatches')" title="色块" data-block="swatches"><MSwatches v-model="swatches" :colors="colors" label="色块" /></MSection>
  </main>
</template>
