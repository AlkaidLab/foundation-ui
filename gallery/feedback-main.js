// 反馈 row of 帮助与关于 with the form host (MErrorHost): ?locale=en, ?host=0 mounts no host (an embedded frame): the row is gone
import { createApp, h } from 'vue'
import '../src/css/all.css'
import { applyTheme } from '../src/tokens/theme.js'
import { MPage, MSection, MGroup, MItem, MFeedbackRow, MErrorHost } from '../src/vue/index.js'

const q = new URLSearchParams(location.search)
applyTheme(document.documentElement, { black: q.get('theme') === 'black' })
const locale = q.get('locale') || 'zh'
createApp({
  render: () => h('div', { class: 'm-app m-root', style: 'min-height:100vh' }, [
    h(MPage, { title: locale === 'zh' ? '帮助与关于' : 'Help and about' }, () => [h(MSection, null, () => [h(MGroup, null, () => [h(MItem, { action: true, icon: 'health_and_safety', title: locale === 'zh' ? '开始体检' : 'Start health check' }), h(MFeedbackRow, { locale })])])]),
    q.get('host') === '0' ? null : h(MErrorHost, { locale, canGoBack: false, hostOnline: true }),
  ]),
}).mount('#app')
