<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import MButton from '../MButton.vue'
import MSheet from '../MSheet.vue'
import MField from '../MField.vue'
import MSeg from '../MSeg.vue'
import MSwitch from '../MSwitch.vue'
import MBanner from '../MBanner.vue'
import DevShotMask from '../devmode/DevShotMask.vue'
import { devReport, devProviders, closeDevReport } from '../devmode/devReport.js'
import { composeReport, reportZip } from '../../devmode/feedback.js'
import { addMine } from '../../devmode/mine.js'
import { devmodeTexts } from '../../devmode/texts.js'
import { userReportDocument } from '../../devmode/userReport.js'
import { referenceOf, reportIdOf, scrubText, submitReport, reportMessage } from '../../telemetry/index.js'
import { REPO_ISSUES_URL } from '../../telemetry/report.js'
import { feedbackTexts } from '../../feedback/texts.js'
import { FEEDBACK_TYPES, contextLine, feedbackPlan, layoutFor, phaseOf, titleOf } from '../../feedback/model.js'

// The ONE feedback panel. Every way in (the caption bar, the context menu, the error dialog, 帮助与关于, the tray, a recovered crash) opens it, and it has one way to send: directly and privately to the developers.
// It is a drawer from the right edge (the page stays in sight, scrollable, while the person writes) and a full-width panel from the bottom in a narrow window.
// A report always carries the run log (the host prepares it with the personal details removed): no switch for it, and pressing 发送 is the consent for this one send, whatever 问题自动上报 says.
// The screenshot is a row of its own only when the product can upload one (it registers uploadShot). The contact is optional, shown only in this report's one issue. Offline, the report is kept and sent by itself.
const props = defineProps({ locale: { type: String, default: 'zh' } })
const F = computed(() => feedbackTexts(props.locale))
const T = computed(() => devmodeTexts(props.locale))
const form = reactive({ type: 'other', text: '', contact: '' })
const include = reactive({ shot: true })
const phase = ref('edit') // edit | sending | done
const problem = ref('')
const touched = ref(false)
const previewOpen = ref(false)
const result = ref(null)
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine !== false)
const width = ref(typeof innerWidth === 'number' ? innerWidth : 1280)
const onOnline = () => { online.value = true }
const onOffline = () => { online.value = false }
const onResize = () => { width.value = innerWidth }
onMounted(() => { addEventListener('online', onOnline); addEventListener('offline', onOffline); addEventListener('resize', onResize) })
onBeforeUnmount(() => { removeEventListener('online', onOnline); removeEventListener('offline', onOffline); removeEventListener('resize', onResize) })

const isError = computed(() => devReport.kind === 'error' && !!devReport.error)
const plan = computed(() => feedbackPlan({ offline: !online.value, hasShot: !!devReport.shot, canSendShot: typeof devProviders().uploadShot === 'function' }))
const layout = computed(() => layoutFor(width.value))
const ctx = computed(() => contextLine({ page: devReport.context.page, element: devReport.context.element, error: isError.value ? devReport.error : null, texts: F.value }))
const typeOptions = computed(() => FEEDBACK_TYPES.map((value) => ({ value, label: F.value[{ bug: 'typeBug', suggestion: 'typeSuggestion', performance: 'typeImprove', other: 'typeOther' }[value]] })))
const productName = () => devProviders().product || (globalThis.isTauri ? 'panel' : 'web')
const pageToken = () => [devReport.context.page, devReport.context.place].filter(Boolean).join('-')
const doc = () => userReportDocument({ error: isError.value ? devReport.error : null, title: titleOf(form.text), description: form.text, type: form.type, product: productName(), page: pageToken(), contact: form.contact })
const needText = computed(() => touched.value && !form.text.trim())

