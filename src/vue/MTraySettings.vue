<script setup>
import { computed } from 'vue'
import MTrayThumb from './MTrayThumb.vue'
import MTrayLayoutEditor from './MTrayLayoutEditor.vue'
import { TRAY_DENSITIES, normalizePrefs, singleClickWaits } from '../tray/trayPrefs.js'

// 个性化 > the tray icon: which of the three menus the right click opens, what a click and a double click do (the Panel's main window, one of the menus, or nothing), and a switch back to the
// system's own menu. v-model is the record of src/tray/trayPrefs.js; the host saves it (src-tauri/src/tray_prefs.rs) and reads it when the icon is clicked.
const props = defineProps({ modelValue: { type: Object, default: () => ({}) }, locale: { type: String, default: 'zh' }, rtss: { type: Boolean, default: false } })
// `layout` carries the tiles and sliders of the quick panel ({ tiles, sliders }, null = the default): the host keeps them apart from the rest of the record, so a stale page never overwrites an edit made in the menu
const emit = defineEmits(['update:modelValue', 'layout'])

const T = {
  zh: {
    right: '右键点托盘图标', rightHint: '右键点一下就弹出这个菜单。',
    click: '单击托盘图标', clickHint: '默认打开主窗口(和以前一样)。', double: '双击托盘图标', doubleHint: '默认没有动作。',
    wait: '设了双击动作后,单击会等一个双击间隔(约半秒)再执行,这样双击不会先触发单击。',
    names: { v1: '紧凑列表', v2: '状态卡 + 列表', v3: '快捷面板', panel: '打开主窗口', none: '没有动作' },
    descs: { v1: '常用项在上,其余收进「工具 / 设置 / 帮助」', v2: '顶部是主机、串流、显示器、更新的状态卡', v3: '砖和滑块自己选、自己排,左右翻页', panel: '显示面板的主窗口', none: '' },
    layout: '快捷面板', tilesHint: '砖选哪些、怎么排;只有快捷面板有砖。',
    sliders: '滑块', slidersHint: '三个菜单都有这几个滑块,按这个顺序;拖动时数值跟着走,松手生效。',
    density: '托盘密度', densityHint: '触控密度的行、砖、滑块更大,按下时有涟漪,可以滑动关闭、从左边缘滑动返回、长按砖进入编辑。',
    densities: { auto: '自动', standard: '标准', touch: '触控' }, densityDescs: { auto: '手指或笔点开、或平板姿态时用触控', standard: '鼠标和键盘的大小', touch: '始终用触控大小' },
    native: '始终使用系统原生菜单', nativeHint: '托盘的菜单窗口出问题时可以打开它;原生菜单的条目和这三个菜单完全一致。',
  },
  en: {
    right: 'Right-click the tray icon', rightHint: 'A right click opens this menu.',
    click: 'Click the tray icon', clickHint: 'Opens the main window by default (as before).', double: 'Double-click the tray icon', doubleHint: 'Does nothing by default.',
    wait: 'With a double-click action set, a single click waits for one double-click interval (about half a second) before it runs, so a double click does not trigger the single click first.',
    names: { v1: 'Compact list', v2: 'Status card + list', v3: 'Quick panel', panel: 'Open main window', none: 'Do nothing' },
    descs: { v1: 'The common items first, the rest under Tools / Settings / Help', v2: 'A status card with the host, streams, display and update on top', v3: 'Tiles and sliders you pick and order, pages side to side', panel: 'Shows the Panel window', none: '' },
    layout: 'Quick panel', tilesHint: 'Which tiles, in which order. Only the quick panel has tiles.',
    sliders: 'Sliders', slidersHint: 'All three menus show these sliders in this order; the value follows your finger and applies when you let go.',
    density: 'Tray density', densityHint: 'Touch density makes rows, tiles and sliders larger, ripples under the finger, swipe down to close, swipe in from the left edge to go back, and press and hold a tile to edit.',
    densities: { auto: 'Auto', standard: 'Standard', touch: 'Touch' }, densityDescs: { auto: 'Touch when a finger or a pen opens it, or in slate posture', standard: 'The size for a mouse and keyboard', touch: 'Always the touch size' },
    native: 'Always use the system menu', nativeHint: 'Turn this on if the tray menu window misbehaves; the native menu has exactly the same items as the three menus.',
  },
  ja: {
    right: 'トレイアイコンを右クリック', rightHint: '右クリックでこのメニューを開きます。',
    click: 'トレイアイコンをクリック', clickHint: '既定ではメインウィンドウを開きます(従来どおり)。', double: 'トレイアイコンをダブルクリック', doubleHint: '既定では何もしません。',
    wait: 'ダブルクリックの動作を設定すると、シングルクリックはダブルクリックの間隔(約 0.5 秒)待ってから実行されます。',
    names: { v1: 'コンパクトリスト', v2: 'ステータスカード + リスト', v3: 'クイックパネル', panel: 'メインウィンドウを開く', none: '何もしない' },
    descs: { v1: 'よく使う項目を上に、残りはツール/設定/ヘルプへ', v2: 'ホスト・ストリーム・ディスプレイ・更新のステータスカード', v3: 'タイルとスライダーを自分で選んで並べ替え、横にページ送り', panel: 'パネルのウィンドウを表示', none: '' },
    layout: 'クイックパネル', tilesHint: 'タイルの選択と並び順。タイルがあるのはクイックパネルだけです。',
    sliders: 'スライダー', slidersHint: '3つのメニューすべてに、この順番でスライダーを表示します。ドラッグ中は値が追従し、離すと適用されます。',
    density: 'トレイの密度', densityHint: 'タッチ密度は行・タイル・スライダーが大きくなり、指の下にリップル、下にスワイプで閉じる、左端からスワイプで戻る、タイルの長押しで編集になります。',
    densities: { auto: '自動', standard: '標準', touch: 'タッチ' }, densityDescs: { auto: '指やペンで開いたとき、またはスレート姿勢のときタッチ', standard: 'マウスとキーボード向けの大きさ', touch: '常にタッチの大きさ' },
    native: '常にシステムのメニューを使う', nativeHint: 'トレイのメニューウィンドウに問題がある場合にオンにします。項目は 3 つのメニューと同じです。',
  },
}
const t = computed(() => T[props.locale] || T.en)
const prefs = computed(() => normalizePrefs(props.modelValue))
const set = (key, value) => emit('update:modelValue', { ...prefs.value, [key]: value })
const waits = computed(() => singleClickWaits(prefs.value))
// what the editor needs of a state: the language, whether RTSS is there, and a connected host (every tile is offered, none greyed)
const editorState = computed(() => ({ locale: props.locale, connection: 'connected', rtss: props.rtss, vdd: { active: false, cooldown: false }, toggles: {}, update: null }))
const MENUS = ['v1', 'v2', 'v3']
const CLICKS = ['panel', 'v1', 'v2', 'v3', 'none']
</script>

