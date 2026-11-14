import { createApp } from 'vue'
import '../src/css/all.css'
import '../src/vue/index.js'
import { applyTheme } from '../src/tokens/theme.js'
import Tray from './TrayGallery.vue'

// ?theme=light|dark|black &seed=<hex> &v=1|2|3 (one variant; none: the sheet of the three) &page=<page id> &state=busy|idle &still=1 (no motion) &bare=1 (the card alone, no taskbar)
const q = new URLSearchParams(location.search)
const seed = q.get('seed')
applyTheme(document.documentElement, { ...(seed ? { light: `#${seed.replace('#', '')}`, dark: `#${seed.replace('#', '')}` } : {}), black: q.get('theme') === 'black', style: q.get('style') || undefined })
createApp(Tray).mount('#app')
