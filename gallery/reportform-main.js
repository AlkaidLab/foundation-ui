// The report sheet of developer mode (DevReport) opened on its own: ?kind=feedback|error, &locale=en, &theme=dark. The reader of the result is issueform.html?case=feedback.
import { createApp, h } from 'vue'
import '../src/css/all.css'
import { applyTheme } from '../src/tokens/theme.js'
import { DevReportHost, registerDevReport, openDevReport } from '../src/vue/index.js'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'black') { applyTheme(document.documentElement, { black: true }); document.documentElement.dataset.dark = 'black' }
localStorage.setItem('foundation-ui.dev', '1')
const locale = q.get('locale') || 'zh'
const ENV = 'product: Foundation Sunshine panel\nversion: 2026.1104.021500\nchannel: stable\nhost: Sunshine 2026.1103.224731\nos: Windows 11 26300\ngpu: NVIDIA GeForce RTX 4080\nlocale: zh-CN'
registerDevReport({ capture: async () => null, logs: () => '[2026-11-10 17:26:00.100] Info: stream session 10 started\n[2026-11-10 17:26:07.101] Warning: encode 12.4 ms', env: () => ENV, hostNames: () => [], save: () => {}, openUrl: () => {} })
createApp({ render: () => h('div', { class: 'm-app m-root', style: 'min-height:100vh' }, [h(DevReportHost, { locale })]) }).mount('#app')
openDevReport(q.get('kind') === 'error' ? { kind: 'error', error: { name: 'TypeError', message: "Cannot read properties of undefined (reading 'width')", page: 'home', code: 'host-stop', fingerprint: 'e3b0c44298fc' } } : { kind: 'feedback', repo: 'fs' })
