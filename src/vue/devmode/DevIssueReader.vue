<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import MButton from '../MButton.vue'
import MChip from '../MChip.vue'
import DevMarkdown from './DevMarkdown.vue'
import MIssueForm from './MIssueForm.vue'
import { useIssueTemplates } from './useIssueTemplates.js'
import { readIssueForm } from '../../devmode/issueForm.js'
import { ago } from '../../devmode/github.js'
import { repoSlug } from '../../devmode/repos.js'
import { devmodeTexts, fillText } from '../../devmode/texts.js'
import { useDevAccount } from './useDevAccount.js'
import { openDevSignIn } from './devReport.js'

// The reading surface of the Issue 与 PR page: the title and who/when/state/labels, the actions, the text as Markdown and the comment thread. The text sits in one column of a readable length (the line is about 70
// characters, body-large), whatever the width of the page; the comments are read with the same cache and limits as the lists. With more than COLLAPSE_OVER comments the thread shows the first and the last ones and 显示全部.
const COLLAPSE_OVER = 5
const props = defineProps({
  item: { type: Object, required: true },
  client: { type: Object, required: true },
  locale: { type: String, default: 'zh' },
  openUrl: { type: Function, default: null },
  /** the reader replaces the list (a medium window): a back chip leads to the list; otherwise a close button */
  back: { type: Boolean, default: false },
  /** there is something to close (an item the person opened); the item shown beside the list without being opened has none */
  closable: { type: Boolean, default: true },
  /** the page has the width of the window to itself (全屏阅读): the toggle is shown on wide pages only */
  full: { type: Boolean, default: false },
  canFull: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'notify', 'update:full'])
const T = computed(() => devmodeTexts(props.locale))
const account = useDevAccount()
const when = (iso) => ago(iso, { locale: props.locale })

const stateIcon = (i) => (i.kind === 'pr' ? (i.state === 'merged' ? 'merge' : i.state === 'draft' ? 'draft' : 'call_split') : (i.state === 'closed' ? 'check_circle' : 'adjust'))
const stateText = (i) => ({ open: T.value.stOpen, closed: T.value.stClosed, merged: T.value.stMerged, draft: T.value.stDraft }[i.state] || i.state)