watch(() => devReport.token, () => {
  form.type = isError.value ? 'bug' : 'other'; form.text = ''; form.contact = ''
  include.shot = true; phase.value = 'edit'; problem.value = ''; touched.value = false; previewOpen.value = false; result.value = null
})
const shotUrl = computed(() => (devReport.shot?.length ? URL.createObjectURL(new Blob([devReport.shot], { type: 'image/png' })) : ''))
const previewLines = computed(() => scrubText(String(devReport.logs || '').split('\n').slice(-12).join('\n'), 1500))
const previewText = computed(() => { const d = doc(); return d ? reportMessage(d) : '' })

async function send() {
  touched.value = true
  if (!form.text.trim()) return
  const d = doc()
  if (!d) return
  phase.value = 'sending'; problem.value = ''
  const p = devProviders()
  if (plan.value.shotRow && include.shot && devReport.shot) {
    try { const ref = await p.uploadShot(devReport.shot); if (ref) d.attachment = ref } catch { /* the report goes without it */ }
  }
  const id = reportIdOf(d)
  const answer = await submitReport(d, { id, explicit: true })
  const next = phaseOf(answer)
  phase.value = next.phase
  problem.value = next.problem || ''
  if (next.phase === 'done') {
    result.value = { kind: next.kind, ref: referenceOf(id).toUpperCase(), shot: !!d.attachment, contact: !!d.contact }
    addMine({ id, title: titleOf(form.text), status: next.kind === 'sent' ? 'sent' : 'queued', ref: result.value.ref })
  }
}
function saveZip() {
  const t = T.value
  const r = composeReport({ kind: 'feedback', repo: devReport.repo, title: titleOf(form.text) || F.value.title, description: form.text, contact: '', form: form.type === 'suggestion' ? 'feature' : 'bug', locale: props.locale, category: '', steps: '', error: devReport.error, env: devReport.env, logs: devReport.logs, screenshot: devReport.shot, shotRegions: { auto: devReport.shotAuto.length, manual: devReport.shotManual.length }, include: { shot: !!devReport.shot, logs: true, dump: false }, hostNames: devProviders().hostNames?.() || [], texts: { description: t.fContent, error: 'Error', environment: t.envTitle, logTail: t.aLogs, attached: t.attach, contact: t.fContact } })
  const zip = reportZip(r)
  Promise.resolve(devProviders().save?.(zip.name, zip.bytes, zip.mime)).catch(() => {})
  problem.value = ''
}
const openGithub = () => { const open = devProviders().openUrl; if (open) open(REPO_ISSUES_URL); else globalThis.open?.(REPO_ISSUES_URL, '_blank', 'noopener') }
const close = () => closeDevReport()
defineExpose({ send, form, doc, plan, layout })
</script>

