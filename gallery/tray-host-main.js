import { createApp, h } from 'vue'
import '../src/css/all.css'
import '../src/vue/index.js'
import { MTrayPopup } from '../src/vue/index.js'
import { applyTheme } from '../src/tokens/theme.js'
import { stateOf } from '../src/tray/trayModel.js'

// The tray menu as the Panel's menu window runs it (src-tauri/src/ctx_popup.rs), with the native side replaced by a recorder: `ready(token, size)` is what asks the host to resize its window, so
// `window.__ready` is the list of native window resizes a page switch costs (the per-frame gate counts them; a clean switch asks for one or two, never one per frame).
//   ?v=1|2|3 &state=busy|idle|vdd &density=touch|standard|auto &input=touch|mouse|unknown &theme=light|dark|black &maxh=<css px>
//   window.__open() opens the menu (as the tray icon's event does); window.__ready: [{ t, w, h }]
const q = new URLSearchParams(location.search)
applyTheme(document.documentElement, { black: q.get('theme') === 'black' })
const ready = (window.__ready = [])
let openCb
const transport = {
  onOpen: (cb) => { openCb = cb; return () => {} },
  onClose: () => () => {},
  onState: () => () => {},
  ready: (token, size) => { ready.push({ t: +performance.now().toFixed(1), w: size.w, h: size.h }); return Promise.resolve() },
  act: () => {}, set: () => Promise.resolve(null), layout: () => {}, cancel: () => {}, loaded: () => {},
}
createApp({ render: () => h(MTrayPopup, { transport }) }).mount('#app')
window.__open = () => openCb({
  token: 1, variant: `v${q.get('v') || '3'}`, edge: 'bottom', maxHeight: Number(q.get('maxh')) || 0, theme: null,
  state: { ...stateOf(q.get('state') || 'busy'), locale: q.get('locale') || 'zh', density: q.get('density') || undefined, touch: { source: q.get('input') || 'unknown', slate: false, capable: false } },
})
setTimeout(() => window.__open(), 0)
