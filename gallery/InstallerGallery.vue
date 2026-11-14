<script setup>
import { computed, ref, shallowRef, watch } from 'vue'
import { applyTheme } from '../src/tokens/theme.js'
import MInstaller from '../src/vue/installer/MInstaller.vue'
import { MOCK_SCENARIOS, createMockBridge } from '../src/vue/installer/bridge.js'
import { INSTALLER_STATES, snapshotOf, staticBridge } from '../src/vue/installer/installerStates.js'

// Every page and state of the installer, drawn by the real component on a mock bridge. The switcher moves one window between snapshots (so the page slide plays);
// "live" hands the window to the scripted host of bridge.js (click Install and watch the run).
// ?state= &theme= &locale= &live=1 &scenario= &bare=1 (the window alone) &w= &h= &motion=reduced
const q = new URLSearchParams(location.search)
const state = ref(INSTALLER_STATES.some((s) => s[0] === q.get('state')) ? q.get('state') : 'welcome')
const theme = ref(q.get('theme') || 'light')
const locale = ref(q.get('locale') === 'en' ? 'en' : 'zh')
const live = ref(q.get('live') === '1')
const scenario = ref(MOCK_SCENARIOS.includes(q.get('scenario')) ? q.get('scenario') : 'fresh')
const bare = q.get('bare') === '1'
const width = ref(Number(q.get('w')) || 820)
const height = ref(Number(q.get('h')) || 560)
const reduced = ref(q.get('motion') === 'reduced')
const sent = ref([])

const stat = staticBridge(snapshotOf(state.value))
const bridge = shallowRef(stat)
const key = ref(0)
function mount() {
  bridge.value = live.value ? createMockBridge({ scenario: scenario.value, locale: locale.value }) : stat
  key.value += 1
}
if (live.value) mount()
watch(state, (id) => { if (!live.value) stat.set(snapshotOf(id)) })
watch([live, scenario], mount)
watch(theme, (t) => {
  document.documentElement.setAttribute('data-bs-theme', t === 'black' ? 'dark' : t)
  document.documentElement.classList.toggle('dark', t !== 'light')
  applyTheme(document.documentElement, { black: t === 'black' })
})
watch(reduced, (r) => { if (r) document.documentElement.dataset.motion = 'reduced'; else delete document.documentElement.dataset.motion })
const groups = computed(() => {
  const out = []
  for (const s of INSTALLER_STATES) {
    let g = out.find((x) => x.id === s[1])
    if (!g) out.push((g = { id: s[1], items: [] }))
    g.items.push({ id: s[0], label: s[2] })
  }
  return out
})
// the shot scripts (and a person in the console) move the window to a state without the toolbar
if (typeof window !== 'undefined') window.__igSet = (id) => { state.value = id }
const onAction = (a) => { sent.value = [...sent.value.slice(-5), a.id ? `${a.type} ${a.id}` : a.type] }
</script>

<template>
  <div class="ig" :class="{ 'ig--bare': bare }">
    <aside v-if="!bare" class="ig-bar">
      <h1>安装器 · 网页界面</h1>
      <div class="ig-row">
        <button v-for="t in ['light', 'dark', 'black']" :key="t" :class="{ on: theme === t }" @click="theme = t">{{ { light: '浅色', dark: '深色', black: '纯黑' }[t] }}</button>
      </div>
      <div class="ig-row">
        <button :class="{ on: locale === 'zh' }" @click="locale = 'zh'">中文</button>
        <button :class="{ on: locale === 'en' }" @click="locale = 'en'">English</button>
        <button :class="{ on: reduced }" @click="reduced = !reduced">减少动效</button>
      </div>
      <div class="ig-row">
        <button :class="{ on: !live }" @click="live = false">状态</button>
        <button :class="{ on: live }" @click="live = true">脚本主机</button>
      </div>
      <div v-if="live" class="ig-row"><button v-for="s in MOCK_SCENARIOS" :key="s" :class="{ on: scenario === s }" @click="scenario = s">{{ s }}</button></div>
      <template v-else>
        <section v-for="g in groups" :key="g.id" class="ig-group">
          <h2>{{ g.id }}</h2>
          <div class="ig-row"><button v-for="s in g.items" :key="s.id" :class="{ on: state === s.id }" :data-state="s.id" @click="state = s.id">{{ s.label }}</button></div>
        </section>
      </template>
      <p class="ig-note">窗口 {{ width }}×{{ height }}。最近的动作:{{ sent.length ? sent.join(' · ') : '无' }}</p>
    </aside>
    <div class="ig-stage">
      <div class="ig-window" :style="{ width: `${width}px`, height: `${height}px` }" data-shot="window">
        <MInstaller :key="key" :bridge="bridge" :locale="locale" @action="onAction" />
      </div>
    </div>
  </div>
</template>

<style>
.ig { display: flex; min-height: 100vh; background: var(--md-sys-color-surface-dim, #d9dadd); color: var(--md-sys-color-on-surface); font: 14px/20px var(--md-ref-typeface-brand, system-ui); }
.ig--bare { display: block; min-height: 0; padding: 24px; width: max-content; }
.ig-bar { flex: none; width: 300px; padding: 20px 16px; overflow-y: auto; max-height: 100vh; background: var(--md-sys-color-surface); display: flex; flex-direction: column; gap: 10px; }
.ig-bar h1 { font-size: 18px; margin: 0 0 4px; }
.ig-group h2 { font-size: 12px; margin: 6px 0 4px; color: var(--md-sys-color-on-surface-variant); text-transform: uppercase; letter-spacing: .06em; }
.ig-row { display: flex; flex-wrap: wrap; gap: 6px; }
.ig-row button { padding: 5px 10px; border: 0; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12.5px; background: var(--md-sys-color-surface-container-high); color: var(--md-sys-color-on-surface); }
.ig-row button.on { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
.ig-note { font-size: 12px; color: var(--md-sys-color-on-surface-variant); margin: 8px 0 0; }
.ig-stage { flex: 1; display: grid; place-items: center; padding: 24px; min-width: 0; }
.ig--bare .ig-stage { display: block; padding: 0; }
.ig-window { position: relative; flex: none; overflow: hidden; border-radius: 8px; box-shadow: 0 24px 64px color-mix(in srgb, var(--md-sys-color-shadow, #000) 28%, transparent); }
.ig--bare .ig-window { box-shadow: none; }
</style>