<template>
  <MSheet :model-value="devReport.open" :title="F.title" side="end" :close-label="F.close" :persistent="phase === 'sending'" class="fb-panel" :class="`fb-panel--${layout}`" @update:model-value="(v) => { if (!v) close() }">
    <div v-if="phase === 'done'" class="fb-done" data-fb="done">
      <span class="fb-done__ico" :class="{ 'fb-done__ico--wait': result.kind === 'queued' }"><MIcon :name="result.kind === 'queued' ? 'schedule' : 'check'" /></span>
      <h3>{{ result.kind === 'queued' ? F.queuedTitle : F.sentTitle }}</h3>
      <p class="fb-done__ref">{{ F.refLabel }} <b data-fb="ref">#{{ result.ref }}</b></p>
      <p class="fb-done__text">{{ result.kind === 'queued' ? F.queuedText : F.sentText }}</p>
      <p class="fb-done__attached">{{ F.attached }}{{ [F.attachedText, F.attachedLogs, result.shot ? F.attachedShot : '', result.contact ? F.attachedContact : ''].filter(Boolean).join(' · ') }}</p>
      <MButton variant="filled" @click="close">{{ F.done }}</MButton>
    </div>
    <div v-else class="fb-body" data-fb="panel">
      <p class="fb-lead">{{ F.lead }}</p>
      <MBanner v-if="plan.banner === 'offline'" tone="warn" icon="cloud_off" data-fb="offline">{{ F.offline }}</MBanner>
      <div v-if="ctx" class="fb-ctx" data-fb="context"><MIcon name="touch_app" /><span>{{ ctx }}</span><small>{{ F.context }}</small></div>
      <MSeg v-model="form.type" size="sm" :label="F.typeLabel" :options="typeOptions" :disabled="phase === 'sending'" data-fb="type" />
      <MField v-model="form.text" type="textarea" :rows="4" :label="F.description" :supporting="isError ? `${F.descriptionHint}。${F.errorLead}` : F.descriptionHint" :error="needText ? F.descriptionRequired : ''" :disabled="phase === 'sending'" data-fb="text" />
      <section class="fb-attach">
        <h4>{{ F.attach }}</h4>
        <div class="fb-row" data-fb="logs">
          <span class="fb-thumb fb-thumb--ico"><MIcon name="description" /></span>
          <span class="fb-row__main"><b>{{ F.logsTitle }}</b><small>{{ F.logsText }}</small></span>
        </div>
        <div v-if="plan.shotRow" class="fb-row" data-fb="shot">
          <span class="fb-thumb"><img v-if="shotUrl" :src="shotUrl" alt="" /><MIcon v-else name="image" /></span>
          <span class="fb-row__main"><b>{{ F.shotTitle }}</b><small>{{ F.shotText }}</small></span>
          <MSwitch v-model="include.shot" :label="F.shotTitle" :disabled="phase === 'sending'" />
        </div>
        <MButton variant="text" size="sm" :icon="previewOpen ? 'visibility_off' : 'visibility'" class="fb-previewbtn" data-fb="preview-toggle" @click="previewOpen = !previewOpen">{{ previewOpen ? F.previewHide : F.preview }}</MButton>
        <div v-if="previewOpen" class="fb-preview" data-fb="preview">
          <h5>{{ F.previewText }}</h5>
          <pre>{{ previewText || '—' }}</pre>
          <template v-if="pageToken()"><h5>{{ F.previewPage }}</h5><pre>{{ pageToken() }}</pre></template>
          <template v-if="form.contact.trim()"><h5>{{ F.previewContact }}</h5><pre>{{ form.contact.trim() }}</pre></template>
          <h5>{{ F.previewLogs }}</h5>
          <p class="fb-preview__note">{{ F.previewLogsNote }}</p>
          <pre>{{ previewLines || F.previewNone }}</pre>
          <DevShotMask v-if="plan.shotRow && include.shot && devReport.shot" :locale="locale" />
        </div>
      </section>
      <MField v-model="form.contact" :label="F.contact" :supporting="F.contactHint" :disabled="phase === 'sending'" data-fb="contact" />
      <MBanner v-if="problem" tone="warn" icon="error" data-fb="problem">
        {{ F[problem] || F.rejected }}
      </MBanner>
      <div class="fb-links">
        <MButton variant="text" size="sm" icon="download" data-fb="zip" :title="F.saveZipHint" @click="saveZip">{{ F.saveZip }}</MButton>
        <MButton variant="text" size="sm" icon="open_in_new" data-fb="github" @click="openGithub">{{ F.github }}</MButton>
      </div>
    </div>
    <template v-if="phase !== 'done'" #actions>
      <MButton variant="text" :disabled="phase === 'sending'" @click="close">{{ F.cancel }}</MButton>
      <MButton :icon="plan.sendMode === 'queue' ? 'schedule' : 'send'" :loading="phase === 'sending'" data-fb="send" @click="send">{{ phase === 'sending' ? F.sending : plan.sendMode === 'queue' ? F.sendQueue : F.send }}</MButton>
    </template>
  </MSheet>
</template>

