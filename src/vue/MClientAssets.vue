<script setup>
import { ref } from 'vue'
import MIcon from './MIcon.vue'
import MLinkActions from './MLinkActions.vue'

// The files of a client for one system (releaseRows): one row each with the architecture and format, the size, the best marked 推荐, the main download (CNB for Chinese, GitHub
// otherwise), the other host as a small link, and the SHA-256 to copy. A product opens the links (`open-url`).
defineProps({
  rows: { type: Array, default: () => [] },
  texts: { type: Object, required: true },
  mirror: { type: String, default: 'GitHub' },
  version: { type: String, default: '' },
  qr: { type: Function, default: null },
})
const emit = defineEmits(['open-url'])
const copied = ref('')
async function copy(row) {
  try { await navigator.clipboard.writeText(row.sha256) } catch {
    const t = document.createElement('textarea'); t.value = row.sha256; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy') } catch { /* no clipboard */ } t.remove()
  }
  copied.value = row.type
  setTimeout(() => { if (copied.value === row.type) copied.value = '' }, 1600)
}
const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '')
const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
</script>

<template>
  <ul class="m-assets" :aria-label="texts.files">
    <li v-for="r in rows" :key="r.type" class="m-assets__row" :class="{ 'is-best': r.recommended }">
      <div class="m-assets__what">
        <b>{{ r.label }}</b>
        <span v-if="r.recommended" class="m-assets__best">{{ texts.recommendedTag }}</span>
        <small v-if="r.sizeLabel">{{ r.sizeLabel }}<template v-if="version"> · {{ version }}</template></small>
      </div>
      <div v-if="r.sha256" class="m-assets__sha"><span class="m-assets__label">{{ texts.sha }}</span><code :title="r.sha256">{{ short(r.sha256) }}</code>
        <button type="button" class="m-assets__copy" :aria-label="texts.copySha" :data-tip="copied === r.type ? texts.copied : texts.copySha" @click="copy(r)"><MIcon :name="copied === r.type ? 'check' : 'content_copy'" /></button></div>
      <div class="m-assets__acts">
        <span class="m-assets__main"><button type="button" class="m-dpill m-dpill--fill" :aria-label="`${texts.download} ${r.label}`" @click="emit('open-url', r.url)"><MIcon name="download" />{{ texts.download }}</button>
          <MLinkActions :url="r.url" :cnb-url="r.cnbUrl" :github-url="r.githubUrl" :title="r.name || r.label" :qr="qr" :texts="texts" /></span>
        <button v-if="r.mirrorUrl" type="button" class="m-conn__link" @click="emit('open-url', r.mirrorUrl)">{{ fill(texts.fromMirror, { host: mirror }) }}</button>
      </div>
    </li>
  </ul>
</template>
