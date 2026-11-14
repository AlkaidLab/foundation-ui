<script setup>
import MAnnouncementHero from './MAnnouncementHero.vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MSheet from './MSheet.vue'
import MButton from './MButton.vue'
import MIcon from './MIcon.vue'
import MMarkdown from './MMarkdown.vue'
import { mustReadReady } from '../announcements/select.js'
import { announcementTexts } from './announcementTexts.js'

// An important announcement as a content dialog, the way MAA shows its announcement: the text as Markdown (with its images), a choice 下次公告更新前不再显示 and a button to confirm.
// A `modal` comes once and closes with the button, the scrim or Esc. A `must-read` stays until it is confirmed; the confirm works once the text has been read to the end (a text that fits
// needs no scroll), with a plain line of hint while it does not. No countdown. The product records what happened.
//   item: from activeItems() ({ id, mode, type, banner, title, body, url, revision }) or null
const props = defineProps({ item: { type: Object, default: null }, locale: { type: String, default: 'en' } })
const emit = defineEmits(['shown', 'acknowledge', 'hide', 'open-url'])
const T = computed(() => announcementTexts(props.locale))
const ICON = { notice: 'campaign', warning: 'warning' }
// what is on screen: kept here until the person closes it, so a modal that was just recorded as shown does not vanish under their eyes
const current = ref(null)
const forced = computed(() => current.value?.mode === 'must-read')
const body = ref(null)
const atEnd = ref(false)
const atStart = ref(true)
const hideNext = ref(false)
const measure = () => { const el = body.value; atEnd.value = !el || el.scrollHeight - el.scrollTop - el.clientHeight <= 6; atStart.value = !el || el.scrollTop <= 2 }
const finish = (acknowledged) => {
  const item = current.value
  if (!item) return
  if (hideNext.value) emit('hide', item.id)
  if (acknowledged) emit('acknowledge', item.id)
  current.value = null
}
const open = computed({ get: () => !!current.value, set: (v) => { if (!v && current.value && !forced.value) finish(false) } })
async function show(item) {
  current.value = item
  atEnd.value = false; atStart.value = true; hideNext.value = false
  if (!item) return
  await nextTick(); measure()
  // a modal comes once: it is recorded the moment it opens, whatever the person does with it
  if (item.mode === 'modal') emit('shown', item.id)
}
watch(() => props.item, (item) => {
  // a must-read stays until it is confirmed (the product then sends the next item or none); a modal stays until it is closed
  if (!item) { if (current.value?.mode === 'must-read') void show(null); return }
  if (!current.value || current.value.mode === 'must-read' || current.value.id === item.id) { if (current.value?.id !== item.id) void show(item) }
}, { immediate: true })
const ready = computed(() => mustReadReady({ atEnd: atEnd.value }))
const hint = computed(() => (forced.value && !ready.value ? T.value.scrollHint : ''))
// the dialog is measured when it opens (it has no size before), and again when the text changes its height (an image that has loaded)
let observer = null
watch(body, (el) => {
  observer?.disconnect()
  observer = null
  if (!el || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(measure)
  observer.observe(el)
  if (el.firstElementChild) observer.observe(el.firstElementChild)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <MSheet v-if="current" v-model="open" class="m-annpop" :class="[`m-annpop--${current.type}`, { 'has-banner': !!current.banner }]" :title="current.title" side="center" :persistent="forced" :close-label="T.popupGotIt">
    <div v-if="current.banner" class="m-annpop__banner"><img :src="current.banner" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" /></div>
    <div v-else class="m-annpop__banner"><MAnnouncementHero :id="current.id" :title="current.title" /></div>
    <div class="m-annpop__tag"><MIcon :name="ICON[current.type] || 'campaign'" fill /><span>{{ T.modes[current.mode] }}</span></div>
    <div ref="body" class="m-annpop__body" :class="{ 'can-up': !atStart, 'can-down': !atEnd }" tabindex="0" @scroll.passive="measure"><MMarkdown :source="current.body" @open-url="(u) => emit('open-url', u)" /></div>
    <template #actions>
      <button type="button" class="m-annpop__check" role="checkbox" :aria-checked="hideNext" @click="hideNext = !hideNext"><span class="m-annpop__box"><MIcon v-if="hideNext" name="check" /></span>{{ T.dontShow }}</button>
      <small v-if="hint" class="m-annpop__hint" role="status" aria-live="polite">{{ hint }}</small>
      <MButton v-if="current.url" variant="text" @click="emit('open-url', current.url)">{{ T.popupLink }}</MButton>
      <MButton v-if="forced" :disabled="!ready" @click="finish(true)">{{ T.acknowledge }}</MButton>
      <MButton v-else @click="finish(false)">{{ T.popupGotIt }}</MButton>
    </template>
  </MSheet>
</template>
