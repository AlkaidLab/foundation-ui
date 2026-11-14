<script setup>
import { computed, ref, watch } from 'vue'
import MPage from './MPage.vue'
import MGroup from './MGroup.vue'
import MItem from './MItem.vue'
import MChip from './MChip.vue'
import MIcon from './MIcon.vue'
import MSeg from './MSeg.vue'
import MButton from './MButton.vue'
import MDialog from './MDialog.vue'
import { actionConfirm, availableActions, layerRows, serviceTexts, startTypeConfirm, startTypeOptions, verdictOf } from '../service/model.js'

// 系统 › Sunshine 服务: the verdict, then the three layers on their own rows (Windows service, host process, host API) with the facts of each,
// the start type of the Windows service, and start, stop and restart. Every change asks first: start, stop and restart say whether a stream is
// live and what stopping means for a remote person; Manual and Disabled say that the host is not reachable after a reboot. The page only draws
// and emits; the product runs the change (with administrator approval) and passes the next status.
const props = defineProps({
  /** the answer of the product's status read ({ verdict, failingLayer, scm, process, api, liveStreams }), null while reading */
  status: { type: Object, default: null },
  locale: { type: String, default: 'en' },
  /** the change in progress: 'start' | 'stop' | 'restart' | 'start-type' | '' */
  busy: { type: String, default: '' },
  refreshing: { type: Boolean, default: false },
  /** when the status was read (ms since epoch): the page's "updated" stamp */
  readAt: { type: Number, default: 0 },
})
const emit = defineEmits(['refresh', 'action', 'start-type'])
const T = computed(() => serviceTexts(props.locale))
const verdict = computed(() => verdictOf(props.status, T.value))
const rows = computed(() => layerRows(props.status, T.value, props.locale))
const can = computed(() => availableActions(props.status))
const manageable = computed(() => !!props.status?.scm?.installed && !!props.status?.scm?.belongsToInstall)
const TONE_ICON = { ok: 'check_circle', info: 'info', warn: 'warning', error: 'error', neutral: 'radio_button_unchecked' }

// the start type control shows the SCM value; a choice that needs confirmation waits for it and falls back on cancel
const chosen = ref('')
watch(() => props.status?.scm?.startType, (value) => { chosen.value = value || '' }, { immediate: true })
const ask = ref(null)
const open = computed({ get: () => !!ask.value, set: (v) => { if (!v) cancel() } })
function cancel() { ask.value = null; chosen.value = props.status?.scm?.startType || '' }
function pickStartType(value) {
  if (!value || value === props.status?.scm?.startType) return
  const confirm = startTypeConfirm(value, T.value)
  if (confirm) ask.value = { kind: 'start-type', value, ...confirm, danger: true }
  else emit('start-type', value, false)
}
function askAction(kind) { ask.value = { kind, ...actionConfirm(kind, props.status, T.value) } }
function confirm() {
  const a = ask.value
  ask.value = null
  if (!a) return
  if (a.kind === 'start-type') emit('start-type', a.value, true)
  else emit('action', a.kind, !!a.acknowledgeLiveStream)
}
</script>

<template>
  <MPage :title="T.title" class="m-svc" :updated="readAt" :refreshing="refreshing" refreshable :locale="locale" @refresh="emit('refresh')">
    <template #actions><MButton variant="text" icon="refresh" :loading="refreshing" @click="emit('refresh')">{{ T.actions.refresh }}</MButton></template>
    <section class="m-svc__verdict" :class="`m-svc__verdict--${verdict.tone}`" :data-verdict="status?.verdict || 'unknown'">
      <MIcon :name="verdict.icon" fill />
      <div><h3>{{ verdict.title }}</h3><p v-if="verdict.text">{{ verdict.text }}</p></div>
    </section>

    <MGroup spaced>
      <article v-for="row in rows" :key="row.id" class="m-svc__layer" :data-layer="row.id" :data-tone="row.tone">
        <header class="m-svc__head">
          <MIcon :name="row.icon" />
          <span class="m-svc__name">{{ row.title }}</span>
          <MChip :tone="row.tone" :icon="TONE_ICON[row.tone]">{{ row.value }}</MChip>
        </header>
        <dl v-if="row.facts.length" class="m-svc__facts">
          <template v-for="[label, value] in row.facts" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></template>
        </dl>
      </article>
    </MGroup>

    <MGroup v-if="manageable">
      <MItem stack :title="T.startType" :text="T.startTypeNote">
        <MSeg :model-value="chosen" :options="startTypeOptions(T)" :label="T.startType" :disabled="!!busy" block size="sm" @update:model-value="(v) => { chosen = v; pickStartType(v) }" />
      </MItem>
      <MItem stack :title="T.control">
        <div class="m-svc__actions">
          <MButton variant="tonal" icon="play_arrow" :disabled="!can.start || !!busy" :loading="busy === 'start'" @click="askAction('start')">{{ T.actions.start }}</MButton>
          <MButton variant="tonal" icon="restart_alt" :disabled="!can.restart || !!busy" :loading="busy === 'restart'" @click="askAction('restart')">{{ T.actions.restart }}</MButton>
          <MButton variant="outlined" icon="stop" :disabled="!can.stop || !!busy" :loading="busy === 'stop'" @click="askAction('stop')">{{ T.actions.stop }}</MButton>
        </div>
      </MItem>
    </MGroup>

    <MDialog v-model="open" :title="ask?.title || ''" icon="warning" :tone="ask?.danger ? 'error' : 'warning'">
      <p v-for="(line, i) in String(ask?.text || '').split('\n\n')" :key="i">{{ line }}</p>
      <template #actions>
        <MButton variant="text" @click="cancel">{{ T.cancel }}</MButton>
        <MButton :variant="ask?.danger ? 'danger' : 'filled'" @click="confirm">{{ ask?.action }}</MButton>
      </template>
    </MDialog>
  </MPage>
</template>

<style>
.m-svc__verdict { display: flex; gap: 12px; align-items: flex-start; padding: 16px; margin-bottom: 12px; border-radius: 24px; background: var(--m-card); color: var(--md-sys-color-on-surface); }
.m-svc__verdict h3 { margin: 0; font: var(--m-title-medium); }
.m-svc__verdict p { margin: 2px 0 0; font: var(--m-body-small); color: var(--md-sys-color-on-surface-variant); }
.m-svc__verdict--ok > .m-icon { color: var(--md-sys-color-success); }
.m-svc__verdict--warn > .m-icon { color: var(--md-sys-color-warning); }
.m-svc__verdict--error > .m-icon { color: var(--md-sys-color-error); }
.m-svc__verdict--info > .m-icon { color: var(--md-sys-color-primary-text, var(--md-sys-color-primary)); }
.m-svc__layer { padding: 12px 16px; border-radius: 24px; background: var(--m-card); }
.m-svc__head { display: flex; align-items: center; gap: 10px; }
.m-svc__name { flex: 1; font: var(--m-title-small); }
.m-svc__facts { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 10px 0 0 34px; font: var(--m-body-small); }
.m-svc__facts dt { color: var(--md-sys-color-on-surface-variant); }
.m-svc__facts dd { margin: 0; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.m-svc__actions { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
