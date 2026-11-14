<script setup>
import { shortSource } from '../../devmode/logrow.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MIcon from '../MIcon.vue'
import MIconButton from '../MIconButton.vue'
import DevChip from './DevChip.vue'
import { devmodeTexts, fillText } from '../../devmode/texts.js'

// 实时日志: the log of the panel and the host read again every two seconds while 「实时」 is on. A line that does not start with [time] [LEVEL] belongs to the line before it.
const props = defineProps({ locale: { type: String, default: 'zh' }, text: { type: Function, default: null }, intervalMs: { type: Number, default: 2000 }, limit: { type: Number, default: 300 } })
const emit = defineEmits(['notify'])
const T = computed(() => devmodeTexts(props.locale))
const LINE = /^\[([^\]]+)\] \[(\w+)\](?: \[([^\]]*)\])? ?(.*)$/
const rows = ref([])
const levels = ref(['error', 'warn', 'info'])
const live = ref(true)
const view = ref(null)
let timer = 0
let busy = false
const norm = (lv) => { const l = String(lv || '').toLowerCase(); return l === 'warning' ? 'warn' : l === 'trace' ? 'debug' : ['error', 'warn', 'info', 'debug'].includes(l) ? l : 'info' }
const parseLines = (text) => {
  const out = []
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue
    const m = LINE.exec(line)
    if (m) out.push({ t: m[1].replace(/^\d{4}-\d\d-\d\d /, ''), lv: norm(m[2]), src: m[3] || '', msg: m[4] || '' })
    else if (out.length) out[out.length - 1].msg += `\n${line}`
    else out.push({ t: '', lv: 'info', src: '', msg: line })
  }
  return out
}
async function read() {
  if (busy || !props.text) return
  busy = true
  try {
    const next = parseLines(await props.text()).slice(-props.limit * 3)
    const stick = !view.value || view.value.scrollHeight - view.value.scrollTop - view.value.clientHeight < 40
    rows.value = next
    if (stick) { await nextTick(); if (view.value) view.value.scrollTop = view.value.scrollHeight }
  } catch { /* the log is not readable now */ }
  busy = false
}
function arm() { clearInterval(timer); if (live.value) timer = setInterval(read, props.intervalMs) }
onMounted(() => { read(); arm() })
onBeforeUnmount(() => clearInterval(timer))
const toggleLive = () => { live.value = !live.value; arm(); if (live.value) read() }
const toggle = (lv) => { levels.value = levels.value.includes(lv) ? levels.value.filter((x) => x !== lv) : [...levels.value, lv] }
const count = (lv) => rows.value.filter((r) => r.lv === lv).length
const shown = computed(() => rows.value.filter((r) => levels.value.includes(r.lv)).slice(-props.limit))
async function copy() { try { await navigator.clipboard.writeText(shown.value.map((r) => `${r.t} ${r.lv.toUpperCase()} ${r.src} ${r.msg}`).join('\n')); emit('notify', devmodeTexts(props.locale).copied) } catch { /* refused */ } }
const clear = () => { rows.value = [] }
defineExpose({ rows, shown, read })
</script>

<template>
  <div class="dm-col" data-dev="logs">
    <div class="dm-bar">
      <div class="dm-chips"><DevChip v-for="l in ['error', 'warn', 'info', 'debug']" :key="l" :label="T.logsLevels[l]" :count="count(l)" :pressed="levels.includes(l)" @click="toggle(l)" /></div>
      <span class="dm-spacer" />
      <button type="button" class="dm-fchip dm-live" :aria-pressed="live" @click="toggleLive"><i />{{ T.logsLive }}</button>
      <MIconButton :icon="live ? 'pause' : 'play_arrow'" :label="live ? T.logsPause : T.logsResume" @click="toggleLive" />
      <MIconButton icon="content_copy" :label="T.logsCopy" @click="copy" />
      <MIconButton icon="delete" :label="T.logsClear" @click="clear" />
    </div>
    <div ref="view" class="dm-logbox" tabindex="0" :aria-label="T.pages.logs">
      <p v-if="!shown.length" class="dm-empty">{{ T.logsNone }}</p>
      <div v-for="(l, i) in shown" :key="i" class="dm-logrow" :class="`dm-logrow--${l.lv}`"><span class="dm-dim">{{ l.t }}</span><span class="dm-lv" :class="`dm-lv--${l.lv}`">{{ l.lv }}</span><span class="dm-dim dm-logsrc" :title="l.src">{{ shortSource(l.src) }}</span><span class="dm-logmsg" data-redact="path">{{ l.msg }}</span></div>
    </div>
    <p class="dm-dim dm-small">{{ fillText(T.logsMore, { n: limit }) }}</p>
  </div>
</template>
