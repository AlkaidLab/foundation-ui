<script setup>
import { computed, ref } from 'vue'
import MIcon from '../MIcon.vue'
import MButton from '../MButton.vue'
import MChip from '../MChip.vue'
import MIconButton from '../MIconButton.vue'
import { ENDPOINTS, inspect, readablePath } from '../../developer/apiInspector.js'
import { devmodeTexts } from '../../devmode/texts.js'

// API 检查器 as a page: the endpoints on one side, the answer on the other. Read only: one GET under /api/, the secrets hidden (developer/apiInspector.js).
const props = defineProps({ locale: { type: String, default: 'zh' }, apiBase: { type: String, default: '' } })
const emit = defineEmits(['notify'])
const T = computed(() => devmodeTexts(props.locale))
const path = ref('/api/config')
const result = ref(null)
const busy = ref(false)
const valid = computed(() => !!readablePath(path.value))
async function read(p) {
  if (p) path.value = p
  if (!valid.value) return
  busy.value = true
  result.value = await inspect({ base: props.apiBase, path: path.value })
  busy.value = false
}
async function copy() { try { await navigator.clipboard.writeText(result.value?.body || ''); emit('notify', T.value.copied) } catch { /* refused */ } }
defineExpose({ read, result })
</script>

<template>
  <div class="dm-api" data-dev="api">
    <div class="dm-pane">
      <button v-for="e in ENDPOINTS" :key="e.path" type="button" class="dm-call" :aria-current="path === e.path" @click="read(e.path)">
        <span class="dm-call__m">GET</span><span class="dm-call__p">{{ e.path }}</span><span class="dm-call__s dm-dim">{{ e.note }}</span>
      </button>
    </div>
    <div class="dm-resp">
      <div class="dm-path"><span class="dm-mono dm-dim">GET</span><input v-model="path" class="dm-path__in dm-mono" :aria-label="T.apiPath" spellcheck="false" @keydown.enter="read()"><MButton variant="filled" size="sm" icon="play_arrow" :disabled="!valid || busy" @click="read()">{{ T.apiRead }}</MButton></div>
      <p v-if="!valid" class="dm-note dm-note--error"><MIcon name="error" fill /><span>{{ T.apiBad }}</span></p>
      <div v-if="result" class="dm-bar" data-dev="api-result"><MChip :tone="result.ok ? 'ok' : 'error'" :icon="result.ok ? 'check_circle' : 'error'">{{ result.status || result.error }}</MChip><MChip icon="timer">{{ result.ms }} ms</MChip><MChip v-if="result.bytes !== undefined" icon="code">{{ result.bytes }} B</MChip><MChip icon="lock">{{ T.apiHidden }}</MChip><span class="dm-spacer" /><MIconButton icon="content_copy" :label="T.apiCopy" @click="copy" /></div>
      <pre v-if="result && result.body !== undefined" class="dm-code">{{ result.body }}</pre>
      <p v-else-if="!result" class="dm-empty">{{ T.apiNone }}</p>
    </div>
  </div>
</template>
