import { createApp } from 'vue'
import '../src/css/all.css'
import '../src/vue/index.js'
import { applyTheme } from '../src/tokens/theme.js'
import LaunchSplashGallery from './LaunchSplashGallery.vue'

// ?theme=light|dark|black  ?locale=zh|en  ?only=<n>: the launch splash at every stage, in 16:9 frames
const q = new URLSearchParams(location.search)
applyTheme(document.documentElement, { black: q.get('theme') === 'black' })
createApp(LaunchSplashGallery).mount('#app')
