import { computed, ref } from 'vue'
import { DEV_KEY, SOURCE_KEY } from '../announcements/store.js'

// Developer mode: seven quick taps on the version turn it on (the way a phone does it). It only unlocks tools for the people who build this: a local announcement source, and later the
// channels that are not for everyone. It is a flag in the storage of this window; it sends nothing anywhere.
export const TAPS_NEEDED = 7
export const TAP_WINDOW_MS = 3000
const store = () => { try { return globalThis.localStorage } catch { return null } }
const read = (key) => { try { return store()?.getItem(key) ?? '' } catch { return '' } }
const write = (key, value) => { try { if (value === '' || value === null) store()?.removeItem(key); else store()?.setItem(key, value) } catch { /* not remembered */ } }
const on = ref(read(DEV_KEY) === '1')
const source = ref(read(SOURCE_KEY))
let count = 0
let timer = 0

/** What one tap does: returns { enabled, remaining }; taps further apart than the window start again. */
export function tapOnVersion() {
  if (on.value) return { enabled: true, remaining: 0 }
  count += 1
  clearTimeout(timer); timer = setTimeout(() => { count = 0 }, TAP_WINDOW_MS)
  if (count >= TAPS_NEEDED) { count = 0; clearTimeout(timer); on.value = true; write(DEV_KEY, '1'); return { enabled: true, remaining: 0 } }
  return { enabled: false, remaining: TAPS_NEEDED - count }
}
/** A local address for the announcement file (the host, a port, a path); only this computer may use plain http. '' is no source. */
export const usableSource = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  try {
    const url = new URL(text)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.username || url.password || url.search || url.hash) return null
    if (url.protocol === 'https:' || (url.protocol === 'http:' && local)) return url.href
  } catch { /* not an address */ }
  return null
}
export const useDeveloperMode = () => ({
  enabled: computed(() => on.value),
  source: computed(() => source.value),
  tap: tapOnVersion,
  disable() { on.value = false; source.value = ''; write(DEV_KEY, ''); write(SOURCE_KEY, '') },
  setSource(value) { const ok = usableSource(value); if (ok === null) return false; source.value = ok; write(SOURCE_KEY, ok); return true },
})
