<script setup>
import { computed, reactive, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import MButton from '../MButton.vue'
import MSheet from '../MSheet.vue'
import MField from '../MField.vue'
import MSeg from '../MSeg.vue'
import MSwitch from '../MSwitch.vue'
import MBanner from '../MBanner.vue'
import DevShotMask from './DevShotMask.vue'
import { DEFAULT_REPO } from '../../devmode/repos.js'
import { composeReport, reportZip, sizeLabel } from '../../devmode/feedback.js'
import { addMine } from '../../devmode/mine.js'
import { devmodeTexts, fillText } from '../../devmode/texts.js'
import { devReport, devProviders, closeDevReport } from './devReport.js'
import { readErrors, reportIdOf, submitReport } from '../../telemetry/index.js'
import { userReportDocument } from '../../devmode/userReport.js'
import { ERRORS_REQUEST_EVENT } from '../useTelemetryConsent.js'

// F1 (an error) and F2 (feedback) in one sheet. Everything that rides along is shown, redacted, before anything leaves: the screenshot and the log are attached by default for an error (the person can untick),
// the crash dump never by default. Two ways out: the report goes privately to the developers' own server as one user_report event (telemetry-v1-spec; no public issue is ever created, no account is needed), or the zip is saved on this computer
// (nothing is sent, no page opens). The screenshot and the log only ever go into the zip.
const props = defineProps({ locale: { type: String, default: 'zh' } })
const T = computed(() => devmodeTexts(props.locale))
const providers = devProviders

const isError = computed(() => devReport.kind === 'error')
const form = reactive({ title: '', description: '', contact: '', type: 'bug' })
// the type the person picks (问题/崩溃, 功能建议, 体验改进, 其他) is the category of the user_report event: bug, suggestion, performance, other
const typeOptions = computed(() => [{ value: 'bug', label: T.value.typeBug }, { value: 'suggestion', label: T.value.typeSuggestion }, { value: 'performance', label: T.value.typeImprove }, { value: 'other', label: T.value.typeOther }])
const repo = ref(DEFAULT_REPO)
const include = reactive({ shot: true, logs: true, dump: false })
const dest = ref('ours')
// 以后自动发送: error reports on or off. Checked while they are on (the default); what the box says when the report is sent becomes the setting.
const autoSend = ref(readErrors() === 'on')
watch(() => devReport.open, (open) => { if (open) autoSend.value = readErrors() === 'on' })
const phase = ref('edit') // edit | sending | done
const showPreview = ref(false)
const touched = ref(false)
const result = ref(null)

watch(() => devReport.token, () => {
  form.title = devReport.draft.title || (devReport.error ? `${devReport.error.name || 'Error'}: ${devReport.error.message || ''}`.slice(0, 100) : '')
  form.description = devReport.draft.description || ''
  form.contact = ''
  form.type = isError.value ? 'bug' : 'other'
  include.shot = !!devReport.shot && (isError.value || false)
  include.logs = isError.value
  include.dump = false
  dest.value = 'ours'
  phase.value = 'edit'
  showPreview.value = false
  touched.value = false
  result.value = null
})

const hostNames = computed(() => providers().hostNames?.() || [])
const report = computed(() => composeReport({
  kind: devReport.kind, repo: repo.value, title: form.title, description: form.description, contact: '', form: form.type === 'suggestion' ? 'feature' : 'bug', locale: props.locale, category: '', steps: '', error: devReport.error, env: devReport.env, logs: devReport.logs,
  screenshot: devReport.shot, shotRegions: { auto: devReport.shotAuto.length, manual: devReport.shotManual.length }, include, hostNames: hostNames.value,
  texts: { description: T.value.fContent, error: 'Error', environment: T.value.envTitle, logTail: T.value.aLogs, attached: T.value.attach, contact: T.value.fContact },
}))
const countsText = computed(() => {
  const c = report.value.counts
  const parts = [[c.ips, T.value.rIps], [c.paths, T.value.rPaths], [c.names, T.value.rNames], [c.secrets, T.value.rSecrets], [c.serials, T.value.rSerials], [c.regions, T.value.rRegions]].filter(([n]) => n)
  return report.value.total ? `${fillText(T.value.redacted, { n: report.value.total })} · ${parts.map(([n, w]) => `${n} ${w}`).join(' · ')}` : T.value.redactedNone
})
const problems = computed(() => (touched.value ? report.value.problems : []))
const rows = computed(() => [
  { id: 'shot', icon: 'screenshot_monitor', title: T.value.aShot, sub: devReport.shot ? `${T.value.aShotSub} · ${sizeLabel(devReport.shot.length)}` : devReport.shotMaskFailed ? T.value.maskFailed : T.value.aUnavailable, disabled: !devReport.shot, note: T.value.aShotNote, auto: !!devReport.shot },
  { id: 'logs', icon: 'description', title: T.value.aLogs, sub: devReport.logs ? `${T.value.aLogsSub} · ${sizeLabel(new TextEncoder().encode(devReport.logs.slice(-160000)).length)}` : T.value.aEmpty, disabled: !devReport.logs, auto: true },
  { id: 'dump', icon: 'memory', title: T.value.aDump, sub: T.value.aDumpSub, disabled: true, risk: true },
])
const destinations = computed(() => [
  { id: 'ours', icon: 'lock', title: T.value.destOurs, sub: T.value.destOursSub },
  { id: 'local', icon: 'download', title: T.value.destSaveZip, sub: T.value.destSaveZipSub },
])
const pickDest = (d) => { dest.value = d.id }
const sendLabel = computed(() => (dest.value === 'local' ? T.value.sendSaveZip : T.value.send))
const bodyText = computed(() => `${report.value.title}\n\n${report.value.body}`)

// the document of a report for the host (devmode/userReport.js): what the person wrote and a summary of the error; the screenshot and the log never leave in it
const userReportDoc = () => userReportDocument({ error: isError.value ? devReport.error : null, title: form.title, description: form.description, type: form.type, product: devProviders().product || (globalThis.isTauri ? 'panel' : 'web') })

async function send() {
  touched.value = true
  if (report.value.problems.length) return
  phase.value = 'sending'
  if (isError.value && (autoSend.value ? 'on' : 'off') !== readErrors()) { try { window.dispatchEvent(new CustomEvent(ERRORS_REQUEST_EVENT, { detail: autoSend.value ? 'on' : 'off' })) } catch { /* no window */ } }
  const r = report.value
  const p = providers()
  let out
  if (dest.value === 'local') {
    const zip = reportZip(r)
    try { await p.save?.(zip.name, zip.bytes, zip.mime) } catch { /* the product says it could not save */ }
    addMine({ title: r.title, repo: r.repo, status: 'saved' })
    out = { state: 'local', name: zip.name }
  } else if (readErrors() === 'off') {
    // a report follows the error-report choice like every error event: with it off nothing is requested
    out = { state: 'errorsoff' }
  } else {
    const doc = userReportDoc()
    const answer = doc ? await submitReport(doc, { id: reportIdOf(doc) }) : { state: 'rejected' }
    out = { state: answer.state === 'sent' ? 'sent_ours' : answer.state }
    if (out.state === 'queued') addMine({ title: r.title, repo: r.repo, status: 'queued' })
  }
  result.value = out
  phase.value = ['local', 'sent_ours', 'queued'].includes(out.state) ? 'done' : 'edit'
}
const failText = computed(() => {
  const s = result.value?.state
  return s === 'limited' ? T.value.limited : s === 'errorsoff' ? T.value.errorsOff : s === 'rejected' ? T.value.rejected : ''
})
const doneTitle = computed(() => (result.value?.state === 'queued' ? T.value.queuedTitle : result.value?.state === 'local' ? T.value.savedTitle : T.value.sentTitle))
const doneText = computed(() => {
  const s = result.value
  if (!s) return ''
  if (s.state === 'sent_ours') return T.value.sentOurs
  if (s.state === 'queued') return T.value.queuedText
  return T.value.sentLocal2
})
async function copyText() { try { await navigator.clipboard.writeText(bodyText.value) } catch { /* the browser refused */ } }
function download() { const zip = reportZip(report.value); providers().save?.(zip.name, zip.bytes, zip.mime) }
defineExpose({ report, send, dest, include, form, userReportDoc })
</script>

<template>
  <MSheet :model-value="devReport.open" :title="isError ? T.errTitle : T.fbTitle" side="center" :close-label="T.close" :persistent="phase === 'sending'" class="dm-report" @update:model-value="(v) => { if (!v) closeDevReport() }">
    <div v-if="phase === 'done'" class="dm-done" data-dev="report-done">
      <span class="dm-done__ico"><MIcon :name="result.state === 'queued' ? 'schedule' : 'check'" /></span>
      <h3>{{ doneTitle }}</h3>
      <p>{{ doneText }}</p>
      <span v-if="result.state === 'local'" class="dm-done__ref">{{ result.name }}</span>
      <MButton variant="filled" @click="closeDevReport">{{ T.done }}</MButton>
    </div>
    <div v-else class="dm-report__body" data-dev="report">
      <p class="dm-report__lead">{{ isError ? T.errLead : T.fbLead }}</p>
      <div v-if="isError && devReport.error" class="dm-sum">
        <MIcon name="error" fill />
        <div><b>{{ devReport.error.name || 'Error' }}</b><span>{{ devReport.error.message }}{{ devReport.error.code ? ` · ${devReport.error.code}` : '' }}</span></div>
      </div>
      <MBanner v-if="failText" tone="warn" icon="error">{{ failText }}</MBanner>

      <MField v-model="form.title" :label="T.fSubject" :supporting="T.fSubjectHint" :error="problems.includes('title') ? T.mustTitle : ''" :disabled="phase === 'sending'" data-dev="report-title" />
      <MField v-model="form.description" type="textarea" :rows="4" :label="T.fContent" :supporting="T.fContentHint" :error="problems.includes('description') ? T.mustDesc : ''" :disabled="phase === 'sending'" data-dev="report-desc" />

      <div class="dm-field">
        <span class="dm-field__l">{{ T.typeLabel }}</span>
        <MSeg v-model="form.type" size="sm" :label="T.typeLabel" :options="typeOptions" :disabled="phase === 'sending'" data-dev="report-type" />
      </div>

      <div v-if="dest === 'local'" class="dm-field">
        <span class="dm-field__l">{{ T.attach }}</span>
        <div v-for="a in rows" :key="a.id" class="dm-attach" :class="{ 'dm-attach--off': !include[a.id] }" :data-dev="`attach-${a.id}`">
          <MIcon :name="a.icon" />
          <span class="dm-attach__main">
            <span class="dm-attach__t">{{ a.title }}</span>
            <span class="dm-attach__s">{{ a.sub }}<span v-if="a.risk" class="dm-chip-hi"><MIcon name="warning" fill />{{ T.aRisk }}</span><span v-else-if="a.auto && include[a.id]" class="dm-chip-ok"><MIcon name="shield" fill />{{ T.aAuto }}</span></span>
          </span>
          <MSwitch v-model="include[a.id]" :label="a.title" :disabled="a.disabled || phase === 'sending'" />
        </div>
        <DevShotMask v-if="include.shot && devReport.shot" :locale="locale" />
        <p v-else-if="devReport.shotMaskFailed" class="dm-note"><MIcon name="warning" fill /><span>{{ T.maskFailed }}</span></p>
      </div>

      <p v-if="dest === 'ours' && (devReport.shot || devReport.logs)" class="dm-note" data-dev="report-files-note"><MIcon name="info" fill /><span>{{ T.attachLocalOnly }}</span></p>

      <div class="dm-sum dm-sum--ok" data-dev="report-redaction"><MIcon name="shield" fill /><div><b>{{ countsText }}</b></div></div>

      <div class="dm-field">
        <div class="dm-bar">
          <button type="button" class="dm-fchip dm-previewbtn" :aria-pressed="showPreview" @click="showPreview = !showPreview"><MIcon name="visibility" />{{ showPreview ? T.previewHide : T.preview }}</button>
          <span class="dm-spacer" />
          <MButton variant="text" size="sm" icon="content_copy" @click="copyText">{{ T.copyText }}</MButton>
          <MButton variant="text" size="sm" icon="download" @click="download">{{ T.download }}</MButton>
        </div>
        <div v-if="showPreview" class="dm-preview" data-dev="report-preview">
          <p class="dm-dim">{{ T.previewNote }}</p>
          <pre class="dm-code">{{ bodyText }}</pre>
          <ul class="dm-files"><li v-for="f in report.files" :key="f.name"><MIcon :name="f.id === 'shot' ? 'image' : 'description'" /><span>{{ f.name }}</span><small>{{ sizeLabel(f.size) }}</small></li></ul>
        </div>
      </div>

      <div class="dm-field">
        <span class="dm-field__l">{{ T.dest }}</span>
        <div class="dm-dest">
          <button v-for="d in destinations" :key="d.id" type="button" class="dm-radio" role="radio" :aria-checked="dest === d.id" :data-dev="`dest-${d.id}`" @click="pickDest(d)">
            <MIcon :name="d.icon" />
            <span class="dm-radio__main"><span class="dm-radio__t">{{ d.title }}</span><span class="dm-radio__s">{{ d.sub }}</span></span>
            <span v-if="d.off" class="dm-chip-off">{{ T.notConfigured }}</span>
            <MIcon v-if="dest === d.id" class="dm-radio__ok" name="check_circle" fill />
          </button>
        </div>
      </div>
    </div>
    <template v-if="phase !== 'done'" #actions>
      <label v-if="phase !== 'done' && isError" class="dm-auto dm-auto--foot" data-dev="report-auto"><input v-model="autoSend" type="checkbox" :disabled="phase === 'sending'">{{ T.autoSend }}</label>
      <span class="dm-spacer" />
      <MButton variant="text" :disabled="phase === 'sending'" @click="closeDevReport">{{ T.cancel }}</MButton>
       <MButton :icon="dest === 'local' ? 'download' : 'send'" :loading="phase === 'sending'" data-dev="report-send" @click="send">{{ phase === 'sending' ? T.sending : sendLabel }}</MButton>
    </template>
  </MSheet>
</template>