<template>
  <div class="m-trayset">
    <section class="m-trayset__group" role="radiogroup" :aria-label="t.right">
      <div><div class="m-trayset__title">{{ t.right }}</div></div>
      <div class="m-trayset__choices">
        <button v-for="k in MENUS" :key="k" class="m-trayset__choice" :class="{ 'is-on': prefs.right === k }" type="button" role="radio" :aria-checked="prefs.right === k" @click="set('right', k)">
          <span class="m-trayset__thumb"><MTrayThumb :kind="k" /></span><span>{{ t.names[k] }}<small>{{ t.descs[k] }}</small></span>
        </button>
      </div>
    </section>
    <section class="m-trayset__group" role="radiogroup" :aria-label="t.click">
      <div><div class="m-trayset__title">{{ t.click }}</div><div class="m-trayset__hint">{{ t.clickHint }}</div></div>
      <div class="m-trayset__choices">
        <button v-for="k in CLICKS" :key="k" class="m-trayset__choice" :class="{ 'is-on': prefs.click === k }" type="button" role="radio" :aria-checked="prefs.click === k" @click="set('click', k)">
          <span class="m-trayset__thumb"><MTrayThumb :kind="k" /></span><span>{{ t.names[k] }}</span>
        </button>
      </div>
    </section>
    <section class="m-trayset__group" role="radiogroup" :aria-label="t.double">
      <div><div class="m-trayset__title">{{ t.double }}</div><div class="m-trayset__hint">{{ t.doubleHint }}<template v-if="waits"> {{ t.wait }}</template></div></div>
      <div class="m-trayset__choices">
        <button v-for="k in ['none', 'panel', 'v1', 'v2', 'v3']" :key="k" class="m-trayset__choice" :class="{ 'is-on': prefs.double === k }" type="button" role="radio" :aria-checked="prefs.double === k" @click="set('double', k)">
          <span class="m-trayset__thumb"><MTrayThumb :kind="k" /></span><span>{{ t.names[k] }}</span>
        </button>
      </div>
    </section>
    <section class="m-trayset__group" role="radiogroup" :aria-label="t.density" data-group="density">
      <div><div class="m-trayset__title">{{ t.density }}</div><div class="m-trayset__hint">{{ t.densityHint }}</div></div>
      <div class="m-trayset__choices m-trayset__choices--plain">
        <button v-for="k in TRAY_DENSITIES" :key="k" class="m-trayset__choice is-plain" :class="{ 'is-on': prefs.density === k }" type="button" role="radio" :aria-checked="prefs.density === k" @click="set('density', k)">
          <span>{{ t.densities[k] }}<small>{{ t.densityDescs[k] }}</small></span>
        </button>
      </div>
    </section>
    <section class="m-trayset__group" data-group="sliders">
      <div><div class="m-trayset__title">{{ t.sliders }}</div><div class="m-trayset__hint">{{ t.slidersHint }}</div></div>
      <MTrayLayoutEditor only="sliders" :layout="prefs" :state="editorState" @update:layout="emit('layout', $event)" />
    </section>
    <section class="m-trayset__group" data-group="tiles">
      <div><div class="m-trayset__title">{{ t.layout }}</div><div class="m-trayset__hint">{{ t.tilesHint }}</div></div>
      <MTrayLayoutEditor only="tiles" :layout="prefs" :state="editorState" @update:layout="emit('layout', $event)" />
    </section>
    <button class="m-trayset__switch" type="button" role="switch" :aria-checked="prefs.forceNative" @click="set('forceNative', !prefs.forceNative)">
      <span><span class="m-trayset__title">{{ t.native }}</span><span class="m-trayset__hint" style="display:block">{{ t.nativeHint }}</span></span>
      <span class="m-tray__switch" :class="{ 'is-on': prefs.forceNative }" aria-hidden="true"><i /></span>
    </button>
  </div>
</template>
