import { createApp } from 'vue'
import '../src/css/all.css'
import '../src/vue/index.js'
import { applyTheme } from '../src/tokens/theme.js'
import Tiles from './TilesGallery.vue'

// ?theme=light|dark|black &seed=<hex> (both schemes) &style=bright|classic|quiet &w=<px: the window the units are taken from> &only=<tile ids> &live=1
const q = new URLSearchParams(location.search)
const seed = q.get('seed')
applyTheme(document.documentElement, { ...(seed ? { light: `#${seed.replace('#', '')}`, dark: `#${seed.replace('#', '')}` } : {}), black: q.get('theme') === 'black', style: q.get('style') || undefined })
createApp(Tiles).mount('#app')
