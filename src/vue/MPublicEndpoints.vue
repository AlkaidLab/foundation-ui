<script setup>
import { computed, ref, watch } from 'vue'
import MField from './MField.vue'
import MButton from './MButton.vue'
import MIcon from './MIcon.vue'
import MIconButton from './MIconButton.vue'
import { MAX_ENDPOINTS, parseEndpoints, serializeEndpoints, validateEndpoint } from '../settings/reachability.js'
import { reachTexts } from '../settings/reachTexts.js'

// The public endpoints (`external_endpoints`): the addresses clients use from outside, each typed the way a host is added in Moonlight (`host`, `host:port`, `[v6]:port`; the port is
// optional) and checked as it is typed. Every saved row carries the host's result for it (state, the HTTPS port that was tested, the time). `saved` is the stored list as one string;
// `results` are the rows of `reachView(report).paths[0].endpoints`. Saved on its own; the check runs against the saved list.
const props = defineProps({
  saved: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  locale: { type: String, default: 'en' },
  busy: { type: Boolean, default: false },
  checking: { type: Boolean, default: false },
})
const emit = defineEmits(['save', 'check'])
const T = computed(() => reachTexts(props.locale).address)
const U = computed(() => reachTexts(props.locale))
let serial = 0
const fromSaved = () => {
  const list = parseEndpoints(props.saved)
  return (list.length ? list : ['']).map((text) => ({ id: ++serial, text, saved: text }))
}
const rows = ref(fromSaved())
watch(() => props.saved, () => { rows.value = fromSaved() })

const checks = computed(() => rows.value.map((row, i) => {
  const text = row.text.trim()
  if (!text) return { ok: true, empty: true, error: '', warn: '' }
  const v = validateEndpoint(text)
  if (!v.ok) return { ok: false, empty: false, error: T.value.errors[v.error] || T.value.errors.format, warn: '' }
  const first = rows.value.findIndex((other) => validateEndpoint(other.text).text === v.text)
  if (first !== i) return { ok: false, empty: false, error: T.value.errors.duplicate, warn: '' }
  return { ok: true, empty: false, error: '', warn: v.warn === 'private' ? T.value.errors.private : '' }
}))
const valid = computed(() => checks.value.every((c) => c.ok))
const filled = computed(() => rows.value.filter((r) => r.text.trim()).length)
const draftValue = computed(() => serializeEndpoints(rows.value.map((r) => r.text)))
const dirty = computed(() => draftValue.value !== serializeEndpoints(parseEndpoints(props.saved)))
const count = computed(() => T.value.count.replace('{n}', String(filled.value)).replace('{max}', String(MAX_ENDPOINTS)))
const full = computed(() => rows.value.length >= MAX_ENDPOINTS)

function resultOf(row) {
  if (dirty.value && row.text.trim() !== row.saved) return null
  const text = validateEndpoint(row.saved).text
  return props.results.find((r) => r.input === text) || null
}
const root = ref(null)
const focusLast = () => {
  const fields = root.value?.querySelectorAll('md-outlined-text-field')
  fields?.[fields.length - 1]?.focus?.()
}
function add(text = '') {
  if (full.value) return
  const empty = rows.value.find((r) => !r.text.trim())
  if (empty) { empty.text = text } else rows.value.push({ id: ++serial, text, saved: '' })
  setTimeout(focusLast, 0)
}
function remove(i) {
  rows.value.splice(i, 1)
  if (!rows.value.length) rows.value.push({ id: ++serial, text: '', saved: '' })
}
function save() { if (valid.value && dirty.value) emit('save', draftValue.value) }
defineExpose({ focus: focusLast, fill: (value) => { if (!rows.value.some((r) => validateEndpoint(r.text).text === validateEndpoint(value).text)) add(value) } })
</script>

<template>
  <div ref="root" class="m-pubaddr">
    <div class="m-pubaddr__head"><b>{{ T.title }}</b><small>{{ count }}</small></div>
    <ul class="m-pubaddr__rows">
      <li v-for="(row, i) in rows" :key="row.id" class="m-pubaddr__row">
        <div class="m-pubaddr__line">
          <MField v-model="row.text" :label="T.fieldLabel" :placeholder="T.placeholder" :supporting="checks[i].warn" :error="checks[i].error" :disabled="busy" @keydown.enter="save" />
          <MIconButton icon="delete" :label="T.remove" :disabled="busy || (rows.length === 1 && !row.text)" @click="remove(i)" />
        </div>
        <div v-if="resultOf(row) && !checking" class="m-pubaddr__result" :class="`is-${resultOf(row).tone}`" :data-state="resultOf(row).reached ? 'reached' : 'failed'">
          <MIcon :name="resultOf(row).icon" :fill="resultOf(row).reached" />
          <b>{{ resultOf(row).word }}</b>
          <span v-if="resultOf(row).portText">{{ resultOf(row).portText }}</span>
          <span v-if="resultOf(row).latencyText">{{ resultOf(row).latencyText }}</span>
          <i v-if="resultOf(row).scopeWord" class="m-pubaddr__scope">{{ resultOf(row).scopeWord }}</i>
          <i v-if="resultOf(row).mismatch" class="m-pubaddr__scope is-bad">{{ T.differs }}</i>
          <code v-if="resultOf(row).resolved.length && resultOf(row).resolved.join() !== resultOf(row).input">{{ resultOf(row).resolved.join(', ') }}</code>
        </div>
      </li>
    </ul>
    <div class="m-pubaddr__actions">
      <MButton variant="tonal" icon="add" :disabled="busy || full" @click="add()">{{ T.add }}</MButton>
      <MButton variant="tonal" icon="save" :loading="busy" :disabled="!valid || !dirty" @click="save">{{ busy ? T.saving : T.save }}</MButton>
      <MButton variant="tonal" icon="fact_check" :loading="checking" :disabled="busy || dirty" @click="emit('check')">{{ T.check }}</MButton>
    </div>
  </div>
</template>
