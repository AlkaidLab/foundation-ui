import { computed, ref, unref, watch } from 'vue'

/**
 * What the overview needs for the connect journey card: the card's data and the two flags of the layout context. `count` is the number of paired clients
 * (null until the host answered), `latest` the name of the newest one. The card is on by default while there is no client and stays on, as the last step, in the
 * session in which the first client paired (so the person sees it done); `hasClients` turns the compact pairing card and the download card on.
 */
export function useJourneyHome({ storageKey, count, latest = () => '', locale, qr = null, pairQr = null, canPin = () => true, assetsOf = null, versionOf = null }) {
  const read = (x) => (typeof x === 'function' ? x() : unref(x))
  const done = ref(false)
  watch(() => read(count), (n, was) => { if (was === 0 && n > 0) done.value = true })
  const n = computed(() => read(count))
  const data = computed(() => (n.value === null || n.value === undefined ? null : { storageKey, locale: String(read(locale)), qr, pairQr, assetsOf, versionOf, canPin: !!read(canPin), count: n.value, latest: String(read(latest) || '') }))
  const ctx = computed(() => ({ journey: n.value === 0 || done.value, hasClients: n.value === null || n.value === undefined ? undefined : n.value > 0 }))
  return { data, ctx, done }
}