const open = (url) => { if (props.openUrl) props.openUrl(url); else if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener') }
const copy = async (text) => { try { await navigator.clipboard.writeText(text); emit('notify', T.value.copied) } catch { /* the browser refused */ } }

// ---- the comments ----
const thread = ref({ state: 'idle', items: [], stale: false, status: 0, resetAt: 0, resetKnown: false })
const showAll = ref(false)
let token = 0
async function loadComments(force) {
  const item = props.item
  if (!item.comments) { thread.value = { state: 'ok', items: [], stale: false, status: 0 }; return }
  const mark = ++token
  thread.value = { ...thread.value, state: 'loading' }
  const res = await props.client.comments(item.repo, item.n, { force })
  if (mark !== token) return
  thread.value = { state: res.state, items: res.items || [], stale: !!res.stale, status: res.status || 0, resetAt: res.resetAt || 0, resetKnown: !!res.resetKnown, host: res.host || '', reason: res.reason || '' }
}
watch(() => props.item.key, () => { showAll.value = false; thread.value = { state: 'idle', items: [], stale: false, status: 0 }; loadComments(false) }, { immediate: true })
onBeforeUnmount(() => { token++ })

const comments = computed(() => thread.value.items)
const collapsed = computed(() => !showAll.value && comments.value.length > COLLAPSE_OVER)
const head = computed(() => (collapsed.value ? comments.value.slice(0, 1) : comments.value))
const tail = computed(() => (collapsed.value ? comments.value.slice(-2) : []))
const hidden = computed(() => comments.value.length - head.value.length - tail.value.length)
// the thread has more comments than the page of the endpoint gave
const more = computed(() => props.item.comments > comments.value.length && comments.value.length > 0 && thread.value.state === 'ok')
const failed = computed(() => ['rate', 'offline', 'error', 'auth', 'forbidden'].includes(thread.value.state))
// What failed (a sentence), why or when it comes back (a second line), and the action as a button beside it: sign in when that is what raises the limit or opens the repository
const fail = computed(() => {
  const t = T.value
  const st = thread.value
  const signed = account.signedIn.value
  if (st.state === 'rate') {
    const minutes = st.resetKnown && st.resetAt ? Math.ceil((st.resetAt - Date.now()) / 60000) : 0
    const sub = !minutes ? '' : minutes <= 1 ? t.rateSoon : fillText(t.rateReset, { m: minutes })
    return { text: signed ? t.rateNoteSigned : t.rateNoteComments, sub, action: signed ? '' : t.connect, connect: !signed }
  }
  if (st.state === 'auth') return { text: t.commentsFail, sub: t.authText, action: t.reconnect, connect: true }
  if (st.state === 'forbidden') return { text: t.commentsFail, sub: t.forbiddenText, action: signed ? '' : t.connect, connect: !signed }
  if (st.state === 'offline') return { text: t.commentsFail, sub: [st.host ? fillText(t.offlineHost, { host: st.host }) : t.offlineNone, st.reason].filter(Boolean).join(' · '), action: t.retry }
  return { text: t.commentsFail, sub: fillText(t.errorText, { status: st.status || '—' }), action: t.retry }
})
const onFail = () => { if (fail.value.connect) openDevSignIn(); else loadComments(true) }
// an issue made from an Issue Form is drawn as the form (MIssueForm); anything else keeps the Markdown below
const liveTemplates = useIssueTemplates(() => props.client, () => props.item)
const formModel = computed(() => (props.item.kind === 'pr' ? null : readIssueForm(props.item.body, props.item.repo, liveTemplates.value)))
const initial = (who) => (who || '?').slice(0, 1).toUpperCase()
const isAuthor = (c) => !!c.who && c.who === props.item.who
</script>

<template>
  <article class="dm-reader" :class="{ 'dm-reader--full': full }" data-dev="issue-detail" :aria-label="item.title">
    <header class="dm-reader__bar">
      <button v-if="back" type="button" class="dm-back" data-dev="issue-back" @click="emit('close')"><MIcon name="arrow_back" />{{ T.back }}</button>
      <button v-else-if="closable" type="button" class="dm-back" data-dev="issue-close" @click="emit('close')"><MIcon name="close" />{{ T.closeReader }}</button>
      <span v-else />
      <span class="dm-reader__acts">
        <MButton v-if="canFull" variant="text" size="sm" :icon="full ? 'fullscreen_exit' : 'fullscreen'" data-dev="issue-full" @click="emit('update:full', !full)">{{ full ? T.fullExit : T.fullRead }}</MButton>
        <MButton variant="tonal" size="sm" icon="link" data-dev="issue-copy" @click="copy(item.url)">{{ T.copyLink }}</MButton>
        <MButton variant="filled" size="sm" icon="open_in_new" data-dev="issue-open" @click="open(item.url)">{{ T.openOnGithub }}</MButton>
      </span>
    </header>

    <div class="dm-reader__col" :class="{ 'dm-reader__col--form': formModel }">
      <MIssueForm v-if="formModel" :model="formModel" :item="item" :locale="locale" :open-url="open" @notify="(text) => emit('notify', text)" />
      <template v-else>
      <div class="dm-detail__sub"><MChip :tone="item.state === 'open' ? 'ok' : item.state === 'draft' ? 'neutral' : 'tertiary'" :icon="stateIcon(item)">{{ stateText(item) }}</MChip><span class="dm-meta"><span class="dm-mono">{{ repoSlug(item.repo) }}#{{ item.n }}</span></span></div>
      <h2 class="dm-reader__title">{{ item.title }}</h2>
      <div class="dm-meta dm-reader__by"><span class="dm-reader__who"><i class="dm-reader__av">{{ initial(item.who) }}</i>{{ item.who }}</span><span>{{ fillText(T.openedAt, { when: when(item.created || item.at) }) }}</span><span v-if="item.comments">{{ item.comments === 1 && /^(zh|en)/i.test(String(locale)) ? T.commentOne : fillText(T.comments, { n: item.comments }) }}</span><span v-if="item.branch" class="dm-mono">{{ item.branch }}</span></div>
      <div v-if="item.labels.length" class="dm-labels dm-reader__labels"><span v-for="l in item.labels" :key="l" class="dm-label">{{ l }}</span></div>

      <div class="dm-reader__text" data-dev="issue-body">
        <DevMarkdown v-if="item.body.trim()" :source="item.body" :open-url="open" />
        <p v-else class="dm-dim dm-reader__empty">{{ T.bodyEmpty }}</p>
        <p v-if="item.bodyCut" class="dm-dim dm-reader__empty">{{ T.bodyCut }}</p>
      </div>
      </template>
      <p v-if="formModel && item.bodyCut" class="dm-dim dm-reader__empty">{{ T.bodyCut }}</p>

      <section v-if="item.comments" class="dm-thread" data-dev="issue-comments" :aria-label="fillText(T.commentsTitle, { n: item.comments })">
        <h3 class="dm-thread__h"><MIcon name="forum" />{{ fillText(T.commentsTitle, { n: item.comments }) }}</h3>
        <p v-if="thread.state === 'loading' && !comments.length" class="dm-dim dm-thread__note">{{ T.commentsLoading }}</p>
        <div v-if="failed" class="dm-thread__fail" data-dev="issue-comments-fail"><MIcon :name="thread.state === 'rate' ? 'schedule' : 'cloud_off'" /><span class="dm-thread__failtext"><span>{{ fail.text }}</span><small v-if="fail.sub" class="dm-thread__failsub">{{ fail.sub }}</small></span><MButton v-if="fail.action" :variant="fail.connect ? 'tonal' : 'text'" :icon="fail.connect ? 'login' : ''" size="sm" data-dev="issue-comments-action" @click="onFail">{{ fail.action }}</MButton></div>
        <ol v-if="comments.length" class="dm-thread__list">
          <li v-for="c in head" :key="c.id" class="dm-comment">
            <div class="dm-comment__head"><i class="dm-reader__av">{{ initial(c.who) }}</i><b>{{ c.who }}</b><span v-if="isAuthor(c)" class="dm-label">{{ T.authorTag }}</span><span class="dm-dim">{{ when(c.at) }}</span></div>
            <DevMarkdown :source="c.body" :open-url="open" />
          </li>
          <li v-if="collapsed" class="dm-thread__more"><button type="button" class="dm-back" data-dev="comments-all" @click="showAll = true"><MIcon name="unfold_more" />{{ fillText(T.commentsAll, { n: comments.length }) }}<small v-if="hidden">{{ fillText(T.commentsHidden, { n: hidden }) }}</small></button></li>
          <li v-for="c in tail" :key="c.id" class="dm-comment">
            <div class="dm-comment__head"><i class="dm-reader__av">{{ initial(c.who) }}</i><b>{{ c.who }}</b><span v-if="isAuthor(c)" class="dm-label">{{ T.authorTag }}</span><span class="dm-dim">{{ when(c.at) }}</span></div>
            <DevMarkdown :source="c.body" :open-url="open" />
          </li>
        </ol>
        <button v-if="showAll && comments.length > COLLAPSE_OVER" type="button" class="dm-back dm-thread__fold" @click="showAll = false"><MIcon name="unfold_less" />{{ T.commentsFold }}</button>
        <p v-if="more" class="dm-dim dm-thread__note">{{ fillText(T.commentsMore, { n: item.comments - comments.length }) }} <a href="#" class="dm-md__a" @click.prevent="open(item.url)">{{ T.openOnGithub }}</a></p>
      </section>
    </div>
  </article>
</template>
