<script setup>
import { computed, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import MOsChips from './MOsChips.vue'
import MClientAssets from './MClientAssets.vue'
import MClientTag from './MClientTag.vue'
import MLinkActions from './MLinkActions.vue'
import MOverflow from './MOverflow.vue'
import { CLIENT_OS, osChipName } from '../clients/catalogue.js'
import { fillText } from './guideTexts.js'
import { readOs, writeOs } from '../clients/osChoice.js'
import { clientUrl, connectTexts, othersTitle, recommendForOs, whyOf } from '../clients/recommend.js'
import { assetOsOf, mirrorName, releaseRows } from '../clients/assets.js'

/**
 * The download tile of the overview. One layout per size, no line of it overlaps another:
 *   small and medium: the recommended client of the chosen system (its name on a line of its own, the badge under it, then system, file and size), one 下载 button and a single
 *     overflow menu (copy the link, share it, switch to another system); the chips of the systems are not drawn here (they are the first thing that gets cramped);
 *   large: the chips of the systems, then two columns: the recommended client with every file it has for the system | the other clients.
 * The system is the one the person last chose anywhere (Android the first time).
 */
const props = defineProps({
  texts: { type: Object, default: () => ({}) },
  locale: { type: String, default: 'en' },
  size: { type: String, default: 'm' },
  assetsOf: { type: Function, default: null },
  versionOf: { type: Function, default: null },
  qr: { type: Function, default: null },
})
const emit = defineEmits(['open-url', 'open'])
const T = computed(() => connectTexts(props.locale))
const os = ref(readOs())
watch(os, (v) => writeOs(v))
const rec = computed(() => recommendForOs(os.value))
const rows = computed(() => (props.assetsOf ? releaseRows(props.assetsOf(rec.value.client), assetOsOf(rec.value.target), props.locale) : []))
const best = computed(() => rows.value.find((r) => r.recommended) || rows.value[0] || null)
const version = computed(() => (props.versionOf ? props.versionOf(rec.value.client) : ''))
const mainUrl = computed(() => best.value?.url || clientUrl(rec.value.client, props.locale))
const name = (c) => c.label || c.name
const osName = computed(() => osChipName(os.value, props.locale))
const sub = computed(() => [osName.value, best.value?.label, best.value?.sizeLabel, version.value].filter(Boolean).join(' · '))
const menu = computed(() => [
  { id: 'copy', label: T.value.copyLink },
  { id: 'share', label: T.value.share },
  ...CLIENT_OS.filter((o) => o !== os.value).map((o) => ({ id: `os:${o}`, label: fillText(T.value.switchTo, { os: osChipName(o, props.locale) }) })),
])
async function onMenu(id) {
  if (id.startsWith('os:')) { os.value = id.slice(3); return }
  const url = mainUrl.value
  if (id === 'share' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') { navigator.share({ title: name(rec.value.client), url }).catch(() => {}); return }
  try { await navigator.clipboard.writeText(url) } catch { /* no clipboard: the link stays on the download button */ }
}
</script>

<template>
  <section class="m-dcard m-ddl" :class="`m-ddl--${size}`">
    <header class="m-dcard__head"><MIcon class="m-dcard__icon" name="download" /><h3 class="m-dcard__title">{{ texts.title }}</h3>
      <button type="button" class="m-conn__link m-ddl__all" @click="emit('open')">{{ texts.openDownloads }}<MIcon name="arrow_forward" /></button></header>
    <MOsChips v-if="size === 'l'" v-model="os" compact :locale="locale" :label="T.osChoice" />
    <div v-if="size !== 'l'" class="m-ddl__compact">
      <div class="m-ddl__lead m-ddl__lead--stack">
        <span class="m-ddl__icon"><MIcon :name="rec.client.icon" /></span>
        <span class="m-ddl__name"><b>{{ name(rec.client) }}</b><MClientTag :official="rec.official" :locale="locale" /><small>{{ sub }}</small></span>
      </div>
      <div class="m-ddl__acts">
        <button type="button" class="m-dpill m-dpill--fill m-ddl__go" :aria-label="`${T.download} ${name(rec.client)}`" @click="emit('open-url', mainUrl)"><MIcon name="download" />{{ T.download }}</button>
        <MOverflow :items="menu" :label="T.more" @select="onMenu" />
      </div>
    </div>
    <div v-else class="m-ddl__cols">
      <div class="m-ddl__col">
        <div class="m-ddl__lead m-ddl__lead--head">
          <span class="m-ddl__icon"><MIcon :name="rec.client.icon" /></span>
          <span class="m-ddl__name"><b>{{ name(rec.client) }}</b><small>{{ whyOf(rec.client, locale) || version }}</small></span>
          <MClientTag :official="rec.official" :locale="locale" />
        </div>
        <MClientAssets v-if="rows.length" :rows="rows" :texts="T" :qr="qr" :mirror="mirrorName(locale)" :version="version" @open-url="(u) => emit('open-url', u)" />
        <button v-else type="button" class="m-dpill m-dpill--fill m-ddl__single" @click="emit('open-url', mainUrl)"><MIcon name="open_in_new" />{{ rec.client.product ? T.download : T.openPage }}</button>
      </div>
      <div class="m-ddl__col m-ddl__col--others">
        <h4>{{ othersTitle(rec.others, T) }}</h4>
        <ul v-if="rec.others.length" class="m-ddl__others">
          <li v-for="x in rec.others" :key="x.client.id + x.target.platform"><MIcon :name="x.client.icon" /><span class="m-conn__oname">{{ name(x.client) }}</span><MClientTag :official="x.client.group === 'first'" :locale="locale" /><button type="button" class="m-conn__link" @click="emit('open-url', clientUrl(x.client, locale))"><MIcon name="open_in_new" />{{ T.download }}</button><MLinkActions :url="clientUrl(x.client, locale)" :title="name(x.client)" :qr="qr" :texts="T" /></li>
        </ul>
        <p v-else class="m-ddl__none">{{ T.onlyOne }}</p>
      </div>
    </div>
  </section>
</template>
