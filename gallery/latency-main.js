// The latency test clock on its own (the robot's latency-clock check, the round-34 shots): ?standalone=1 the face alone, ?mode=dark|light, ?locale=en, ?stream=1
import { createApp, h } from 'vue'
import '../src/css/all.css'
import { applyTheme } from '../src/tokens/theme.js'
import MLatencyClock from '../src/vue/MLatencyClock.vue'

const q = new URLSearchParams(location.search)
applyTheme(document.documentElement, { black: q.get('theme') === 'black' })
const standalone = q.get('standalone') === '1'
createApp({ render: () => h('div', { style: standalone ? '' : 'max-width:1100px;margin:0 auto;padding:32px' }, [h(MLatencyClock, { standalone, locale: q.get('locale') || 'zh', mode: q.get('mode') || '', canStream: q.get('stream') === '1' })]) }).mount('#app')
