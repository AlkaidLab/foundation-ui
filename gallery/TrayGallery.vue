<script setup>
import { computed, ref } from 'vue'
import { MIcon, MTrayMenu, MTraySettings, MSection } from '../src/vue/index.js'
import { appIcon } from '../src/about/appicon.js'
import { ITEMS, VARIANTS, stateOf } from '../src/tray/trayModel.js'

// The three designs of the tray menu over a Windows 11 taskbar corner (drawn here: a wallpaper, a taskbar, the tray). The menu is the real component, so a page can be opened by clicking.
const q = new URLSearchParams(location.search)
const only = q.get('v')
const still = q.get('still') === '1'
const bare = q.get('bare') === '1'
const focus = q.get('focus') === '1' // ?focus=1: the real window's behaviour: a page change focuses the new page's first button
const stateName = q.get('state') || 'busy'
const locale = q.get('locale') || 'zh'
const settings = q.get('settings') === '1'
const prefs = ref({ right: q.get('right') || 'v3', click: q.get('click') || 'panel', double: q.get('double') || 'v2', forceNative: false, tiles: q.get('tiles') ? q.get('tiles').split(',') : null, sliders: q.get('sliders') ? q.get('sliders').split(',') : null })
// ?tiles=a,b,c &sliders=dpi,refresh : a stored layout (ids in order); ?edit=1 opens the quick page in edit mode
const edit = q.get('edit') === '1'
const layout = ref(prefs.value.tiles || prefs.value.sliders ? { tiles: prefs.value.tiles, sliders: prefs.value.sliders } : null)
const onLayout = (record) => { layout.value = record; prefs.value = { ...prefs.value, ...record } }
// ?flip=idle (or busy, vdd, down): after 1.5 s the host's state changes under the open menu (a stream ends: the scale and the display line go away); the menu moves its rows to the new places
const flipTo = q.get('flip') || ''
const swapped = ref('')
if (flipTo) setTimeout(() => { swapped.value = flipTo }, 1500)
// ?density=touch|standard|auto is the person's choice; ?input=touch|pen|mouse|unknown (and ?slate=1) is what the host knew about the press that opened the menu
const density = q.get('density') || ''
const maxh = Number(q.get('maxh')) || 0 // ?maxh=700: the window can be 700 px high at most (a page taller than that scrolls)
const touchFacts = { source: q.get('input') || 'unknown', slate: q.get('slate') === '1', capable: q.get('capable') === '1' }
// ?dev=0 / ?rtss=0: a host without the developer pages / without RTSS (the mock has both)
const hostFacts = { ...(q.get('dev') === '0' ? { dev: false } : {}), ...(q.get('rtss') === '0' ? { rtss: false } : {}) }
const stateFor = (name) => ({ ...stateOf(swapped.value || name), ...hostFacts, locale, density: density || undefined, touch: touchFacts })
// The sliders in the gallery: a release takes 700 ms, then the mock state follows it (?fail=refresh makes that slider fail once with the host's kind of words)
const fail = q.get('fail') || ''
const live = ref({})
const withSliders = (name) => {
  const base = stateFor(name)
  return { ...base, layout: layout.value, sliders: { ...base.sliders, ...live.value } }
}
async function apply(key, value) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  if (fail === key) throw new Error('显示器不接受 2560×1440@144(ChangeDisplaySettings: DISP_CHANGE_BADMODE)')
  const cur = (live.value[key] || stateFor(stateName).sliders?.[key]) ?? {}
  live.value = { ...live.value, [key]: key === 'bitrate' ? { kbps: value } : { ...cur, value } }
}
const sheet = only
  ? [{ v: `v${only}`, page: q.get('page') || '', state: stateName }]
  : ['v1', 'v2', 'v3'].flatMap((v) => [{ v, page: '', state: 'busy' }, { v, page: 'display', state: 'busy' }, { v, page: '', state: 'idle' }])
const titles = { v1: 'V1 · UU 式紧凑列表', v2: 'V2 · 状态卡 + 列表', v3: 'V3 · 快捷面板 (右键候选)' }
const last = ref('')
const menuKey = ref(0) // a swipe that closes the menu: the gallery opens it again
const tray = appIcon(16, 1)
const dark = document.documentElement.classList.contains('dark')
</script>

