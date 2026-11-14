<script setup>
import MBreakText from './MBreakText.vue'
import { computed, nextTick, ref } from 'vue'
import MField from './MField.vue'
import MButton from './MButton.vue'
import MIcon from './MIcon.vue'
import MSheet from './MSheet.vue'
import { MAX_ENDPOINTS, parseEndpoints, serializeEndpoints, validateEndpoint } from '../settings/reachability.js'
import { reachTexts } from '../settings/reachTexts.js'

// The public endpoints (`external_endpoints`) as a compact list, the way an address table reads: one row per address with the host's result for it (state, the HTTPS port that
// was tested, the time it took, what it resolved to) and its scope as a small chip. A row opens a sheet to change or delete it; the last row adds one. Each change is saved at once
// (the whole list, `save`), and the check runs against what is saved. `saved` is the stored list as one string; `results` are `reachView(report).paths[0].endpoints`.
const props = defineProps({
  saved: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  locale: { type: String, default: 'en' },
  busy: { type: Boolean, default: false },
  checking: { type: Boolean, default: false },
})
const emit = defineEmits(['save'])
const T = computed(() => reachTexts(props.locale).address)
const S = computed(() => reachTexts(props.locale).sheet)
const list = computed(() => parseEndpoints(props.saved))
const full = computed(() => list.value.length >= MAX_ENDPOINTS)
const count = computed(() => T.value.count.replace('{n}', String(list.value.length)).replace('{max}', String(MAX_ENDPOINTS)))
const resultOf = (text) => props.results.find((r) => r.input === text) || null
const detailOf = (r) => (r ? [r.portText, r.latencyText, r.resolved.length && r.resolved.join() !== r.input ? r.resolved.join(', ') : ''].filter(Boolean).join(' · ') : '')

// the sheet: index of the row being changed, -1 for a new one, null when closed
const editing = ref(null)
const draft = ref('')
const open = computed({ get: () => editing.value !== null, set: (v) => { if (!v) editing.value = null } })
const check = computed(() => {
  const text = draft.value.trim()
  if (!text) return { ok: false, error: '', warn: '' }
  const v = validateEndpoint(text)
  if (!v.ok) return { ok: false, error: T.value.errors[v.error] || T.value.errors.format, warn: '' }
  if (list.value.some((other, i) => i !== editing.value && other === v.text)) return { ok: false, error: T.value.errors.duplicate, warn: '' }
  return { ok: true, error: '', warn: v.warn === 'private' ? T.value.errors.private : '' }
})
const changed = computed(() => editing.value === -1 || validateEndpoint(draft.value).text !== list.value[editing.value])
function edit(i, text = '') {
  if (i === -1 && full.value) return
  editing.value = i
  draft.value = i === -1 ? text : list.value[i]
  void nextTick(() => document.querySelector('.m-epsheet md-outlined-text-field')?.focus?.())
}
function commit(next) { emit('save', serializeEndpoints(next)); editing.value = null }
function save() {
  if (!check.value.ok || !changed.value) return
  const next = [...list.value]
  if (editing.value === -1) next.push(validateEndpoint(draft.value).text)
  else next[editing.value] = validateEndpoint(draft.value).text
  commit(next)
}
function remove() { if (editing.value >= 0) commit(list.value.filter((_, i) => i !== editing.value)) }
// a fix of the reachability card opens the sheet: with nothing, or with the router's outside address filled in when it is not in the list yet
defineExpose({ add: (text = '') => { const v = validateEndpoint(text); if (v.ok && list.value.includes(v.text)) return; edit(-1, text) } })
</script>

<template>
  <div class="m-eplist" :aria-busy="busy || checking">
    <div class="m-eplist__head"><b>{{ T.title }}</b><small>{{ count }}</small></div>
    <ul class="m-eplist__rows" role="list">
      <li v-for="(text, i) in list" :key="text">
        <button type="button" class="m-eplist__row" :data-state="checking ? 'checking' : resultOf(text) ? (resultOf(text).reached ? 'reached' : 'failed') : 'unchecked'" :disabled="busy" @click="edit(i)">
          <span class="m-eplist__ico" :class="checking || !resultOf(text) ? 'is-neutral' : `is-${resultOf(text).tone}`"><MIcon :name="checking ? 'sync' : resultOf(text)?.icon || 'help'" :fill="!!resultOf(text)?.reached && !checking" /></span>
          <span class="m-eplist__main">
            <code class="m-eplist__addr" data-redact="address"><MBreakText :text="text" /></code>
            <span class="m-eplist__line">
              <template v-if="checking">{{ S.checking }}</template>
              <template v-else-if="resultOf(text)"><b :class="`is-${resultOf(text).tone}`">{{ resultOf(text).word }}</b><template v-if="detailOf(resultOf(text))"> · {{ detailOf(resultOf(text)) }}</template></template>
              <template v-else>{{ S.unchecked }}</template>
            </span>
          </span>
          <span class="m-eplist__chips">
            <i v-if="resultOf(text)?.mismatch" class="m-eplist__chip is-bad">{{ T.differs }}</i>
            <i v-if="resultOf(text)?.scopeWord" class="m-eplist__chip">{{ resultOf(text).scopeWord }}</i>
          </span>
        </button>
      </li>
      <li>
        <button type="button" class="m-eplist__row m-eplist__add" :disabled="busy || full" @click="edit(-1)">
          <span class="m-eplist__ico is-neutral"><MIcon name="add" /></span>
          <span class="m-eplist__main"><span class="m-eplist__addlabel">{{ T.add }}</span><span v-if="full" class="m-eplist__line">{{ S.full.replace('{max}', String(list.length)) }}</span></span>
        </button>
      </li>
    </ul>
    <MSheet v-model="open" class="m-epsheet" side="center" :title="editing === -1 ? S.add : S.edit" :close-label="S.cancel">
      <MField v-model="draft" :label="T.fieldLabel" :placeholder="T.placeholder" :supporting="check.warn" :error="check.error" :disabled="busy" @keydown.enter="save" />
      <template #actions>
        <MButton v-if="editing !== null && editing >= 0" variant="text" icon="delete" :disabled="busy" @click="remove">{{ T.remove }}</MButton>
        <MButton variant="text" @click="open = false">{{ S.cancel }}</MButton>
        <MButton icon="save" :loading="busy" :disabled="!check.ok || !changed" @click="save">{{ busy ? T.saving : T.save }}</MButton>
      </template>
    </MSheet>
  </div>
</template>
