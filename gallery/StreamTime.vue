<script setup>
import { MProgress } from '../src/vue/index.js'
import TileGauge from '../src/vue/tiles/TileGauge.vue'
import { buildCatalogue } from '../src/vue/homeCatalogue.js'
import { CATALOGUE_TEXTS } from '../src/vue/homeCatalogueTexts.js'
import { sizePx } from '../src/vue/homeSizes.js'

// The 串流时长 tile from the catalogue (the real data path) at 0:18, 12 min and 47 min, the client placeholder 'unknown' of the host resolved or dropped, at 小, 中 and 大.
const T = CATALOGUE_TEXTS.zh
const clients = [{ uuid: 'AB-1', name: 'Pixel 9 Pro' }]
const make = (uptimeMs, client_name, client_uuid = '') => buildCatalogue({ session: { uptimeMs, client_name, client_uuid, width: 1920, height: 1080, fps: 60 }, clients, now: Date.now() }, T).data['session-time']
const cases = [
  ['0:18 · unknown, paired uuid', make(18000, 'unknown', 'ab-1')],
  ['0:18 · unknown, no match', make(18000, 'unknown')],
  ['12:05 · named', make(725000, 'Pixel 9 Pro')],
  ['47:30 · named', make(2850000, 'Pixel 9 Pro')],
  ['1:59:50 · named', make(7190000, 'Pixel 9 Pro')],
]
const q = new URLSearchParams(location.search)
const shown = q.get('c') === null ? cases : [cases[+q.get('c')]]
const sizes = q.get('k') ? [q.get('k')] : ['s', 'm', 'l']
const unit = 176
const box = (k) => { const [w, h] = sizePx(k, unit); return { width: `${w}px`, height: `${h}px` } }
</script>

<template>
  <main class="stg">
    <section v-for="[label, data] in shown" :key="label" class="stg__row">
      <h2>{{ label }}</h2>
      <div class="stg__tiles">
        <figure v-for="k in sizes" :key="k"><TileGauge :style="box(k)" :card="{ id: 'session-time', title: T['c_session-time'], size: k, data }" /><figcaption>{{ k }}</figcaption></figure>
      </div>
    </section>
    <section v-if="q.get('c') === null" class="stg__row">
      <h2>断线 (MProgress circular)</h2>
      <div class="stg__tiles"><MProgress circular :value="0.1" label="a" style="width: 112px; height: 112px" /><MProgress circular :value="0.6" label="b" style="width: 112px; height: 112px" /></div>
    </section>
  </main>
</template>

<style>
html { background: var(--m-page-solid); }
.stg { padding: 16px 24px; font-family: var(--md-ref-typeface-brand); color: var(--md-sys-color-on-surface); }
.stg h2 { margin: 0 0 6px; font: 600 13px/18px var(--md-ref-typeface-brand); }
.stg__row { margin-bottom: 14px; }
.stg__tiles { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
.stg figure { margin: 0; } .stg figcaption { font: 500 11px/14px var(--md-ref-typeface-brand); color: var(--md-sys-color-on-surface-variant); }
</style>
