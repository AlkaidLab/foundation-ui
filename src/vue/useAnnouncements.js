import { computed, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { BUILTIN_ITEMS, OPEN_SOURCE_ID, acknowledge as storeAck, activeItems, announcementUrlsFor, dismiss as storeDismiss, fetchAnnouncements, hideUntilUpdate, loadAcked, loadDismissed, loadHidden, loadRevisions, loadShown, markShown as storeShown, noteRevision, popupItem } from '../announcements/index.js'

// One shared state for the strip, the list sheet and the rail badge: the file is fetched once and refreshed while a page that shows it is open.
const items = ref([])
const dismissed = ref([])
const shown = ref(loadShown())
const acked = ref(loadAcked())
const hidden = ref(loadHidden())
const revisions = ref(loadRevisions())
const raw = ref([])
const clock = ref(Date.now())
let users = 0
let timer = 0
let ticker = 0

async function refresh(force = false, locale = 'en') {
  items.value = await fetchAnnouncements({ force, urls: announcementUrlsFor(locale) })
  raw.value = items.value
  shown.value = loadShown(); acked.value = loadAcked(); hidden.value = loadHidden(); revisions.value = loadRevisions()
  dismissed.value = loadDismissed()
  clock.value = Date.now()
}

export function useAnnouncements({ locale = 'en', version = null } = {}) {
  const options = () => ({ now: clock.value, version: unref(version) || null, locale: unref(locale) || 'en', dismissed: dismissed.value, shown: shown.value, acked: acked.value, hidden: hidden.value, revisions: revisions.value })
  // what ships with the product comes first and is there offline too; a file cannot replace it
  const everything = computed(() => [...BUILTIN_ITEMS, ...items.value.filter((i) => i.id !== OPEN_SOURCE_ID)])
  const list = computed(() => activeItems(everything.value, options()))
  // the strip is for a warning that is not read yet; every other announcement is content that lives in the tile, the page and the bell
  const top = computed(() => list.value.find((item) => item.mode === 'notice' && item.type === 'warning' && !item.read) || null)
  // what the bell counts, and the strip and the rail say the same number: announcements that are not read and not hidden
  const unread = computed(() => list.value.filter((item) => !item.read && !item.snoozed && !item.builtin).length)
  // the popup to show now (a must-read first, else a modal not shown yet), and what the person does with it
  const popup = computed(() => popupItem(items.value, options()))
  // every read state is recorded with the revision of the content it belongs to
  const note = (id) => { const item = list.value.find((x) => x.id === id); if (item && noteRevision(id, item.revision)) revisions.value = loadRevisions() }
  const markShown = (id) => { if (storeShown(id)) shown.value = loadShown(); note(id) }
  const acknowledge = (id) => { if (storeAck(id)) acked.value = loadAcked(); note(id) }
  const dismiss = (id) => {
    const item = list.value.find((x) => x.id === id)
    if (item && storeDismiss(id, { item })) dismissed.value = loadDismissed()
    note(id)
  }
  /** 下次公告更新前不再显示 */
  const hide = (id) => { const item = list.value.find((x) => x.id === id); if (item && hideUntilUpdate(id, item.revision)) hidden.value = loadHidden() }
  /** opening an announcement in the page reads it: a notice is dismissed, the popups are marked as seen */
  const read = (id) => {
    const item = list.value.find((x) => x.id === id)
    if (!item || item.read) return
    if (item.mode === 'must-read') acknowledge(id)
    else if (item.mode === 'modal') markShown(id)
    else if (item.dismissible) dismiss(id)
  }
  onMounted(() => {
    if (users++ === 0) {
      void refresh(false, unref(locale))
      timer = setInterval(() => { void refresh(false, unref(locale)) }, 10 * 60 * 1000)
      ticker = setInterval(() => { clock.value = Date.now() }, 60 * 1000)
    }
  })
  onBeforeUnmount(() => { if (--users === 0) { clearInterval(timer); clearInterval(ticker) } })
  // a manual refresh is the one thing that asks the network again
  return { list, top, unread, popup, markShown, acknowledge, dismiss, hide, read, refresh: (force = true) => refresh(force, unref(locale)) }
}

/** The unread count for places that only show a badge (the rail); the page that owns the strip keeps the file fresh. */
export const useAnnouncementBadge = ({ locale = 'en', version = null } = {}) => {
  const state = useAnnouncements({ locale, version })
  return { unread: state.unread }
}
