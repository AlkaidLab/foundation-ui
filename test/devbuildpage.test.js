// 开发者 › 构建与组件 rebuilt from the shared components (): two sections of MItem rows like 测试工具 and the settings pages, no table of its own.
import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { environmentRows, environmentText } from '../src/developer/envInfo.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let server, DevBuild
before(async () => {
  server = await createServer({ root, configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('md-') } } })] })
  ;({ DevBuild } = await server.ssrLoadModule('/src/vue/index.js'))
})
after(async () => { await server?.close() })

const FULL = [
  { id: 'host', name: 'Sunshine.exe', version: '2026.1110.165906', commit: 'abc1234', installed: true }, { id: 'panel', name: 'Panel', version: '2026.1110.165906', commit: 'a6f75d9', installed: true },
  { id: 'web', name: 'Web UI', version: '2026.1110.165906', commit: 'be1ce3d', installed: true }, { id: 'm3e', name: 'foundation-ui', version: '0.1.0', commit: '77d2f7a', installed: true },
  { id: 'vdd', name: 'ZakoVDD', version: '1.0.4.0', commit: '', installed: true }, { id: 'vigem', name: 'ViGEmBus', version: '', commit: '', installed: false },
  { id: 'usbip', name: 'USB/IP', version: '0.9.8.1', commit: '', installed: true }, { id: 'dlssnr', name: 'DLSS NR plugin', version: '', commit: '', installed: false },
  { id: 'stylus', name: 'Stylus plugin', version: '2026.1110.165906', commit: 'a6f75d9', installed: true }, { id: 'haptics', name: 'moonlight-audio-haptics', version: '', commit: 'c4f1b8c', installed: true },
  { id: 'installer', name: 'Installer', version: '2026.1110.165906', commit: 'be1ce3d', installed: true },
]
const INFO = { product: 'Foundation Sunshine panel', version: '2026.1110.165906', channel: 'stable', builds: [{ name: 'panel', sha: 'a6f75d9' }], host: '2026.1110.165906', os: 'Windows 11', arch: 'x86_64', gpu: 'RTX 4070', webview: '130.0', display: '1920x1080 @100%', locale: 'zh-CN', components: FULL }
const never = () => new Promise(() => {})
const count = (text, re) => (text.match(re) || []).length

test('the page is two MSection / MGroup blocks of MItem rows: one row for each environment fact and one for each component', async () => {
  globalThis.localStorage = { getItem: (k) => (k === 'foundation-ui.dev.build' ? JSON.stringify(INFO) : null), setItem() {}, removeItem() {} }
  try {
    const out = (await renderToString(createSSRApp({ render: () => h(DevBuild, { locale: 'zh', environment: never }) }))).replace(/<!--.*?-->/g, '')
    assert.equal(count(out, /class="m-section"/g), 2); assert.equal(count(out, /class="m-group"/g), 2)
    assert.match(out, /本机环境/); assert.match(out, /<h2 class="m-section__title">组件/)
    const envRows = environmentRows(INFO)
    assert.equal(envRows.length, 11); assert.equal(count(out, /data-env="/g), envRows.length, 'a row for every environment fact')
    for (const label of ['产品', '版本', '渠道', '面板构建', '主机', '系统', '架构', '显卡', 'WebView', '显示', '语言']) assert.ok(out.includes(`>${label}<`), `${label} is a row title`)
    assert.ok(out.includes('>RTX 4070<') && out.includes('>Windows 11<') && out.includes('>130.0<'), 'the values are the second line of their rows')
    assert.equal(count(out, /data-component="/g), FULL.length, 'a row for every component')
    for (const c of FULL) assert.match(out, new RegExp(`data-component="${c.id}"`))
    // an installed component: version under the name, the commit at the end as a monospace chip; a missing one says so and has no commit
    assert.equal(count(out, /class="m-chip dm-mono dm-commit"/g), FULL.filter((c) => c.installed && c.commit).length)
    assert.match(out, /abc1234/); assert.match(out, /c4f1b8c/)
    assert.equal(count(out, /dm-notinstalled/g), 2); assert.equal(count(out, />未安装</g), 2)
    assert.doesNotMatch(out, /dm-table|dm-trow|dm-kv|dm-bar/, 'no layout of its own')
    // every row is a row of the shared item, text can be selected
    assert.equal(count(out, /class="m-item[ "][^>]*data-selectable/g), FULL.length + envRows.length)
    assert.match(out, /data-dev="build-copy"/); assert.match(out, /复制环境信息/)
  } finally { delete globalThis.localStorage }
})

test('without a read the sections still stand; the copy button waits for something to copy, and the components wait for their list', async () => {
  const out = (await renderToString(createSSRApp({ render: () => h(DevBuild, { locale: 'zh', environment: never }) }))).replace(/<!--.*?-->/g, '')
  assert.equal(count(out, /class="m-section"/g), 1); assert.equal(count(out, /data-env="/g), 0); assert.equal(count(out, /data-component="/g), 0)
  assert.match(out, /<button[^>]*data-dev="build-copy"[^>]*disabled|<button[^>]*disabled[^>]*data-dev="build-copy"/)
})

// the components are compiled for the server here (ssrLoadModule), so there is no client render: the instance is taken from the server render and its copy action is called, which is what the button's click does
test('复制环境信息 copies the stable English key-value text, not the labels of the interface, and the button turns into its done state', async () => {
  const written = []; const notes = []; let vm = null
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async (text) => { written.push(text) } } }, configurable: true })
  globalThis.localStorage = { getItem: (k) => (k === 'foundation-ui.dev.build' ? JSON.stringify(INFO) : null), setItem() {}, removeItem() {} }
  try {
    const app = createSSRApp({ render: () => h(DevBuild, { locale: 'zh', environment: never, onNotify: (text) => notes.push(text) }) })
    app.mixin({ created() { if (this.$options.__file?.endsWith('DevBuild.vue')) vm = this } })
    const out = (await renderToString(app)).replace(/<!--.*?-->/g, '')
    assert.ok(vm, 'the page instance was seen'); assert.doesNotMatch(out, /data-dev="build-copy"[^>]*disabled/, 'there is something to copy')
    const page = vm.$.exposed; assert.equal(page.copied.value, false); await page.copy()
    assert.equal(written.length, 1); assert.equal(written[0], environmentText(INFO))
    assert.match(written[0], /^product: Foundation Sunshine panel\nversion: 2026\.1110\.165906\nchannel: stable\nbuild panel: a6f75d9\nhost: /); assert.match(written[0], /\ngpu: RTX 4070\n/)
    assert.doesNotMatch(written[0], /产品|版本|显卡|本机环境/)
    assert.deepEqual(notes, ['已复制']); assert.equal(page.copied.value, true, 'the button shows its done state')
  } finally { delete globalThis.localStorage; if (saved) Object.defineProperty(globalThis, 'navigator', saved); else delete globalThis.navigator }
})
