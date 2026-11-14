<script setup>
import { computed, ref, watch } from 'vue'
import MSheet from './MSheet.vue'
import MIcon from './MIcon.vue'
import MChip from './MChip.vue'
import MButton from './MButton.vue'
import MBanner from './MBanner.vue'
import MProgress from './MProgress.vue'
import MFooter from './MFooter.vue'
import { previewNotes } from '../update/notes.js'
import { displayVersion } from '../update/versions.js'
import { formatBytes, formatText, phaseShape, stepsFor, updateTexts } from '../update/model.js'

// The update popup: current -> new version with a badge whose shape morphs with the phase (checking, available,
// downloading, ready, installing), the channel, a driver notice taken from the release notes, a short plain-text notes
// block that expands in place, the wavy download progress, the three steps (download, install, restart) and the actions.
//
// The sheet shows state and emits intents. The product owns the data and the actions:
//   phase      checking | available | downloading | ready | installing | latest | error
//   notes      result of parseReleaseNotes (plain text only; it is printed with text interpolation, never as HTML)
//   drivers    result of detectDriverNotes (or null)
//   progress   0..1 while downloading (null = not known yet), with downloaded/total bytes, the source name and the
//              download phase (connecting | downloading | retrying | verifying | complete)
//   canInstall false for a product that cannot install by itself (the Web UI): the primary action then only opens the
//              release page, and the sheet says so; `linkNote="via-panel"` says the Control Panel does the work instead
// Slots: `channels` (above the badge, e.g. a channel switch) and `notice` (below it, product notices).
// Emits: update (primary action on `available`), restart (primary action on `ready`), later, skip, retry, open-release.
const open = defineModel({ type: Boolean, default: false })
const props = defineProps({
  phase: { type: String, default: 'available' },
  current: { type: String, default: '' },
  next: { type: String, default: '' },
  channel: { type: String, default: '' }, // stable | prerelease | ''
  notes: { type: Object, default: null },
  drivers: { type: Object, default: null },
  progress: { type: Number, default: null },
  downloaded: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  source: { type: String, default: '' },
  downloadPhase: { type: String, default: '' },
  installStage: { type: String, default: '' },
  installDetail: { type: String, default: '' },
  waitHint: { type: String, default: '' },
  errorText: { type: String, default: '' },
  errorStep: { type: String, default: 'download' },
  mirrorHost: { type: String, default: '' }, // the release information came from this mirror
  canInstall: { type: Boolean, default: true },
  linkNote: { type: String, default: '' }, // '' | 'via-panel'  (what the Web UI says when the Control Panel does the work)
  hasReleasePage: { type: Boolean, default: true },
  canSkip: { type: Boolean, default: true },
  /** the primary action was handed to another program and has not answered yet */
  pending: { type: Boolean, default: false },
  locale: { type: String, default: 'en' },
  texts: { type: Object, default: () => ({}) },
  closeLabel: { type: String, default: '' },
})
const emit = defineEmits(['update', 'restart', 'later', 'skip', 'retry', 'open-release', 'open-changelog'])

const tx = computed(() => updateTexts(props.locale, props.texts))
const shape = computed(() => phaseShape(props.phase))
// A download runs in the native task after the sheet closes; only an install
// holds the sheet, because the installer is about to close the panel.
const busy = computed(() => props.phase === 'installing')
const title = computed(() => tx.value[`title${props.phase[0].toUpperCase()}${props.phase.slice(1)}`] || tx.value.titleAvailable)

const showVersions = computed(() => props.phase !== 'checking' && (props.next || props.current))
// the three steps appear once the person has pressed the update button
const showSteps = computed(() => ['downloading', 'ready', 'installing', 'error'].includes(props.phase) && props.canInstall)
const steps = computed(() => stepsFor(props.phase, { installStage: props.installStage, failedStep: props.errorStep }))
const stepHint = (step) => {
  if (step.status === 'pending' && props.phase !== 'available') return ''
  if (step.key === 'download') return (props.source ? formatText(tx.value.stepDownloadHint, { source: props.source }) : tx.value.stepDownloadHintPlain)
  return tx.value[step.key === 'install' ? 'stepInstallHint' : 'stepRestartHint']
}
const activeHint = computed(() => {
  const step = steps.value.find((entry) => entry.status === 'active' || entry.status === 'failed') || steps.value.find((entry) => entry.status === 'pending')
  return step && props.phase !== 'available' ? stepHint(step) : ''
})

const percent = computed(() => (props.progress == null ? null : Math.round(Math.min(1, Math.max(0, props.progress)) * 100)))
const progressLine = computed(() => {
  if (props.downloadPhase === 'connecting') return tx.value.phaseConnecting
  if (props.downloadPhase === 'retrying') return tx.value.phaseRetrying
  if (props.downloadPhase === 'verifying') return tx.value.phaseVerifying
  if (props.downloadPhase === 'complete') return tx.value.phaseComplete
  const parts = []
  if (percent.value != null) parts.push(formatText(tx.value.progress, { percent: percent.value }))
  if (props.total > 0) parts.push(formatText(tx.value.sizeOf, { done: formatBytes(props.downloaded), total: formatBytes(props.total) }))
  return parts.join('  ·  ')
})

