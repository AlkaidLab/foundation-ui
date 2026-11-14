import { createApp } from 'vue'
import '../src/css/all.css'
import '../src/vue/index.js'
import { applyTheme } from '../src/tokens/theme.js'
import Choice from './ChoiceGallery.vue'

// ?theme=light|dark|black &seed=<hex> &only=tray|reach|appearance|cover|cards|swatches (one block) &locale=zh|en
const q = new URLSearchParams(location.search)
const seed = q.get('seed')
applyTheme(document.documentElement, { ...(seed ? { light: `#${seed.replace('#', '')}`, dark: `#${seed.replace('#', '')}` } : {}), black: q.get('theme') === 'black', style: q.get('style') || undefined })
createApp(Choice).mount('#app')
