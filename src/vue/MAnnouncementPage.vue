<script setup>
import MAnnouncementHero from './MAnnouncementHero.vue'
import { computed, ref, watch } from 'vue'
import MPage from './MPage.vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MSeg from './MSeg.vue'
import MMarkdown from './MMarkdown.vue'
import { plainText } from '../announcements/markdown.js'
import { announcementTexts } from './announcementTexts.js'

// The 公告 page: the announcements as content, newest first, in the way of a news list. A card has the banner (or the kind's icon), the title, the kind and the date and the first
// words; a click opens the announcement in place with its Markdown. Opening one reads it. Only an item of type warning is drawn as a warning, and then only in its small icon.
//   items: from useAnnouncements().list; openId: an announcement to open at once (from the home tile)
const props = defineProps({
  items: { type: Array, default: () => [] },
  locale: { type: String, default: 'en' },
  ackedAt: { type: Function, default: () => null },
  onRefresh: { type: Function, default: null },
  openId: { type: String, default: '' },
})
const emit = defineEmits(['dismiss', 'open-url', 'read', 'back'])
const T = computed(() => announcementTexts(props.locale))
const CATEGORY_ICON = { announce: 'campaign', update: 'update', guide: 'menu_book' }
const filter = ref('all')
const openItem = ref('')
// how the open announcement was reached: from the list (the page's Back returns to the list) or straight (a home tile, a popup: openId; the page's Back returns to where the person came from)
const fromList = ref(false)
const categories = computed(() => [...new Set(props.items.map((i) => i.category))])
const options = computed(() => [{ value: 'all', label: T.value.allCategories }, ...categories.value.map((c) => ({ value: c, label: T.value.categories[c] || c }))])
const shown = computed(() => props.items.filter((i) => filter.value === 'all' || i.category === filter.value))
const current = computed(() => props.items.find((i) => i.id === openItem.value) || null)
const pad = (n) => String(n).padStart(2, '0')
const dateOf = (at) => { if (!at) return ''; const d = new Date(at); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const timeOf = (at) => { if (!at) return ''; const d = new Date(at); return `${dateOf(at)} ${pad(d.getHours())}:${pad(d.getMinutes())}` }
const summary = (item) => plainText(item.body, 90)
function open(item) { fromList.value = true; openItem.value = item.id; emit('read', item.id) }
const closeToList = () => { openItem.value = ''; fromList.value = false }
watch(() => props.openId, (id) => { if (id && props.items.some((i) => i.id === id)) { fromList.value = false; openItem.value = id; emit('read', id) } }, { immediate: true })
watch(() => props.items.length, () => { if (props.openId && !openItem.value && props.items.some((i) => i.id === props.openId)) { fromList.value = false; openItem.value = props.openId; emit('read', props.openId) } })
</script>

<template>
  <MPage :title="T.title" :back="!!current && fromList" :back-label="T.back" @back="closeToList">
    <template v-if="current">
      <article class="m-annread" :class="{ 'is-warning': current.type === 'warning' }">
        <div v-if="current.banner" class="m-annread__banner"><img :src="current.banner" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" /></div>
        <div v-else class="m-annread__banner"><MAnnouncementHero :id="current.id" :title="current.title" /></div>
        <h2 class="m-annread__title">{{ current.title }}</h2>
        <p class="m-annread__meta"><span class="m-annpage__mode">{{ T.categories[current.category] || current.category }}</span><span v-if="current.mode !== 'notice'" class="m-annpage__mode">{{ T.modes[current.mode] }}</span><time v-if="current.published">{{ dateOf(current.published) }}</time><span v-if="current.mode === 'must-read' && ackedAt(current.id)">{{ T.acknowledged.replace('{time}', timeOf(ackedAt(current.id))) }}</span></p>
        <MMarkdown :source="current.body" @open-url="(u) => emit('open-url', u)" />
        <div class="m-annpage__actions">
          <MButton v-if="current.url" variant="tonal" icon="open_in_new" @click="emit('open-url', current.url)">{{ T.open }}</MButton>
          <MButton v-if="current.dismissible && !current.read" variant="text" @click="emit('dismiss', current.id)">{{ T.dismiss }}</MButton>
        </div>
      </article>
    </template>
    <template v-else>
      <MSeg v-if="options.length > 2" v-model="filter" :label="T.title" :options="options" />
      <ul v-if="shown.length" class="m-annpage">
        <li v-for="item in shown" :key="item.id">
          <button type="button" class="m-annpage__item" :class="{ 'is-read': item.read, 'is-warning': item.type === 'warning' }" @click="open(item)">
            <span v-if="item.banner" class="m-annpage__thumb"><img :src="item.banner" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" /></span>
            <span v-else-if="item.type !== 'warning'" class="m-annpage__thumb"><MAnnouncementHero :id="item.id" :title="item.title" thumb /></span>
            <span v-else class="m-annpage__icon"><MIcon :name="item.type === 'warning' ? 'warning' : CATEGORY_ICON[item.category] || 'campaign'" fill /></span>
            <span class="m-annpage__text">
              <span class="m-annpage__head"><b>{{ item.title }}</b><span v-if="!item.read && !item.snoozed && !item.builtin" class="m-annpage__new" :aria-label="T.newOne" /></span>
              <span class="m-annpage__meta"><span class="m-annpage__mode">{{ T.categories[item.category] || item.category }}</span><span v-if="item.mode !== 'notice'" class="m-annpage__mode">{{ T.modes[item.mode] }}</span><time v-if="item.published">{{ dateOf(item.published) }}</time></span>
              <span v-if="summary(item)" class="m-annpage__sum">{{ summary(item) }}</span>
            </span>
          </button>
        </li>
      </ul>
      <p v-else class="m-annpage__none">{{ T.none }}</p>
    </template>
  </MPage>
</template>