// Notes: a compact view that expands in place; the full text of a very long note stays on the release page.
const expanded = ref(false)
watch(() => [open.value, props.next], () => { expanded.value = false })
const noteLines = computed(() => props.notes?.lines || [])
const preview = computed(() => previewNotes(props.notes, { maxLines: 5, maxChars: 360 }))
const shownLines = computed(() => (expanded.value ? noteLines.value : preview.value.lines))
const hiddenCount = computed(() => noteLines.value.length - preview.value.lines.length)
// a mention of components in the notes is one plain line in the notes, not a block of its own
const componentLine = computed(() => (props.drivers?.found && !props.drivers.driver ? [tx.value.componentMention, ...(props.drivers.items || []).map((item) => item.text)].join(' · ') : ''))
const hasNotes = computed(() => !!(props.notes && (props.notes.title || noteLines.value.length)) || !!componentLine.value)

const driverTitle = computed(() => {
  const d = props.drivers
  if (!d?.found) return ''
  if (!d.driver) return tx.value.componentMention
  return d.level === 'caution' ? tx.value.driverCaution : d.level === 'update' ? tx.value.driverUpdate : tx.value.driverMention
})
// a driver that needs care is the tertiary container (the theme's own accent), never a yellow block
const driverTone = computed(() => (props.drivers?.driver ? 'tertiary' : 'info'))

const doesTheWork = computed(() => props.canInstall || props.linkNote === 'via-panel')
const primaryLabel = computed(() => (props.phase === 'ready' ? tx.value.restartNow : doesTheWork.value ? tx.value.updateNow : tx.value.download))
const primaryIcon = computed(() => (props.phase === 'ready' ? 'restart_alt' : doesTheWork.value ? 'download' : 'open_in_new'))
const onPrimary = () => emit(props.phase === 'ready' ? 'restart' : 'update')
const close = () => { open.value = false }
const later = () => { emit('later'); close() }
const skip = () => { emit('skip'); close() }
</script>

