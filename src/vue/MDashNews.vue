<script setup>
import MAnnouncementHero from './MAnnouncementHero.vue'
import { reducedMotion } from '../appearance/motion.js'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from './MIcon.vue'

// The 资讯 tile of the home, in the shape of ZZZ OneDragon's notice card: a banner carousel (3:2, the next one every 5 seconds, a click opens it, pips under it) beside
// a list of posts in tabs by kind with their dates. Without a banner the list takes the tile. Opening a post goes to the 公告 page (or the link of a post that has no text).
//   data: { title, icon, tabs: [{ id, label }], items: [{ id, title, category, banner, date, read, hasText, url }], empty, quiet, status, action }
// `quiet`: nothing unread (or no post at all). The banner's place is a hero with the state, and the list is the newest posts that were read, so the tile is a real tile and not a hole.
const props = defineProps({
  data: { type: Object, required: true },
  size: { type: String, default: 'm' },
  /** a tile that is only shown (the picker, edit mode): it does not rotate */
  still: { type: Boolean, default: false },
})
const emit = defineEmits(['act'])
const SHOWN = { s: 0, m: 2, l: 4, xl: 5 }
const tab = ref('')
const tabs = computed(() => props.data.tabs || [])
watch(tabs, (list) => { if (!list.some((t) => t.id === tab.value)) tab.value = list[0]?.id || '' }, { immediate: true })
const rows = computed(() => (props.data.items || []).filter((i) => !tabs.value.length || tabs.value.length === 1 || i.category === tab.value).slice(0, SHOWN[props.size] ?? 4))
// every post (up to five) is a slide of the carousel; one without a banner is a generated hero (announcements/hero.js)
const banners = computed(() => (props.data.items || []).slice(0, 5))
const at = ref(0)
const paused = ref(false)
let timer = 0
const current = computed(() => banners.value[at.value % Math.max(1, banners.value.length)] || null)
const open = (item) => emit('act', item.hasText || !item.url ? 'news-open' : 'open-url', item.hasText || !item.url ? { id: item.id } : item.url)
const go = (i) => { at.value = i; restart() }
function restart() { clearInterval(timer); if (!props.still && banners.value.length > 1 && !reducedMotion()) timer = setInterval(() => { if (!paused.value) at.value = (at.value + 1) % banners.value.length }, 5000) }
onMounted(restart)
watch(() => banners.value.length, restart)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <section class="m-dcard m-dnews" :class="[`m-dnews--${size}`, { 'has-banner': !!banners.length, 'is-quiet': !!data.quiet }]" :aria-label="data.title">
    <div v-if="banners.length && size !== 's'" class="m-dnews__banner" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
      <button v-for="(b, i) in banners" :key="b.id" type="button" class="m-dnews__slide" :class="{ 'is-on': i === at % banners.length }" :aria-label="b.title" :tabindex="i === at % banners.length ? 0 : -1" @click="open(b)"><img v-if="b.banner" :src="b.banner" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" /><MAnnouncementHero v-else :id="b.id" :title="b.title" /></button>
      <span v-if="banners.length > 1" class="m-dnews__pips"><button v-for="(b, i) in banners" :key="b.id" type="button" class="m-dnews__pip" :class="{ 'is-on': i === at % banners.length }" :aria-label="b.title" @click.stop="go(i)" /></span>
    </div>
    <div v-else-if="data.quiet && size !== 's'" class="m-dnews__hero" role="img" :aria-label="data.status">
      <MIcon :name="(data.items || []).length ? 'done_all' : data.icon || 'newspaper'" /><b>{{ data.status }}</b>
    </div>
    <div class="m-dnews__main">
      <div v-if="size === 's'" class="m-dnews__small"><MIcon :name="data.icon || 'newspaper'" /><span>{{ data.title }}</span><b>{{ (data.items || []).length }}</b></div>
      <template v-else>
        <div v-if="tabs.length > 1" class="m-dnews__tabs" role="tablist"><button v-for="t in tabs" :key="t.id" type="button" role="tab" class="m-dnews__tab" :class="{ 'is-on': t.id === tab }" :aria-selected="t.id === tab" @click="tab = t.id">{{ t.label }}</button></div>
        <h3 v-else class="m-dnews__title"><MIcon :name="data.icon || 'newspaper'" />{{ data.title }}</h3>
        <ul v-if="rows.length" class="m-dnews__list"><li v-for="item in rows" :key="item.id"><button type="button" class="m-dnews__row" :class="{ 'is-read': item.read }" @click="open(item)"><i v-if="!item.read" class="m-dnews__dot" /><span class="m-dnews__rowtitle">{{ item.title }}</span><time v-if="item.date">{{ item.date }}</time></button></li></ul>
        <button v-else-if="data.quiet && data.action" type="button" class="m-dnews__go" @click="emit('act', 'open', 'announcements')">{{ data.action }}</button>
        <p v-else class="m-dnews__empty">{{ data.empty }}</p>
      </template>
    </div>
  </section>
</template>
