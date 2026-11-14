<script setup>
import { computed, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import MButton from '../MButton.vue'
import MChip from '../MChip.vue'
import DevMarkdown from './DevMarkdown.vue'
import DevIssueCode from './DevIssueCode.vue'
import DevImageViewer from './DevImageViewer.vue'
import { ago } from '../../devmode/github.js'
import { repoSlug } from '../../devmode/repos.js'
import { devmodeTexts, fillText } from '../../devmode/texts.js'
import { issueFormTexts } from '../../devmode/issueFormTexts.js'

// An issue made from a GitHub Issue Form (or by our own feedback flow, which uses the same forms), drawn in Material 3 Expressive instead of as one long Markdown text. `model` is what issueForm.js read from the body.
//   Header: state, title, labels as chips, who and when. The dropdown answers are a row of chips (their label in the tooltip), the short inputs one grid of key/value, each long answer a card with its Markdown, logs and
//   code collapsed, check boxes as read-only rows, pictures as thumbnails that open a viewer. 「原文」 shows the Markdown as GitHub has it. Comments are not drawn here.
const props = defineProps({
  model: { type: Object, required: true },
  item: { type: Object, required: true },
  locale: { type: String, default: 'zh' },
  openUrl: { type: Function, default: null },
})
const emit = defineEmits(['notify'])
const T = computed(() => ({ ...devmodeTexts(props.locale), ...issueFormTexts(props.locale) }))
const when = (iso) => ago(iso, { locale: props.locale })
const open = (url) => { if (props.openUrl) props.openUrl(url); else if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener') }
const copy = async (text) => { try { await navigator.clipboard.writeText(text); emit('notify', T.value.copied) } catch { /* the browser refused */ } }
const initial = (who) => (who || '?').slice(0, 1).toUpperCase()

const stateIcon = (i) => (i.state === 'closed' ? 'check_circle' : 'adjust')
const stateText = (i) => ({ open: T.value.stOpen, closed: T.value.stClosed }[i.state] || i.state)

const raw = ref(false)
watch(() => props.item.key, () => { raw.value = false })

const ICON = { 'describe-bug': 'bug_report', 'steps-reproduce': 'checklist', 'affected-games': 'sports_esports', 'settings-adjusted-settings': 'tune', screenshots: 'image', logs: 'terminal', additional: 'edit_note', problem: 'help', solution: 'lightbulb', alternatives: 'swap_horiz', 'use-case': 'visibility' }
const iconOf = (f) => ICON[f.id] || (f.role === 'code' ? 'terminal' : f.role === 'media' ? 'image' : f.role === 'check' ? 'checklist' : 'description')

const fields = computed(() => props.model.fields)
const chips = computed(() => fields.value.filter((f) => f.role === 'chip'))
const envs = computed(() => fields.value.filter((f) => f.role === 'env'))
const sections = computed(() => fields.value.filter((f) => !['chip', 'env'].includes(f.role)))
const diag = computed(() => props.model.diagnostics)

// every picture of the issue, in reading order, for the viewer
const gallery = computed(() => {
  const list = []
  const add = (src, alt) => { if (src && !list.some((x) => x.src === src)) list.push({ src, alt: alt || '' }) }
  for (const f of sections.value) for (const im of f.images || []) add(im.src, im.alt)
  for (const a of diag.value?.attachments || []) if (a.image && a.url) add(a.url, a.name)
  return list
})
const viewing = ref(-1)
const view = (src) => { const i = gallery.value.findIndex((x) => x.src === src); if (i >= 0) viewing.value = i; else open(src) }
const broken = ref(new Set())
const markBroken = (src) => { broken.value = new Set([...broken.value, src]) }
const alt = (im, n) => im.alt || fillText(T.value.imageAlt, { n })
// a short answer (是, 否, Yes) says nothing without its question: the chip then carries it, the longer ones have the label in the tooltip
const chipText = (c) => (c.value.length <= 4 ? `${c.plain.replace(/[?？:：]\s*$/, "")}${/[\u4e00-\u9fff]/.test(c.plain) ? "：" : ": "}${c.value}` : c.value)
const blockTitle = (t) => T.value.blocks[t] || t
const fileKind = (name) => (/\.(png|jpe?g|gif|webp)$/i.test(name) ? 'image' : /\.(log|txt)$/i.test(name) ? 'terminal' : 'description')
</script>

<template>
  <div class="dm-ifm" :class="{ 'dm-ifm--raw': raw }" data-dev="issue-form" :data-form="model.form.kind">
    <div class="dm-detail__sub">
      <MChip :tone="item.state === 'open' ? 'ok' : 'tertiary'" :icon="stateIcon(item)">{{ stateText(item) }}</MChip>
      <span class="dm-meta"><span class="dm-mono">{{ repoSlug(item.repo) }}#{{ item.n }}</span></span>
      <span class="dm-ifm__grow" />
      <MButton variant="text" size="sm" :icon="raw ? 'article' : 'code'" :aria-pressed="raw" :title="T.rawTip" data-dev="issue-raw" @click="raw = !raw">{{ raw ? T.rawBack : T.raw }}</MButton>
    </div>
    <h2 class="dm-reader__title">{{ item.title }}</h2>
    <div class="dm-meta dm-reader__by">
      <span class="dm-reader__who"><i class="dm-reader__av">{{ initial(item.who) }}</i>{{ item.who }}</span>
      <span>{{ fillText(T.openedAt, { when: when(item.created || item.at) }) }}</span>
      <span v-if="item.created && item.at && item.at !== item.created">{{ fillText(T.updatedAt, { when: when(item.at) }) }}</span>
      <span v-if="item.comments">{{ fillText(T.comments, { n: item.comments }) }}</span>
    </div>
    <div v-if="item.labels.length" class="dm-ifm__labels" data-dev="issue-labels"><MChip v-for="l in item.labels" :key="l">{{ l }}</MChip></div>

    <div v-if="raw" class="dm-reader__text dm-ifm__raw" data-dev="issue-body"><DevMarkdown :source="item.body" :open-url="open" :locale="locale" /></div>

    <div v-else class="dm-ifm__body" data-dev="issue-body">
      <div v-if="chips.length" class="dm-ifm__chips" role="list" data-dev="form-chips">
        <span v-for="(c, i) in chips" :key="c.label" role="listitem" class="dm-ifm__chip" :class="{ 'dm-ifm__chip--lead': i === 0 }" :title="c.plain" :aria-label="`${c.plain}: ${c.value}`">{{ chipText(c) }}</span>
      </div>

      <p v-if="model.lead" class="dm-ifm__lead">{{ model.lead }}</p>

      <section v-if="envs.length" class="dm-ifm__card" data-dev="form-env" :aria-label="T.env">
        <h3 class="dm-ifm__h"><i class="dm-ifm__hi"><MIcon name="computer" /></i>{{ T.env }}</h3>
        <dl class="dm-ifm__kv">
          <div v-for="e in envs" :key="e.label" class="dm-ifm__row" :class="{ 'dm-ifm__row--wide': e.value.length > 36 }"><dt>{{ e.plain }}</dt><dd>{{ e.value }}</dd></div>
        </dl>
      </section>

      <section v-for="f in sections" :key="f.label" class="dm-ifm__card" :class="`dm-ifm__card--${f.role}`" :data-field="f.id || undefined">
        <h3 class="dm-ifm__h"><i class="dm-ifm__hi"><MIcon :name="iconOf(f)" /></i>{{ f.plain }}</h3>
        <template v-if="f.role === 'check'">
          <ul class="dm-ifm__checks">
            <li v-for="(c, i) in f.checks" :key="i" class="dm-ifm__check" :class="{ 'is-on': c.checked }"><MIcon :name="c.checked ? 'check_box' : 'check_box_outline_blank'" fill /><span>{{ c.text }}</span></li>
          </ul>
        </template>
        <template v-else-if="f.role === 'code'">
          <DevIssueCode :text="f.code.text" :lang="f.code.lang" :locale="locale" @copied="(t) => emit('notify', t)" />
        </template>
        <template v-else>
          <ul v-if="f.role === 'media' && f.images.length" class="dm-ifm__thumbs" role="list">
            <li v-for="(im, i) in f.images" :key="im.src" role="listitem">
              <button type="button" class="dm-ifm__thumb" :class="{ 'is-broken': broken.has(im.src) }" :aria-label="alt(im, i + 1)" data-dev="form-thumb" @click="view(im.src)">
                <img :src="im.src" :alt="alt(im, i + 1)" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" @error="markBroken(im.src)">
                <MIcon v-if="broken.has(im.src)" name="image" />
              </button>
            </li>
          </ul>
          <DevMarkdown v-if="f.value.trim()" :source="f.value" :open-url="open" :open-image="view" fold-code :locale="locale" @copied="(t) => emit('notify', t)" />
        </template>
      </section>

      <section v-if="diag" class="dm-ifm__card dm-ifm__card--diag" data-dev="form-diag">
        <h3 class="dm-ifm__h"><i class="dm-ifm__hi"><MIcon name="stethoscope" /></i>{{ T.diag }}</h3>
        <div v-if="diag.fingerprint || diag.release" class="dm-ifm__diagrow">
          <button v-if="diag.fingerprint" type="button" class="dm-ifm__fp" :title="T.copy" :aria-label="`${T.fingerprint} ${diag.fingerprint}: ${T.copy}`" data-dev="diag-fingerprint" @click="copy(diag.fingerprint)"><MIcon name="fingerprint" /><span class="dm-ifm__fpk">{{ T.fingerprint }}</span><code>{{ diag.fingerprint }}</code><MIcon name="content_copy" /></button>
          <span v-if="diag.release" class="dm-ifm__fp dm-ifm__fp--static"><span class="dm-ifm__fpk">{{ T.release }}</span><code>{{ diag.release }}</code></span>
        </div>
        <dl v-if="diag.rows.length" class="dm-ifm__kv">
          <div v-for="r in diag.rows" :key="r[0]" class="dm-ifm__row"><dt>{{ r[0] }}</dt><dd>{{ r[1] }}</dd></div>
        </dl>
        <DevIssueCode v-for="(b, i) in diag.blocks" :key="i" :text="b.text" :lang="b.lang" :title="blockTitle(b.title)" :locale="locale" @copied="(t) => emit('notify', t)" />
        <div v-if="diag.attachments.length" class="dm-ifm__att" data-dev="diag-attachments">
          <h4 class="dm-ifm__h4">{{ T.attachments }}</h4>
          <ul class="dm-ifm__thumbs" role="list">
            <li v-for="a in diag.attachments" :key="a.name + a.url" role="listitem">
              <button v-if="a.image && a.url" type="button" class="dm-ifm__thumb" :class="{ 'is-broken': broken.has(a.url) }" :aria-label="a.name" data-dev="form-thumb" @click="view(a.url)">
                <img :src="a.url" :alt="a.name" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" @error="markBroken(a.url)">
                <MIcon v-if="broken.has(a.url)" name="image" />
              </button>
              <a v-else-if="a.url" class="dm-ifm__file" :href="a.url" rel="noopener noreferrer" target="_blank" @click.prevent="open(a.url)"><MIcon :name="fileKind(a.name)" /><span>{{ a.name }}</span><small v-if="a.size">{{ a.size }}</small></a>
              <span v-else class="dm-ifm__file"><MIcon :name="fileKind(a.name)" /><span>{{ a.name }}</span><small v-if="a.size">{{ a.size }}</small></span>
            </li>
          </ul>
        </div>
        <p v-if="diag.contact" class="dm-ifm__contact"><b>{{ T.contact }}</b> {{ diag.contact }}</p>
      </section>
    </div>

    <DevImageViewer :images="gallery" :index="viewing" :locale="locale" @update:index="(i) => (viewing = i)" />
  </div>
</template>
