import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'

// The running time of the stream ticks on a local clock. The host reports `uptime_ms` with every poll (every three seconds); a tile that showed that value moved in steps of three. The clock keeps the
// START of the session (the instant of the report less its uptime) and counts from it, so a tile shows 1:27, 1:28, 1:29 and a poll only corrects a start that was wrong by more than a second and a half
// (the report's own jitter does not make the clock step back). One timer per clock, set for the next whole second of the session, only while a session runs; no request is made for it.
export const CLOCK_JITTER_MS = 1500

/** The start the clock keeps after a report: the one it had unless the report differs by more than the jitter. `at` is the instant (ms since the epoch) the uptime was read. */
export function anchorOf(current, uptimeMs, at, jitter = CLOCK_JITTER_MS) {
  if (!Number.isFinite(uptimeMs) || !Number.isFinite(at)) return current
  const start = at - uptimeMs
  return current === null || !Number.isFinite(current) || Math.abs(start - current) > jitter ? start : current
}

/** Milliseconds until the session's next whole second (at least 1). */
export function untilNextSecond(start, now) {
  const into = (now - start) % 1000
  return Math.max(1, Math.ceil(1000 - (into < 0 ? into + 1000 : into)) + 4)
}

/**
 * `live()` says whether a session runs, `report()` returns `{ uptimeMs, at }` of the latest poll (or null). Returns `{ uptimeMs }`, a ref of the session's running time in ms (null while there is none)
 * that changes once per second of the session. `now` and the timers can be replaced (tests).
 */
export function useSessionClock({ live, report, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout }) {
  let start = null
  const tick = ref(now())
  const startRef = ref(null)
  let timer = 0
  const arm = () => {
    clearTimer(timer); timer = 0
    if (!live() || start === null) return
    timer = setTimer(() => { timer = 0; tick.value = now(); arm() }, untilNextSecond(start, now()))
  }
  watch([live, () => report()], () => {
    if (!live()) { start = null; startRef.value = null; clearTimer(timer); timer = 0; return }
    const r = report()
    const next = r ? anchorOf(start, r.uptimeMs, r.at) : start
    if (next !== start) { start = next; startRef.value = next }
    tick.value = now()
    arm()
  }, { immediate: true })
  if (getCurrentInstance()) onBeforeUnmount(() => { clearTimer(timer); timer = 0 })
  const uptimeMs = computed(() => (startRef.value === null ? null : Math.max(0, tick.value - startRef.value)))
  return { uptimeMs }
}
