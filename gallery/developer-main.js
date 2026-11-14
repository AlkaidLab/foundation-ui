// The 开发者选项 page with a mock product: what a person sees in the panel, with the tools the panel gives and a host that answers from fixtures.
import { createApp, h } from 'vue'
import '../src/css/all.css'
import { MPage, MDeveloperPage } from '../src/vue/index.js'
import { applyTheme } from '../src/tokens/theme.js'
import { startDeveloperOverlays } from '../src/developer/index.js'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'black') { applyTheme(document.documentElement, { black: true }); document.documentElement.dataset.dark = 'black' }
localStorage.setItem('foundation-ui.dev', '1')

const fixtures = {
  '/api/config': { sunshine_name: 'SKYWARD', port: 47989, origin_web_ui_allowed: 'lan', username: 'sky', password: 'hunter2', encoder: 'nvenc', adapter_name: 'NVIDIA GeForce RTX 4080', named_certs: [{ name: 'Pixel', cert: '-----BEGIN CERTIFICATE-----' }] },
  '/api/apps': { apps: [{ name: 'Desktop', 'image-path': 'desktop.png' }, { name: 'Steam Big Picture' }] },
  '/api/clients/list': { named_certs: [{ name: 'Pixel 8', uuid: '8f3c' }, { name: 'MacBook', uuid: 'a21d' }] },
  '/api/network/reachability': { lan: { ok: true, ms: 3 }, wan: { ok: false, reason: 'upnp' } },
}
const realFetch = window.fetch.bind(window)
window.fetch = async (url, init) => {
  const u = new URL(String(url), location.href)
  if (u.host === 'mock.host' && fixtures[u.pathname]) { await new Promise((r) => setTimeout(r, 38)); const text = JSON.stringify(fixtures[u.pathname]); return new Response(text, { status: 200, headers: { 'content-type': 'application/json' } }) }
  if (u.host === 'mock.host') return new Response('{"error":"not found"}', { status: 404 })
  return realFetch(url, init)
}
const LOG = `[2026-11-04 09:50:54.272] [WARN] [src\\logger.rs:270] [renderer] fetch /panel_activity 3621 ms
[2026-11-04 09:51:39.462] [WARN] [src\\logger.rs:270] [renderer] timer late 2356 ms pending: /frontend_slow 1028ms
[2026-11-04 09:51:42.001] [WARN] [src\\logger.rs:270] [renderer] frame long-animation-frame 1534 ms blocking 1483 ms user-callback:TimerHandler:setInterval
[2026-11-04 09:51:43.043] [WARN] [src\\logger.rs:270] [renderer] invoke get_vdd_status 1034 ms
[2026-11-04 09:52:50.892] [WARN] [src\\stall_watch.rs:41] [stall] watcher woke 0 ms late, main thread answered in 2446 ms: the UI thread was busy
[2026-11-04 09:53:02.590] [INFO] [src\\windows\\lifecycle\\display.rs:471] [dpi-cover] page settled 243 ms after the change, fading
[2026-11-04 09:53:12.187] [INFO] [src\\windows\\lifecycle\\display.rs:548] [warm] capture took 867 ms`
let debug = true; let level = 'info'; let channel = 'stable'
const win = { cover: 'fast', coldCloak: false, dpi: 200, simulated: 0 }
const tools = {
  environment: async () => ({ product: 'Foundation Sunshine panel', version: '2026.1104.021500', channel: 'stable', builds: [{ name: 'panel', sha: 'cb0bce0' }, { name: 'm3e', sha: '13c4943' }, { name: 'web', sha: '7ebe9795' }], host: 'Sunshine 2026.1103.224731', os: 'Windows 11 26300', arch: 'x86_64', gpu: 'NVIDIA GeForce RTX 4080', webview: '156.0.4314.58', display: '3840x2160 @200%', locale: 'zh-CN' }),
  debugOutput: { get: async () => debug, set: async (v) => { debug = v } },
  logLevel: { get: async () => level, set: async (v) => { level = v } },
  logText: async () => LOG,
  window: { get: async () => ({ ...win }), setCover: async (v) => { win.cover = v }, setCloak: async (v) => { win.coldCloak = v }, simulateDpi: async (p) => { win.simulated = p } },
  webview: { devtools: () => {}, reload: () => {}, clearCache: async () => {} },
  data: { paletteCount: async () => 2, clearPalette: async () => {}, resetOnboarding: async () => {}, resetOverview: async () => {}, resetAll: async () => {} },
  host: { reach: async () => ({ ok: true, state: 'ok', lan: { ok: true, ms: 3 }, wan: { ok: false, reason: 'upnp' } }), simulate: async () => {} },
  telemetry: { state: async () => ({ consent: true, installId: '3f9a-71c2', queue: 0 }), preview: async () => ({ kind: 'error', code: 'host-stop', version: '2026.1104.021500', os: 'Windows 11', breadcrumbs: ['«scrubbed»'] }), test: async () => {} },
  update: { channel: { get: async () => channel, set: async (v) => { channel = v } }, check: async () => ({ latest: true, version: '2026.1104.021500' }) },
  exportText: () => {},
}
const overlays = startDeveloperOverlays()
if (q.get('hud')) overlays.set({ hud: true, longTasks: true, mutations: true })
if (q.get('flags')) overlays.set(Object.fromEntries(q.get('flags').split(',').map((k) => [k, true])))
const sheet = q.get('sheet')
createApp({ render: () => h('div', { class: 'm-app m-app--scroll' }, [h(MPage, { title: '开发者选项', eyebrow: '系统', back: true, backLabel: '返回' }, { default: () => h(MDeveloperPage, { locale: 'zh', tools, apiBase: 'http://mock.host', ref: 'page' }) })]) }).mount('#app')
