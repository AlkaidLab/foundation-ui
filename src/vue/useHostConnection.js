import { onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { connection, initialConnection, startingConnection } from '../status/hostConnection.js'
import { createHostStopWatch } from '../telemetry/crash.js'
import { createHostLossWatch, createHungWatch, hungProbeDue, HUNG_AFTER_MS } from '../status/hostLoss.js'

/**
 * The connection to the host as a reactive state (see status/hostConnection.js for the machine). The product gives `probe()` (true when the host answers) and
 * the restarts it can do (`restartService()`, `restartUser()`; a product that cannot restart a dead host, the Web UI, gives none). One timer of a second drives
 * everything: a probe every `pollMs` while online, the countdown while offline, a probe every 2 s while a restart runs. `onRecovered` runs once when the host
 * is back (the product returns to the page the person was on).
 * `starting`: the window has just opened and the host may still be coming up (the panel at the start of the computer): the state is `connecting` (neutral, quick backoff,
 * no error) until the first answer or a certain failure (status/hostConnection.js). `facts().service === 'missing'` with no host process is certain at once.
 */
export function useHostConnection({ starting = false, probe, restartService = null, restartUser = null, pollMs = 4000, onRecovered = null, onLost = null, facts = null, onHung = null, onHungEnd = null, hungAfterMs = HUNG_AFTER_MS, now = () => Date.now() } = {}) {
  const state = reactive({ ...(starting ? startingConnection() : initialConnection()) })
  const apply = (event) => { Object.assign(state, connection({ ...state }, event)) }
  // A silence is not a stop. `facts()` is the product's read of the operating system (status/hostLoss.js: is the host process there, is it the one that answered before, what the
  // service manager says, did the product ask for the stop). `onLost({ at, reason })` runs once per outage, on hard evidence only: the process is gone or is a new one, and nobody asked
  // (a restart of the product's own, an installer, the service manager). A host that is silent while the same process runs is `state.verdict === 'unresponsive'` (「主机无响应」):
  // the offline state says so, and there is no stop surface and no crash bundle. Without `facts` (the Web UI) a silence is always 'unresponsive'.
  const stopWatch = createHostStopWatch()
  const lossWatch = createHostLossWatch({ facts, onLost, onVerdict: (kind) => { state.verdict = kind }, isExpected: () => stopWatch.expected() })
  // `onHung({ at, seconds })` runs once per outage when the verdict is still 'unresponsive' (the same process runs, nothing answers) after `hungAfterMs`: the product shows the dialog
  // 「Sunshine 没有响应」. `onHungEnd()` runs when the host answers again, so the product closes it. A hard stop (verdict 'stopped') is the stop surface's, not this one's.
  const hung = createHungWatch({ afterMs: hungAfterMs, now, onHung, onEnd: onHungEnd })
  watch(() => state.status, (status) => {
    const silent = stopWatch.feed(status)
    if (status === 'online') { hung.answered(); void lossWatch.online() }
    else if (silent) { hung.silence(silent.at); state.verdict = 'unresponsive'; void lossWatch.lost(silent.at) }
  }, { immediate: true })
  let timer = 0
  let busy = false
  let seconds = 0
  async function check() {
    if (busy) return
    busy = true
    try {
      const ok = !!(await probe())
      apply({ type: 'probe', ok })
      if (ok && state.status === 'online') void lossWatch.refresh()
    } catch { apply({ type: 'probe', ok: false }) } finally { busy = false }
  }
  function second() {
    seconds++
    if (state.status === 'online') { if (seconds % Math.max(1, Math.round(pollMs / 1000)) === 0) void check() }
    else if (state.status === 'offline') { apply({ type: 'tick' }); if (state.probing || hungProbeDue({ shown: hung.shown, seconds })) void check(); if (seconds % 3 === 0) void lossWatch.reassess(); hung.tick(state) }
    else if (state.status === 'restarting' && seconds % 2 === 0) void check()
    else if (state.status === 'connecting') { apply({ type: 'tick' }); if (state.probing) void check(); if (seconds % 3 === 0) void certainty() }
  }
  // while connecting: is the host certainly not coming? Only when the service manager says it is not installed and no host process runs. A stopped service may be a delayed start.
  async function certainty() {
    if (!facts || state.status !== 'connecting') return
    try { const f = await facts(); if (f && f.service === 'missing' && !f.running) apply({ type: 'certain' }) } catch { /* no facts: the grace decides */ }
  }
  async function restart(mode = 'service') {
    const run = mode === 'user' ? restartUser : restartService
    if (!run || state.status === 'online') return
    apply({ type: 'restart', mode })
    try { await run() } catch (error) { apply({ type: 'restart-failed', message: error?.message || String(error) }) }
  }
  function retry() { apply({ type: 'retry' }); void check() }
  watch(() => state.recovered, (on) => { if (on) onRecovered?.() })
  onMounted(() => { void check(); timer = setInterval(second, 1000) })
  onBeforeUnmount(() => clearInterval(timer))
  return { state, retry, restart, check, expectRestart: (ms) => stopWatch.expectRestart(ms), canRestart: !!restartService, canUserMode: !!restartUser }
}
