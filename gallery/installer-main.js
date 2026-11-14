import { createApp } from 'vue'
import '../src/css/all.css'
import '../src/vue/index.js'
import { applyTheme } from '../src/tokens/theme.js'
import InstallerGallery from './InstallerGallery.vue'

// ?state=<id> &theme=light|dark|black &locale=zh|en &live=1 (a scripted host: click through) &scenario=<mock scenario> &bare=1 (the window alone, for shots) &w=820 &h=560 &motion=reduced
const q = new URLSearchParams(location.search)
if (q.get('motion')) document.documentElement.dataset.motion = q.get('motion')
applyTheme(document.documentElement, { black: q.get('theme') === 'black', style: q.get('style') || undefined })
createApp(InstallerGallery).mount('#app')
