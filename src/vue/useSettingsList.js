import { computed, ref, unref } from 'vue'
import { SEARCH_INDEX } from '../settings/searchIndex.js'
import { labelOf } from '../settings/labels.js'
import { buildSettingsEntries } from '../settings/search.js'
import { dualsenseEntries } from '../settings/dualsense.js'
import { SETTINGS_CATEGORIES, STANDALONE_CATEGORIES, settingsGroups } from '../settings/model.js'
import { rowKeywords, rowLines } from '../settings/rowLines.js'
import { recentRows } from '../settings/recent.js'
import { clearRecentKeys, recentKeys, rememberRecent } from '../settings/recentStore.js'
export { scopeRecent, hostRecentKey } from '../settings/recentStore.js'

// Shared by the Web UI and the control panel: the groups of the settings list pane (with live one-line values), the entries
// of the search (categories, every setting of the index by label in the interface language and the other one, and by key
// name, plus the DualSense tuning keys of the host's snapshot) and the "recently used" list kept in local storage.
//   locale: ref or string ('zh', 'en', ...); config: ref of the host's /api/config answer; dualsenseKeys: ref of snapshot.keys; sources: refs of what the second lines read
//   besides the configuration ({ clients, apps, components, ds, mic, usb }, see rowLines.js)
export { recentKeys, rememberRecent }
const recentList = recentKeys

export function useSettingsList({ locale, config = ref(null), dualsenseKeys = ref([]), sources = {}, storageKey } = {}) {
  const lang = computed(() => unref(locale) || 'en')
  const isZh = computed(() => String(lang.value).startsWith('zh'))
  const label = (key) => labelOf(lang.value, key)
  const other = computed(() => (isZh.value ? 'en' : 'zh'))
  const altLabel = (key) => labelOf(other.value, key)
  // the second line of every row of the products: the live state where there is one, else what is inside
  const lines = computed(() => rowLines({ locale: lang.value, config: unref(config), clients: unref(sources.clients), apps: unref(sources.apps), components: unref(sources.components), ds: unref(sources.ds), mic: unref(sources.mic), usb: unref(sources.usb), rtss: unref(sources.rtss) }))
  const groups = computed(() => settingsGroups({ label, lines: lines.value }))
  const categoryEntries = computed(() => [
    ...groups.value.flatMap((g) => g.items).map((item) => ({
      id: item.id, title: item.label, path: label('navbar.configuration'), icon: item.icon, route: item.route, params: item.params,
      keywords: `${altLabel(SETTINGS_CATEGORIES[item.category].labelKey)} ${rowKeywords(item.id)}`,
    })),
    // a destination of its own: the product opens its personalisation page, not the settings
    ...STANDALONE_CATEGORIES.map((id) => {
      const c = SETTINGS_CATEGORIES[id]
      // found by its own name in both languages only: the words of what is inside belong to the pages of 个性化 (rowLines.js appearance-*), so a search for one of them lands on that page and not on this one
      return { id, title: label(c.labelKey), path: '', icon: c.icon, route: id, keywords: altLabel(c.labelKey) }
    }),
  ])
  const entries = computed(() => [
    ...buildSettingsEntries({ index: SEARCH_INDEX, label, altLabel }),
    ...dualsenseEntries({ keys: unref(dualsenseKeys) || [], label, locale: lang.value, altLocale: other.value }),
  ])
  const searchItems = computed(() => [...categoryEntries.value, ...entries.value])
  const recentView = computed(() => ({
    title: label('shell.recent'), clearLabel: label('shell.clear'),
    items: recentRows(recentList.value, entries.value),
  }))
  const remember = (keyName) => rememberRecent(keyName, storageKey)
  const clearRecent = () => clearRecentKeys(storageKey)
  return { label, lines, groups, entries, searchItems, recent: recentList, recentView, remember, clearRecent }
}
