import { createApp } from 'vue'
import '../src/css/all.css'
import '../src/vue/index.js'
import { applyTheme } from '../src/tokens/theme.js'
import StreamTime from './StreamTime.vue'

// ?theme=light|dark  the 串流时长 tile at every size it is offered, next to the 断线 ring (MProgress circular), from the real catalogue data
const q = new URLSearchParams(location.search)
applyTheme(document.documentElement, { black: q.get('theme') === 'black' })
createApp(StreamTime).mount('#app')
