// The pages the copy sweep changed the most, with fixed data: ?scene=dev-rate|dev-auth|dev-offline|dev-signin|dev-report|components|service|network|about|diagnostics
// &theme=light|dark|black &locale=zh|en. The same file runs on the tree before and after the sweep (it imports only what both have), for the before/after shots.
import { createApp, h } from 'vue'
import '../src/css/all.css'
import { applyTheme } from '../src/tokens/theme.js'
import { MPage, MComponentStatus, MServiceStatus, MNetworkOverview, MAbout, MDiagnostics, createComponentStatus, normalizeOverview } from '../src/vue/index.js'
import DevIssues from '../src/vue/devmode/DevIssues.vue'
import DevReportHost from '../src/vue/devmode/DevReportHost.vue'
import { openDevSignIn, openDevReport } from '../src/vue/devmode/devReport.js'
import { DEV_REPOS } from '../src/devmode/repos.js'
import overviewFixture from '../test/fixtures/network-overview-home.json'

const q = new URLSearchParams(location.search)
const dark = q.get('theme') === 'dark' || q.get('theme') === 'black'
applyTheme(document.documentElement, { black: q.get('theme') === 'black' })
if (dark) document.documentElement.dataset.dark = q.get('theme')
const scene = q.get('scene') || 'dev-rate'
const locale = q.get('locale') || 'zh'
const NOW = Date.now()
const ago = (ms) => NOW - ms
localStorage.setItem('foundation-ui.dev', '1')

const rows = [
  [482, '串流结束后虚拟显示器没有恢复原来的分辨率', 6], [479, 'Linux 主机的 PIN 配对页面在 Firefox 中无法提交', 3], [473, '希望 Web UI 的客户端列表可以按最近连接时间排序', 0],
  [466, '更新通道切换为测试版后没有立即检查更新', 2], [458, '音频输出设备名称包含中文时无法保存', 1],
].map(([n, title, comments], i) => ({ key: `fs#${n}`, n, repo: 'fs', kind: 'issue', title, state: 'open', labels: i === 0 ? ['bug'] : [], who: ['Yundi339', 'skyhua0224', 'qiin2333'][i % 3], at: new Date(ago((i + 1) * 5400e3)).toISOString(), created: new Date(ago((i + 3) * 86400e3)).toISOString(), comments, body: '串流结束后，显示器停在 1280x720，需要手动在 Windows 显示设置中改回。\n\n复现步骤：\n1. 连接客户端并串流\n2. 断开串流\n3. 查看显示设置', bodyCut: false, url: `https://github.com/AlkaidLab/foundation-sunshine/issues/${n}`, branch: '' }))
const answers = {
  rate: { state: 'rate', items: rows, at: ago(23 * 60e3), stale: true, resetAt: NOW + 23 * 60e3, resetKnown: true },
  auth: { state: 'auth', items: rows, at: ago(9 * 60e3), stale: true },
  offline: { state: 'offline', items: rows, at: ago(12 * 60e3), stale: true },
}
const which = scene.replace('dev-', '')
const answer = answers[which] || answers.rate
const client = { list: async () => answer, comments: async () => ({ ...answer, items: [] }), rate: () => ({}), forget() {} }

const status = createComponentStatus({
  locale,
  now: () => ago(4 * 60e3),
  sources: {
    vdd: async () => ({ installed: true, running: true, control_available: true, state: 'ready', version: '1.4.2' }),
    usb: async () => ({ supported: true, installed: true, ready: true, version_supported: true, signature: 'signed' }),
  },
})
const running = {
  verdict: 'running', failingLayer: null, liveStreams: 0,
  scm: { installed: true, belongsToInstall: true, state: 'running', startType: 'auto', binaryPath: '"C:\\Program Files\\Sunshine\\tools\\sunshinesvc.exe"', account: 'LocalSystem', lastExit: null, servicePid: 100, recovery: { actions: [{ kind: 'restart', delayMs: 5000 }, { kind: 'none', delayMs: 0 }], resetPeriodS: 86400, restartsOnFailure: true } },
  process: { running: true, pid: 4321, startedAtMs: ago(5 * 3600e3), childOfService: true },
  api: { answers: true, httpStatus: 401, latencyMs: 12 },
}
const report = normalizeOverview({ ...overviewFixture, checked_at: new Date(ago(3 * 60e3)).toISOString() })
const LOG = `[2026-11-11 09:50:54.272] [WARN] [renderer] fetch /panel_activity 3621 ms\n[2026-11-11 09:51:43.043] [INFO] [display] 虚拟显示器已创建\n[2026-11-11 09:52:50.892] [ERROR] [stall] 主线程繁忙 2446 ms`

const page = (title, child, props = {}) => h('div', { class: 'm-app m-app--scroll', style: 'min-height:100vh' }, [h(MPage, { title, locale, ...props }, { default: () => child })])
const scenes = {
  'dev-rate': () => page('Issue 与 PR', h(DevIssues, { locale, client })),
  'dev-auth': () => page('Issue 与 PR', h(DevIssues, { locale, client })),
  'dev-offline': () => page('Issue 与 PR', h(DevIssues, { locale, client })),
  'dev-signin': () => page('Issue 与 PR', h(DevIssues, { locale, client })),
  'dev-report': () => page('Issue 与 PR', h(DevIssues, { locale, client })),
  components: () => page('', h(MComponentStatus, { status })),
  service: () => h('div', { class: 'm-app m-app--scroll' }, [h(MServiceStatus, { status: running, locale, readAt: ago(2 * 60e3) })]),
  network: () => page(locale === 'zh' ? '网络概览' : 'Network overview', h(MNetworkOverview, { report, status: 'ready', locale })),
  about: () => h('div', { class: 'm-app m-app--scroll' }, [h(MAbout, { version: '2026.1111.100000', channel: 'stable', locale, update: { state: 'latest', version: '', checkedAt: ago(3 * 60e3) } })]),
  diagnostics: () => h('div', { class: 'm-app m-app--scroll' }, [h(MDiagnostics, { text: LOG, locale, collect: async () => ({}), save: async () => {} })]),
}
const app = createApp({ render: () => h('div', [(scenes[scene] || scenes['dev-rate'])(), h(DevReportHost, { locale })]) })
app.mount('#app')
status.checkAll()
if (scene === 'dev-signin') setTimeout(() => openDevSignIn(), 400)
if (scene === 'dev-report') setTimeout(() => openDevReport({ kind: 'feedback', repo: 'fs' }), 400)
