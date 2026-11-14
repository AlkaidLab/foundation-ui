// The reader of one issue with fixture issues (real bodies of AlkaidLab/foundation-sunshine and one made by our own feedback flow): ?case=bug-zh | feature-en | feature-zh | feedback | feedback-en | plain | edited | checks | audio, &theme=dark, &w=<px>
import { createApp, h } from 'vue'
import '../src/css/all.css'
import { applyTheme } from '../src/tokens/theme.js'
import DevIssueReader from '../src/vue/devmode/DevIssueReader.vue'
import { composeReport } from '../src/devmode/feedback.js'
import { parseTemplate } from '../src/devmode/issueForm.js'
import real from '../test/fixtures/issue-forms/real-issues.json'
import b1220 from '../test/fixtures/issue-forms/1220.md?raw'
import b1232 from '../test/fixtures/issue-forms/1232.md?raw'
import b1228 from '../test/fixtures/issue-forms/1228.md?raw'
import b1203 from '../test/fixtures/issue-forms/1203.md?raw'
import b1202 from '../test/fixtures/issue-forms/1202.md?raw'
import b1212 from '../test/fixtures/issue-forms/1212.md?raw'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'black') { applyTheme(document.documentElement, { black: true }); document.documentElement.dataset.dark = 'black' }
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))
const ENV = 'product: Foundation Sunshine panel\nversion: 2026.1104.021500\nchannel: stable\nhost: Sunshine 2026.1103.224731\nos: Windows 11 26300\ngpu: NVIDIA GeForce RTX 4080\nlocale: zh-CN'
const LOG = Array.from({ length: 41 }, (_, i) => `[2026-11-10 17:${String(26 + (i >> 3)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}.${100 + i}]: ${i % 9 === 4 ? 'Warning' : 'Info'}: stream session ${10 + (i >> 4)} frame ${i * 120} encode ${(8 + (i % 5) * 0.3).toFixed(1)} ms`).join('\n')
const feedbackBody = (locale, form) => composeReport({
  kind: 'error', repo: 'fs', title: 't', form, locale, category: form === 'feature' ? 'panel' : 'video', description: locale === 'zh' ? '串流开始后画面一直黑屏，声音正常。把 HDR 关掉以后恢复。' : 'The picture stays black after the stream starts, the sound is fine. It recovers when HDR is turned off.',
  steps: locale === 'zh' ? '1. 打开 HDR\n2. 从客户端连接\n3. 画面黑屏' : '1. Turn HDR on\n2. Connect from the client\n3. The picture is black', error: { name: 'TypeError', message: "Cannot read properties of undefined (reading 'width')", code: 'host-stop', fingerprint: 'e3b0c44298fc1c14', page: 'home', stack: 'at draw (home.js:41:12)\nat render (home.js:88:5)' },
  env: ENV, logs: LOG, screenshot: png, machine: { encoder: 'nvenc', clientDevice: 'iPhone 15 · Moonlight 9.0.2' }, contact: 'sky@example.org',
}).body.replace(/- screenshot\.png \(([^)]*)\)/, '- ![screenshot.png](https://github.com/user-attachments/assets/aaaa-1111) ($1)').replace(/- logs\.txt \(([^)]*)\)/, '- [logs.txt](https://github.com/user-attachments/files/1/logs.txt) ($1)')
const checksTemplate = parseTemplate('review.yml', 'name: Review\ntitle: "[Review]: "\nlabels: ["enhancement"]\nbody:\n  - type: checkboxes\n    id: terms\n    attributes:\n      label: "✅ Before you submit"\n      options:\n        - label: "I searched the existing issues"\n          required: true\n        - label: "This is about the server, not the client"\n        - label: "I use Windows 10 or 11"\n  - type: textarea\n    id: what\n    attributes:\n      label: "📝 What"\n  - type: input\n    id: ver\n    attributes:\n      label: "☀️ Version"\n  - type: dropdown\n    id: kind\n    attributes:\n      label: "🏷️ Kind"\n      options: ["A", "B"]\n')
const COMMENTS = [{ id: '1', who: 'qiin2333', at: '2026-11-10T11:00:00Z', body: '收到，这个会在下个版本处理。\n\n```\nlog line\n```', url: '', role: 'owner' }]
const CASES = {
  'bug-zh': { n: 1220, title: '[Bug]: 双显卡笔记本合盖串流后断开，无头主机检测跳过销毁 VDD，开盖后内屏不亮', body: b1220, labels: ['bug'], comments: COMMENTS },
  'feature-en': { n: 1232, title: '[Feature]: input control only mode like in moonlight v+', body: b1232, labels: ['enhancement'], state: 'closed' },
  'feature-zh': { n: 1228, title: '[Feature]: 新增剪切板同步开关、增加剪切板同步循环冲突检测？', body: b1228, labels: ['enhancement'] },
  audio: { n: 1202, title: '[Bug]: 串流结束后虚拟音频驱动仍在且卸载软件后不会自动切换', body: b1202, labels: ['bug'] },
  edited: { n: 1212, title: '[Bug]: 串流应用页顶栏按钮 hover 时，搜索框/视图切换/应用卡同样闪出硬边色块', body: b1212, labels: [], state: 'closed' },
  feedback: { n: 1241, title: 'TypeError: Cannot read properties of undefined', body: feedbackBody('zh', 'bug'), labels: ['bug', 'from-app'], who: 'sky-hua' },
  'feedback-en': { n: 1242, title: 'Black picture after the stream starts', body: feedbackBody('en', 'bug'), labels: ['bug', 'from-app'], who: 'sky-hua' },
  plain: { n: 1203, title: 'Proposal: negotiated host-restart intent', body: b1203, labels: [] },
  checks: { n: 1250, title: '[Review]: a form with check boxes', body: '### ✅ Before you submit\n\n- [x] I searched the existing issues\n- [ ] This is about the server, not the client\n- [x] I use Windows 10 or 11\n\n### 📝 What\n\nA short text with `code` and a list:\n\n1. one\n2. two\n\n### ☀️ Version\n\n2026.1104\n\n### 🏷️ Kind\n\nB', labels: ['enhancement'], templates: [checksTemplate] },
}
// ?case=real-<number>: the item exactly as the client of the product gave it from GitHub's own answer (read on 2026-11-11), its comments too
const caseName = q.get('case') || 'bug-zh'
const realItem = caseName.startsWith('real-') ? real.find((i) => i.n === Number(caseName.slice(5))) : null
const c = realItem ? { ...realItem, real: realItem, comments: realItem.thread || [] } : CASES[caseName]
const item = c.real || { key: `fs#${c.n}`, n: c.n, repo: 'fs', kind: 'issue', title: c.title, state: c.state || 'open', labels: c.labels || [], who: c.who || 'miku3390', at: '2026-11-11T08:00:00Z', created: '2026-11-10T09:00:00Z', comments: (c.comments || []).length, body: c.body, bodyCut: false, url: `https://github.com/AlkaidLab/foundation-sunshine/issues/${c.n}`, branch: '' }
const client = {
  list: async () => ({ state: 'ok', items: [], at: Date.now() }),
  comments: async () => ({ state: 'ok', items: c.comments || [], at: Date.now() }),
  templates: async () => ({ state: c.templates ? 'ok' : 'error', items: c.templates || [], at: Date.now() }),
  rate: () => ({}),
}
const width = Number(q.get('w')) || 0
createApp({ render: () => h('div', { class: 'm-app', style: 'padding:16px;box-sizing:border-box;min-height:100vh' }, [h('div', { class: 'dm-issues', style: width ? `width:${width}px;margin:0 auto` : 'max-width:1280px;margin:0 auto' }, [h(DevIssueReader, { item, client, locale: q.get('lang') || 'zh', closable: false, openUrl: () => {} })])]) }).mount('#app')