<style>
/* the drawer: a sheet from the right edge. The product's side sheets are centred dialogs (expressive.css `.m-sheet--end { margin: auto }`); the feedback panel keeps the page in sight and in reach, so it sits at the edge */
.m-sheet.fb-panel--drawer { margin: 0 0 0 auto; width: min(460px, 100vw); height: 100dvh; max-height: none; }
.m-sheet.fb-panel--drawer .m-sheet__panel { height: 100%; max-height: none; border-radius: 28px 0 0 28px; animation: m-sheet-end var(--m-spring-default-spatial-duration) var(--m-spring-default-spatial) both; }
.m-sheet.fb-panel--drawer .m-sheet__body { flex: 1; min-height: 0; overflow: auto; }
/* a narrow window: full width from the bottom */
.m-sheet.fb-panel--bottom { margin: auto 0 0; width: 100%; height: fit-content; max-height: 90dvh; }
.m-sheet.fb-panel--bottom .m-sheet__panel { height: auto; max-height: 90dvh; border-radius: 28px 28px 0 0; animation: m-sheet-bottom var(--m-spring-default-spatial-duration) var(--m-spring-default-spatial) both; }
.m-sheet.fb-panel--bottom .m-sheet__body { overflow: auto; }
.fb-body { display: flex; flex-direction: column; gap: 14px; }
.fb-lead { margin: 0; font: var(--m-body-medium); color: var(--md-sys-color-on-surface-variant); }
.fb-ctx { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px 0 10px; width: fit-content; max-width: 100%; border-radius: 18px; background: var(--md-sys-color-surface-container-high); font: var(--m-label-large); }
.fb-ctx .m-icon { font-size: 18px; width: 18px; height: 18px; color: var(--md-sys-color-primary); flex: none; }
.fb-ctx span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fb-ctx small { font: var(--m-label-small); color: var(--md-sys-color-on-surface-variant); margin-left: 4px; flex: none; }
.fb-attach { display: flex; flex-direction: column; gap: 6px; }
.fb-attach h4 { margin: 4px 0 2px; font: var(--m-title-small); color: var(--md-sys-color-on-surface-variant); }
.fb-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 10px; border-radius: 20px; background: var(--m-card); }
.fb-thumb { width: 64px; height: 44px; border-radius: 12px; overflow: hidden; flex: none; display: grid; place-items: center; background: var(--md-sys-color-surface-container-highest); color: var(--md-sys-color-on-surface-variant); }
.fb-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
.fb-thumb--ico { width: 44px; border-radius: 22px; }
.fb-row__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.fb-row__main b { font: var(--m-title-small); }
.fb-row__main small { font: var(--m-body-small); color: var(--md-sys-color-on-surface-variant); }
.fb-previewbtn { align-self: flex-start; }
.fb-preview { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 20px; background: var(--m-card); }
.fb-preview h5 { margin: 6px 0 0; font: var(--m-label-large); color: var(--md-sys-color-on-surface-variant); }
.fb-preview pre { margin: 0; white-space: pre-wrap; word-break: break-word; font: var(--m-body-small); font-family: var(--m-font-mono); }
.fb-preview__note { margin: 0; font: var(--m-body-small); color: var(--md-sys-color-on-surface-variant); }
.fb-links { display: flex; flex-wrap: wrap; gap: 4px 8px; }
.fb-links .m-btn { color: var(--md-sys-color-on-surface-variant); }
.fb-done { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 12px 8px; text-align: center; }
.fb-done__ico { width: 64px; height: 64px; border-radius: 32px; display: grid; place-items: center; background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
.fb-done__ico--wait { background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); }
.fb-done__ico .m-icon { font-size: 32px; width: 32px; height: 32px; }
.fb-done h3 { margin: 6px 0 0; font: var(--m-headline-small); }
.fb-done__ref { margin: 0; font: var(--m-body-large); }
.fb-done__ref b { font-family: var(--m-font-mono); }
.fb-done__text, .fb-done__attached { margin: 0; max-width: 38ch; text-wrap: balance; font: var(--m-body-medium); color: var(--md-sys-color-on-surface-variant); }
</style>