<template>
  <main v-if="settings" class="tg-settings"><MSection title="托盘图标"><MTraySettings v-model="prefs" :locale="locale" rtss @layout="onLayout" /></MSection></main>
  <main v-else class="tg" :class="{ 'is-bare': bare, 'is-sheet': !only }">
    <h1 v-if="!only">托盘菜单设计 · 三个方案 <small>左键保持打开主窗口;下面都是右键菜单。点行可以进入第二页。</small></h1>
    <section v-for="(s, i) in sheet" :key="i" class="tg-item">
      <h2 v-if="!only">{{ titles[s.v] }} <small>{{ s.page === 'display' ? '显示器页' : s.state === 'idle' ? '空闲 · 没有更新' : '主页 · 串流中 · 有更新' }}</small></h2>
      <div class="tg-stage" :class="{ 'is-bare': bare }" data-stage>
        <template v-if="!bare">
          <div class="tg-wall" />
          <div class="tg-bar">
            <div class="tg-bar-l"><i class="tg-win"><b /><b /><b /><b /></i><i class="tg-app a" /><i class="tg-app b" /><i class="tg-app c" /></div>
            <div class="tg-bar-r">
              <MIcon name="keyboard_arrow_up" class="tg-t" />
              <span class="tg-icons">
                <span class="tg-hot"><img :src="tray.src" width="16" height="16" alt="" /></span>
                <MIcon name="wifi" class="tg-t" /><MIcon name="volume_up" class="tg-t" /><MIcon name="bolt" class="tg-t" />
              </span>
              <span class="tg-ime">中</span>
              <span class="tg-clock">14:23<br />2026/11/9</span>
              <MIcon name="notifications" class="tg-t" />
            </div>
          </div>
        </template>
        <div class="tg-menu"><MTrayMenu :key="menuKey" :model="VARIANTS[s.v]" :state="withSliders(s.state)" :page="s.page" :max-height="maxh" :motion="!still" :focus="focus" :edit="edit" :apply="apply" @layout="onLayout" @close="menuKey++" @act="(id) => (last = ITEMS[id].label)" /></div>
      </div>
    </section>
    <p v-if="last" class="tg-last">点击了: {{ last }}(演示,不执行)</p>
  </main>
</template>

<style>
.tg-settings { box-sizing: border-box; width: 760px; padding: 24px; background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); font-family: var(--md-ref-typeface-brand); }
html { background: var(--m-page-solid, var(--md-sys-color-surface)); }
.tg { padding: 20px 24px 40px; font-family: var(--md-ref-typeface-brand); color: var(--md-sys-color-on-surface); display: flex; flex-wrap: wrap; gap: 20px 24px; align-items: flex-start; }
.tg:not(.is-sheet) { padding: 0; display: block; }
.tg h1 { width: 100%; margin: 0; font: 600 20px/28px var(--md-ref-typeface-brand); } .tg h1 small, .tg h2 small { font: 400 12px/16px var(--md-ref-typeface-brand); color: var(--md-sys-color-on-surface-variant); margin-inline-start: 8px; }
.tg h2 { margin: 0 0 8px; font: 600 14px/20px var(--md-ref-typeface-brand); }
.tg-item { margin: 0; }

.tg-stage { position: relative; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; box-sizing: border-box; width: 520px; padding: 28px 12px 48px; overflow: hidden; border-radius: 12px; }
.tg:not(.is-sheet) .tg-stage { width: 560px; border-radius: 0; }
.tg-stage.is-bare { width: auto; min-height: 0; padding: 24px; background: var(--md-sys-color-surface); }
.tg-wall { position: absolute; inset: 0; background:
  radial-gradient(120% 90% at 78% 12%, #6fb7ff 0, transparent 55%), radial-gradient(90% 80% at 15% 70%, #3a5bd9 0, transparent 60%), radial-gradient(70% 60% at 90% 85%, #b06cff 0, transparent 60%), linear-gradient(160deg, #0f2a6b, #1c4fb8 55%, #5d8dff); }
html.dark .tg-wall { background:
  radial-gradient(120% 90% at 78% 12%, #1c3a78 0, transparent 55%), radial-gradient(90% 80% at 15% 70%, #0d1f4d 0, transparent 60%), radial-gradient(70% 60% at 90% 85%, #3a2470 0, transparent 60%), linear-gradient(160deg, #070f26, #0c2252 55%, #17306b); }
.tg-menu { position: relative; z-index: 2; margin: 0 0 8px; }
.tg-bar { position: absolute; z-index: 1; left: 0; right: 0; bottom: 0; height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 12px; backdrop-filter: blur(24px); background: rgba(243, 243, 243, 0.86); color: #1b1b1b; border-top: 1px solid rgba(0, 0, 0, 0.06); }
html.dark .tg-bar { background: rgba(32, 32, 32, 0.86); color: #f3f3f3; border-top-color: rgba(255, 255, 255, 0.06); }
.tg-bar-l, .tg-bar-r, .tg-icons { display: flex; align-items: center; gap: 4px; }
.tg-bar-r { gap: 2px; }
.tg-win { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; width: 20px; height: 20px; margin: 0 14px; } .tg-win b { background: #0a78d4; border-radius: 1px; }
.tg-app { width: 24px; height: 24px; margin: 0 10px; border-radius: 6px; } .tg-app.a { background: #f2b01e; } .tg-app.b { background: #35a56b; } .tg-app.c { background: #d6486a; }
.tg-t { width: 16px; height: 16px; fill: currentColor; }
.tg-bar-r .m-icon { padding: 0 6px; box-sizing: content-box; }
.tg-icons { padding: 0 2px; border-radius: 6px; }
.tg-hot { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 32px; border-radius: 6px; background: rgba(0, 0, 0, 0.07); }
html.dark .tg-hot { background: rgba(255, 255, 255, 0.1); }
.tg-ime { font: 500 12px/16px var(--md-ref-typeface-brand); padding: 0 8px; }
.tg-clock { font: 400 12px/16px var(--md-ref-typeface-brand); text-align: right; padding: 0 8px; font-variant-numeric: tabular-nums; }
.tg-last { width: 100%; margin: 0; font: 400 12px/16px var(--md-ref-typeface-brand); color: var(--md-sys-color-on-surface-variant); }
</style>
