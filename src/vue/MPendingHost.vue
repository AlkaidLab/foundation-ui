<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MButton from './MButton.vue'
import MDialog from './MDialog.vue'
import MIcon from './MIcon.vue'
import MIconButton from './MIconButton.vue'
import MPendingRow from './MPendingRow.vue'
import { useBottomLayer } from './useBottomLayer.js'
import { usePending } from '../pending/store.js'
import { useNotify } from '../notify/store.js'
import { pendingTexts } from '../pending/texts.js'

// The unsaved state of the window in one place, mount once in the shell: the bar that floats above every page while something is unsaved, the list of the
// changes (per field undo, a way to the page), and the one confirmation of the save with what it causes. After a save a snackbar offers 撤销 where the host allows.
const props = defineProps({ locale: { type: String, default: 'en' } })
const emit = defineEmits(['go'])
const pending = usePending()
const notify = useNotify()
const T = computed(() => pendingTexts(props.locale))
const listOpen = ref(false)
const bar = ref(null)
const barStyle = useBottomLayer('pbar', 0, bar)
const list = ref(null)
// the list of the changes rises from the bar (a popover in the top layer, placed above it, not a sheet at the top of the window); it closes on Escape or a press outside
async function placeList() {
  await nextTick()
  const el = list.value
  const anchor = bar.value
  if (!el || !anchor) return
  const r = anchor.getBoundingClientRect()
  const width = Math.min(Math.max(r.width, 400), window.innerWidth - 16)
  el.style.width = `${width}px`
  el.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8))}px`
  el.style.bottom = `${Math.max(8, window.innerHeight - r.top + 8)}px`
  el.style.maxHeight = `${Math.max(160, Math.min(window.innerHeight - (window.innerHeight - r.top) - 24, 460))}px`
}
watch(listOpen, async (open) => {
  const el = list.value
  if (!el) return
  if (open) { await placeList(); if ('showPopover' in el && !el.matches(':popover-open')) el.showPopover() } else if ('hidePopover' in el && el.matches(':popover-open')) el.hidePopover()
})
const outside = (event) => { if (listOpen.value && !list.value?.contains(event.target) && !bar.value?.contains(event.target)) listOpen.value = false }
const escape = (event) => { if (event.key === 'Escape' && listOpen.value) listOpen.value = false }
onMounted(() => { document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', escape, true); window.addEventListener('resize', placeList) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape, true); window.removeEventListener('resize', placeList) })
const review = computed(() => pending.state.review)
const reviewOpen = computed({ get: () => !!review.value, set: (v) => { if (!v) pending.cancel() } })
const pageNames = computed(() => pending.pages.value.map((p) => p.label).join(' · '))
const groups = computed(() => pending.pages.value.map((p) => ({ ...p, entries: pending.all.value.filter((e) => e.page === p.page) })))
watch(() => pending.count.value, (n) => { if (!n) listOpen.value = false })

const reviewGroups = computed(() => {
  const out = []
  for (const e of review.value?.entries || []) { const g = out.find((x) => x.page === e.page); if (g) g.entries.push(e); else out.push({ page: e.page, label: e.pageLabel, entries: [e] }) }
  return out
})
const restartConsequence = computed(() => review.value?.consequences.find((c) => c.kind === 'restart'))
const sessions = computed(() => review.value?.consequences.find((c) => c.kind === 'sessions'))
const others = computed(() => (review.value?.consequences || []).filter((c) => c.kind !== 'restart' && c.kind !== 'sessions'))

async function ask() { listOpen.value = false; await pending.request() }
async function confirm(restart) {
  const count = review.value?.count || 0
  const result = await pending.confirm({ restart })
  if (!result.ok) return
  const undoable = pending.canUndoLast()
  notify.snack(result.restarted ? T.value.savedRestart(count) : T.value.saved(count), {
    id: 'pending-saved',
    action: undoable ? T.value.undo : '',
    timeout: 8000,
    onAction: async () => { const r = await pending.undoLast(); notify.snack(r.ok ? T.value.undone : T.value.failed(pending.state.error), { id: 'pending-saved' }) },
  })
}
function fixInvalid() {
  const first = review.value?.invalid?.[0]
  pending.cancel()
  if (first) emit('go', first.page)
}
function go(page) { listOpen.value = false; emit('go', page) }
</script>

<template>
  <Teleport to="body">
    <Transition name="m-savebar">
      <div v-if="pending.count.value" ref="bar" class="m-pbar" role="region" :aria-label="T.listTitle" :style="barStyle">
        <button type="button" class="m-pbar__summary" aria-haspopup="true" :aria-expanded="listOpen" :aria-label="T.view" @click="listOpen = !listOpen">
          <span class="m-pbar__count">{{ T.barCount(pending.count.value) }}</span>
          <span v-if="pending.pages.value.length" class="m-pbar__pages">{{ pageNames }}</span>
          <MIcon name="keyboard_arrow_up" />
        </button>
        <MButton variant="text" :disabled="pending.state.saving" @click="pending.undoAll()">{{ T.undoAll }}</MButton>
        <MButton icon="save" :loading="pending.state.saving" @click="ask">{{ T.save }}</MButton>
      </div>
    </Transition>
  </Teleport>

  <div ref="list" popover="manual" class="m-plistpop" role="dialog" :aria-label="T.listTitle">
    <header class="m-plistpop__head"><h2>{{ T.listTitle }}</h2><MIconButton icon="close" :label="T.close" @click="listOpen = false" /></header>
    <div class="m-plistpop__body">
      <section v-for="g in groups" :key="g.page" class="m-plist__group">
        <header class="m-plist__head"><h3>{{ g.label }}</h3><MButton variant="text" size="sm" @click="go(g.page)">{{ T.go }}</MButton></header>
        <ul class="m-plist m-plist--box">
          <MPendingRow v-for="e in g.entries" :key="`${e.source}:${e.key}`" :entry="e" :texts="T">
            <template #action><MIconButton icon="undo" :label="T.undo" @click="pending.undo(e.source, e.key)" /></template>
          </MPendingRow>
        </ul>
      </section>
    </div>
  </div>

  <MDialog v-model="reviewOpen" :title="review?.invalid?.length ? T.invalidTitle(review.invalid.length) : T.title(review?.count || 0)">
    <template v-if="review">
      <ul v-if="review.invalid.length" class="m-plist m-plist--box">
        <MPendingRow v-for="e in review.invalid" :key="`${e.source}:${e.key}`" :entry="e" :texts="T" />
      </ul>
      <template v-else>
      <section v-for="g in reviewGroups" :key="g.page" class="m-plist__group">
        <h3 v-if="reviewGroups.length > 1" class="m-plist__label">{{ g.label }}</h3>
        <ul class="m-plist m-plist--box m-plist--scroll">
          <MPendingRow v-for="e in g.entries" :key="`${e.source}:${e.key}`" :entry="e" :texts="T" />
        </ul>
      </section>
      </template>
      <div v-if="!review.invalid.length && (restartConsequence || sessions || others.length)" class="m-sconseq">
        <div v-if="restartConsequence" class="m-sconseq__row"><MIcon name="restart_alt" /><div><b>{{ restartConsequence.title || T.restart }}</b><span v-if="restartConsequence.text">{{ restartConsequence.text }}</span></div></div>
        <div v-if="sessions" class="m-sconseq__row"><MIcon name="cast_connected" /><div><b>{{ T.sessions(sessions.count) }}</b></div></div>
        <div v-for="c in others" :key="c.id" class="m-sconseq__row"><MIcon :name="c.kind === 'risk' ? 'shield' : 'info'" /><div>
          <b>{{ c.title }} <span v-if="c.kind === 'risk'" class="m-tag" :class="`m-tag--${c.severity}`">{{ T.riskTitle[c.severity] || c.severity }}</span></b>
          <span v-if="c.text">{{ c.text }}</span>
        </div></div>
      </div>
      <p v-if="pending.state.error && pending.state.error !== 'invalid'" class="m-sconseq__error" role="alert">{{ T.failed(pending.state.error) }}</p>
    </template>
    <template #actions>
      <MButton variant="text" :disabled="pending.state.saving" @click="pending.cancel()">{{ T.cancel }}</MButton>
      <template v-if="review?.invalid?.length">
        <MButton icon="edit" @click="fixInvalid">{{ T.fix }}</MButton>
      </template>
      <template v-else>
        <MButton :variant="review?.restart ? 'text' : 'filled'" :loading="pending.state.saving && !review?.restart" :disabled="pending.state.saving" @click="confirm(false)">{{ T.save }}</MButton>
        <MButton v-if="review?.restart" icon="restart_alt" :loading="pending.state.saving" :disabled="pending.state.saving" @click="confirm(true)">{{ T.saveRestart }}</MButton>
      </template>
    </template>
  </MDialog>
</template>
