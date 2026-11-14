<script setup>
import { MDashWidget } from '../src/vue/index.js'
import { smartPlan } from '../src/vue/homeSmart.js'
import { buildCatalogue } from '../src/vue/homeCatalogue.js'
import { homeTexts } from '../src/vue/homeModel.js'
import { columnsOf, sizePx } from '../src/vue/homeSizes.js'

// Gallery only: the smart plan of one state, drawn in its order and sizes. The announcement tile is the real one on sample posts; the other tiles are named boxes (this page is about the one tile and its place).
const q = new URLSearchParams(location.search)
const state = q.get('state') || 'idle'
const news = q.get('news') || 'unread'
const T = homeTexts(q.get('lang') || 'zh')
const NOW = Date.now()
const banner = (a, b) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="480" height="320" fill="url(#g)"/><circle cx="360" cy="90" r="70" fill="#fff" fill-opacity=".25"/><circle cx="120" cy="250" r="110" fill="#fff" fill-opacity=".16"/></svg>`)}`
const read = news === 'read'
const posts = news === 'none' ? [] : [
  { id: 'a', title: '新版本 2026.1105 发布', category: 'update', banner: news === 'unread' ? banner('#6750a4', '#d0bcff') : '', date: '11-05', read },
  { id: 'b', title: '串流画质与延迟的新选项', category: 'announce', banner: news === 'unread' ? banner('#006a6a', '#4fd8d8') : '', date: '11-03', read },
  { id: 'c', title: '本周维护说明', category: 'announce', date: '11-01', read: true },
  { id: 'd', title: '第一次串流教程', category: 'announce', date: '10-28', read: true },
]
const cat = buildCatalogue({ announcements: posts }, T).data.announcements
const signals = { now: NOW, pairedCount: 3, ...(state === 'live' ? { streaming: true } : state === 'after' ? { lastStreamAt: NOW - 5 * 60 * 1000 } : {}) }
const SIZES = { announcements: ['s', 'm', 'l'], bitrate: ['s', 'm', 'l'], fps: ['s', 'm', 'l'], hero: ['s', 'm', 'l'], 'last-session': ['s', 'm'], 'session-heat': ['s', 'm'] }
const ids = ['hero', 'clients-online', 'current-app', 'session-time', 'bitrate', 'fps', 'loss', 'latency', 'cpu', 'gpu', 'act-stop', 'pair', 'public-address', 'last-session', 'session-heat', 'quick', 'announcements', 'recent-actions', 'live-bitrate', 'live-ds5', 'memory']
const plan = smartPlan({ cards: ids.map((id) => ({ id, available: true, sizes: SIZES[id] || ['s', 'm'] })), signals, capacity: +q.get('cap') || 36, sizeClass: 'medium' })
const unit = columnsOf(1000).unit
const box = (id) => { const [w, h] = sizePx(plan.sizes[id], unit); return { width: `${w}px`, height: `${h}px` } }
</script>

<template>
  <main :style="{ padding: '16px', maxWidth: '700px', background: 'var(--md-sys-color-surface)', minHeight: '100vh', boxSizing: 'border-box', color: 'var(--md-sys-color-on-surface)', font: 'var(--m-body-medium)' }">
    <p style="margin: 0 0 10px"><b>{{ state }}</b> · {{ news }} · the announcements are tile {{ plan.visible.indexOf('announcements') + 1 }} of {{ plan.visible.length }} · size {{ plan.sizes.announcements }}</p>
    <div v-if="cat" :style="{ ...box('announcements'), marginBottom: '14px' }"><MDashWidget :data="cat" :size="plan.sizes.announcements" :texts="T" card-id="announcements" :live="false" style="height: 100%" /></div>
    <p style="margin: 0 0 6px; opacity: .7">the plan, in order (placeholders, 40%)</p>
    <div :style="{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignContent: 'flex-start', zoom: 0.4 }">
      <div v-for="id in plan.visible" :key="id" :style="box(id)">
        <div :style="{ height: '100%', boxSizing: 'border-box', borderRadius: '20px', background: id === 'announcements' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)', outline: id === 'announcements' ? '6px solid var(--md-sys-color-primary)' : 'none', display: 'grid', placeItems: 'center', fontSize: '28px', color: 'var(--md-sys-color-on-surface-variant)' }">{{ id }}</div>
      </div>
    </div>
  </main>
</template>
