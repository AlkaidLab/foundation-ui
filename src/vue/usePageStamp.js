import { inject, onBeforeUnmount, provide, reactive, toValue, watchEffect } from 'vue'

// MPage owns the one place the "updated" stamp is drawn (the trailing end of its header). A component inside the page that
// fetches the data (a list, a status read) registers its time and its refresh here instead of drawing a stamp of its own.
const KEY = 'm-page-stamp'

/** Called by MPage: the slot the stamp reads. */
export function providePageStamp() {
  const slot = reactive({ at: 0, refreshing: false, refresh: null, locale: '' })
  provide(KEY, slot)
  return slot
}

/**
 * Called by a component inside a page. `at` is the time (ms) of the last read, a ref or getter; `refresh` runs when the stamp is clicked.
 * Outside an MPage this does nothing.
 */
export function usePageStamp({ at, refreshing = false, refresh = null, locale = '' } = {}) {
  const slot = inject(KEY, null)
  if (!slot) return null
  watchEffect(() => { slot.at = Number(toValue(at)) || 0; slot.refreshing = !!toValue(refreshing) })
  slot.refresh = refresh
  watchEffect(() => { slot.locale = String(toValue(locale) || '') })
  onBeforeUnmount(() => { slot.at = 0; slot.refreshing = false; slot.refresh = null; slot.locale = '' })
  return slot
}