<template>
  <MSheet v-model="open" class="m-update" :title="title" side="center" :persistent="busy" :close-label="closeLabel || tx.close">
    <div class="m-update__body" :data-phase="phase">
      <slot name="channels" />
      <section class="m-update__hero">
        <div class="m-update__badge" :class="`m-update__badge--${shape.tone}`" aria-hidden="true">
          <span class="m-update__shape m-shape" :class="`m-shape--${shape.shape}`" />
          <MIcon class="m-update__badge-icon" :class="{ 'is-spinning': phase === 'checking' || phase === 'installing' }" :name="shape.icon" fill />
        </div>
        <div v-if="showVersions" class="m-update__versions">
          <div v-if="current" class="m-update__version">
            <small>{{ tx.current }}</small>
            <b>{{ displayVersion(current) }}</b>
          </div>
          <MIcon v-if="current && next && phase !== 'latest'" class="m-update__arrow" name="chevron_right" />
          <div v-if="next" class="m-update__version m-update__version--next">
            <small>{{ phase === 'latest' ? tx.current : tx.next }}</small>
            <b>{{ displayVersion(next) }}</b>
          </div>
        </div>
        <p v-else-if="phase === 'checking'" class="m-update__hint">{{ tx.checkingHint }}</p>
        <div v-if="channel || (source && phase !== 'available') || mirrorHost" class="m-update__chips">
          <MChip v-if="channel === 'stable'" tone="ok" icon="verified">{{ tx.channelStable }}</MChip>
          <MChip v-else-if="channel === 'prerelease'" tone="tertiary" icon="science">{{ tx.channelPrerelease }}</MChip>
          <MChip v-if="source && phase !== 'available'" icon="cloud">{{ formatText(tx.source, { source }) }}</MChip>
          <MChip v-if="mirrorHost" tone="info" icon="language">{{ tx.mirrorChip }}</MChip>
        </div>
      </section>

      <slot name="notice" />
      <MBanner v-if="phase === 'error' && errorText" tone="error" icon="error">{{ errorText }}</MBanner>

      <MBanner v-if="drivers?.found && drivers.driver && (phase === 'available' || phase === 'ready')" class="m-update__driver" :tone="driverTone" :icon="drivers.driver ? 'memory' : 'extension'">
        <b class="m-update__driver-title">{{ driverTitle }}</b>
        <ul class="m-update__driver-list">
          <li v-for="item in drivers.items" :key="item.text" :class="`is-${item.level}`">{{ item.text }}</li>
        </ul>
        <small>{{ tx.driverFrom }}</small>
      </MBanner>

      <section v-if="phase === 'downloading'" class="m-update__progress" :aria-label="tx.stepDownload">
        <MProgress :value="progress" :label="progressLine || tx.working" />
        <p class="m-update__progress-line">{{ progressLine || tx.working }}</p>
        <p class="m-update__step-hint">{{ tx.backgroundHint }}</p>
      </section>

      <ol v-if="showSteps" class="m-update__steps">
        <li v-for="(step, index) in steps" :key="step.key" class="m-update__step" :class="`is-${step.status}`">
          <span class="m-update__step-dot">
            <MIcon v-if="step.status === 'done'" name="check_circle" fill />
            <MIcon v-else-if="step.status === 'failed'" name="error" fill />
            <i v-else-if="step.status === 'active'" class="m-update__step-live" />
            <b v-else>{{ index + 1 }}</b>
          </span>
          <span class="m-update__step-label">{{ tx[`step${step.key[0].toUpperCase()}${step.key.slice(1)}`] }}</span>
        </li>
      </ol>
      <p v-if="showSteps && activeHint" class="m-update__step-hint">{{ activeHint }}</p>
      <p v-if="phase === 'installing' && installDetail" class="m-update__step-hint">{{ installDetail }}</p>
      <p v-if="phase === 'installing' && waitHint" class="m-update__step-hint is-wait">{{ waitHint }}</p>

      <section v-if="hasNotes && phase !== 'checking'" class="m-update__notes">
        <h3 class="m-update__notes-title">{{ notes?.title || tx.notesTitle }}</h3>
        <ul class="m-update__lines" :class="{ 'is-open': expanded }">
          <li v-for="(line, index) in shownLines" :key="index" :class="`is-${line.kind}`">{{ line.text }}</li>
        </ul>
        <p v-if="componentLine" class="m-update__plain">{{ componentLine }}</p>
        <div v-if="hiddenCount > 0 || notes?.truncated || notes?.fullChangelog" class="m-update__more">
          <button v-if="hiddenCount > 0" type="button" class="m-update__link" :aria-expanded="expanded" @click="expanded = !expanded">
            <MIcon :name="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
            {{ expanded ? tx.less : tx.more }}
            <span v-if="!expanded" class="m-update__count">{{ formatText(tx.moreLines, { count: hiddenCount }) }}</span>
          </button>
          <button v-if="hasReleasePage && (expanded || hiddenCount === 0) && notes?.truncated" type="button" class="m-update__link" @click="emit('open-release')">
            <MIcon name="open_in_new" />{{ tx.fullNotes }}
          </button>
          <button v-if="notes?.fullChangelog" type="button" class="m-update__link" @click="emit('open-changelog', notes.fullChangelog)">
            <MIcon name="history" />{{ tx.fullChangelog }}
          </button>
        </div>
      </section>
      <p v-else-if="phase === 'available' && !hasNotes" class="m-update__hint">{{ tx.notesEmpty }}</p>

      <MFooter v-if="mirrorHost">{{ formatText(tx.mirrorMetadata, { host: mirrorHost }) }}</MFooter>
      <MFooter v-if="phase === 'available' || phase === 'ready'">{{ canInstall ? tx.installWarning : linkNote === 'via-panel' ? tx.linkViaPanel : tx.linkOnly }}</MFooter>
      <MFooter v-if="phase === 'installing'">{{ tx.installLong }}</MFooter>
      <p v-if="phase === 'latest'" class="m-update__hint">{{ formatText(tx.latestHint, { version: displayVersion(next || current) }) }}</p>
    </div>

    <template #actions>
      <template v-if="phase === 'available' || phase === 'ready'">
        <MButton v-if="canSkip && phase === 'available'" variant="text" @click="skip">{{ tx.skip }}</MButton>
        <MButton variant="tonal" @click="later">{{ tx.later }}</MButton>
        <MButton :icon="primaryIcon" :loading="pending" autofocus @click="onPrimary">{{ primaryLabel }}</MButton>
      </template>
      <template v-else-if="phase === 'error'">
        <MButton v-if="hasReleasePage" variant="text" icon="open_in_new" @click="emit('open-release')">{{ tx.openRelease }}</MButton>
        <MButton variant="tonal" @click="later">{{ tx.later }}</MButton>
        <MButton icon="refresh" @click="emit('retry')">{{ tx.retry }}</MButton>
      </template>
      <template v-else-if="phase === 'latest'">
        <MButton v-if="hasReleasePage" variant="text" icon="open_in_new" @click="emit('open-release')">{{ tx.openRelease }}</MButton>
        <MButton autofocus @click="close">{{ tx.close }}</MButton>
      </template>
      <template v-else-if="phase === 'downloading'">
        <MButton variant="tonal" @click="later">{{ tx.background }}</MButton>
        <MButton disabled loading>{{ tx.working }}</MButton>
      </template>
      <template v-else-if="busy">
        <MButton disabled loading>{{ title }}</MButton>
      </template>
    </template>
  </MSheet>
</template>
