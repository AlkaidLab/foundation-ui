<script setup>
import { MLaunchSplash } from '../src/vue/index.js'

// The launch splash (启动画面) at every stage: a game with a hero (the Sparxie stages, the notice of a direct start), an app without one (the loading shape), a failure.
// The sample picture is drawn here; the real heroes are the host's own (the shots of the Panel's splash window carry them).
const q = new URLSearchParams(location.search)
const locale = q.get('locale') || 'zh'
const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2b4a8b'/><stop offset='.62' stop-color='#9fb8e8'/><stop offset='1' stop-color='#f0d9c4'/></linearGradient></defs><rect width='1600' height='900' fill='url(#s)'/><circle cx='1180' cy='250' r='110' fill='#fff7e6' opacity='.9'/><path d='M0 640 L260 360 L470 560 L700 300 L980 600 L1240 420 L1600 650 V900 H0Z' fill='#3b4f7a'/><path d='M0 760 L330 540 L560 700 L860 500 L1180 720 L1600 560 V900 H0Z' fill='#1f2c4a'/></svg>`
const art = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
const cases = [
  { name: '原神', art, stage: 'starting', notice: '', note: '有大图 · 正在启动' },
  { name: '原神', art, stage: 'broker', notice: '', note: '有大图 · 启动 Broker' },
  { name: '原神', art, stage: 'preparing', notice: '', note: '有大图 · Sparxie 准备中' },
  { name: '原神', art, stage: 'injecting', notice: '', note: '有大图 · 注入中' },
  { name: '原神', art, stage: 'waiting-window', notice: '', note: '有大图 · 等待游戏窗口' },
  { name: '原神', art, stage: 'waiting-window', notice: 'direct', note: '有大图 · 直接启动的提示' },
  { name: '原神', art, stage: 'failed', notice: 'timed-out', note: '有大图 · 启动失败' },
  { name: 'Hades II', art: '', stage: 'starting', notice: '', note: '没有大图 · 正在启动' },
  { name: 'Hades II', art: '', stage: 'waiting-window', notice: '', note: '没有大图 · 等待游戏窗口' },
  { name: 'Hades II', art: '', stage: 'failed', notice: 'start', note: '没有大图 · 启动失败' },
]
const shown = q.get('only') === null ? cases : [cases[+q.get('only')]]
</script>

<template>
  <div class="ls-g">
    <figure v-for="(c, i) in shown" :key="i" class="ls-g__fig">
      <div class="ls-g__frame"><MLaunchSplash inline :name="c.name" :art="c.art" :stage="c.stage" :notice="c.notice" :locale="locale" /></div>
      <figcaption>{{ c.note }}</figcaption>
    </figure>
  </div>
</template>

<style>
.ls-g { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 24px; padding: 24px; background: var(--md-sys-color-surface-container-lowest); min-height: 100vh; box-sizing: border-box; }
.ls-g__fig { margin: 0; display: grid; gap: 8px; }
.ls-g__frame { position: relative; aspect-ratio: 16 / 9; border-radius: 16px; overflow: hidden; background: #000; }
.ls-g__fig figcaption { color: var(--md-sys-color-on-surface-variant); font: 500 13px 'Roboto Flex', system-ui, sans-serif; }
</style>
