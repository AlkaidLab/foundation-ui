// Whether the host (Sunshine) STOPPED, as against not answering. A failed or slow HTTP call proves nothing about the process: a pairing long poll that ran out its
// limit, a proxy that was slow or a firewall made the window say 「Sunshine 意外停止」 while Sunshine.exe had run for hours. The surface for a stop is shown on facts of the
// operating system only, read by the product (`facts()`):
//   { running, pid, startedMs, service, expectedStop }
//   running       a Sunshine host process exists; pid / startedMs: its id and its creation time (ms)
//   service       'running' | 'stopped' | 'start_pending' | 'stop_pending' | 'paused' | 'missing' | 'unknown' (the service manager's state of the Sunshine service)
//   servicePid    the process id of the service wrapper (sunshinesvc) that runs the host: a service that was stopped and started is another process, a host that crashed and was started again by the
//                 wrapper is the same one
//   expectedStop  the product itself (a restart, an update, the Web UI's restart button) has asked for the stop
// and the state of the same facts while the host was last known to answer (`baseline`).

/** A state of the service manager in which somebody has asked for a stop, a start or a pause: a restart of the service goes through it. */
const REQUESTED_SERVICE = new Set(['stopped', 'stop_pending', 'start_pending', 'paused'])

/**
 * -> { kind, reason }
 *   'stopped'      hard evidence that the host process ended and nobody asked: it is gone, or it is a new process (another id or a newer start). The only kind that opens
 *                  the stop surface.
 *   'expected'     the stop was asked for by this product (restart, update, the Web UI)
 *   'requested'    the service manager is stopping or starting the service (an installer, 「net stop」, a restart of the service)
 *   'unresponsive' the same process still runs, or nothing can be told: 「主机无响应」, no stop surface, no crash bundle
 */
export function judgeHostLoss({ baseline = null, after = null, expected = false } = {}) {
  if (!after) return { kind: 'unresponsive', reason: 'no-facts' }
  if (expected || after.expectedStop) return { kind: 'expected', reason: 'asked' }
  if (REQUESTED_SERVICE.has(after.service)) return { kind: 'requested', reason: `service-${after.service}` }
  if (!baseline || !baseline.running) return { kind: 'unresponsive', reason: 'no-baseline' }
  // The service itself was stopped and started (a person, an installer, a restart of the service): its wrapper is another process now. That holds whatever the panel saw of the outage: a window that
  // sleeps in the tray, or one whose timers were throttled, learns of the new host only after the restart, with nothing left of the moment when the service said 'stopped'.
  if (baseline.servicePid && after.servicePid && after.servicePid !== baseline.servicePid) return { kind: 'requested', reason: 'service-restarted' }
  if (!after.running) return { kind: 'stopped', reason: 'process-gone' }
  if (after.pid !== baseline.pid || after.startedMs > baseline.startedMs) return { kind: 'stopped', reason: 'process-replaced' }
  return { kind: 'unresponsive', reason: 'same-process' }
}

/**
 * The watch the connection composable drives. `facts()` -> the facts or null; `onLost({ at, reason })` runs once per outage on a hard stop; `onVerdict(kind)` on every change of
 * the verdict. `online()` is called when the host answered, `lost(at)` when it stops answering, `reassess()` while it stays silent (a process that ends later is caught then).
 */
export function createHostLossWatch({ facts, onLost = null, onVerdict = null, isExpected = () => false } = {}) {
  let baseline = null
  let lostAt = 0
  let reported = false
  let verdict = ''
  // once somebody has asked for the stop (a restart of the product, the service manager), the outage stays theirs: the new process that follows is the answer to the request
  let asked = ''
  const read = async () => { try { return facts ? await facts() : null } catch { return null } }
  const set = (kind) => { if (kind !== verdict) { verdict = kind; onVerdict?.(kind) } }
  async function judge() {
    let v = judgeHostLoss({ baseline, after: await read(), expected: isExpected() })
    if (v.kind === 'requested' || v.kind === 'expected') asked = v.kind
    else if (asked && v.kind === 'stopped') v = { kind: asked, reason: 'after-request' }
    set(v.kind)
    if (v.kind === 'stopped' && !reported) { reported = true; onLost?.({ at: lostAt, reason: v.reason }) }
    return v
  }
  return {
    async online() { reported = false; lostAt = 0; asked = ''; set(''); const f = await read(); if (f && f.running) baseline = f },
    /** while the host answers: the facts of the process that answers (a host that was restarted quickly, without a silence, is the baseline from then on) */
    async refresh() { if (lostAt) return; const f = await read(); if (f && f.running) baseline = f },
    async lost(at) { if (lostAt) return null; lostAt = at; return judge() },
    async reassess() { return lostAt && !reported ? judge() : null },
    get verdict() { return verdict },
    get baseline() { return baseline },
  }
}

/** How long a silence of a host whose process still runs lasts before the dialog 「Sunshine 没有响应」 is offered (the offline page says it from the first seconds). */
export const HUNG_AFTER_MS = 30_000

/** While the dialog 「Sunshine 没有响应」 is open the host is probed every this many seconds, whatever the offline backoff (30 s by then): the dialog closes within this long of the host answering. */
export const HUNG_PROBE_EVERY_S = 5

/** Whether the probe of this second is due because the hung dialog is open (the backoff of the offline state would wait up to 30 s). */
export const hungProbeDue = ({ shown, seconds }) => !!shown && seconds % HUNG_PROBE_EVERY_S === 0

/**
 * The hung dialog's schedule. `silence(at)` when the host stops answering; `tick({ verdict, status })` every second; `answered()` when it answers again.
 * `onHung({ at, seconds })` runs once per outage, when the verdict is still 'unresponsive' (the same process runs) and the host is offline after `afterMs`;
 * `onEnd()` runs when the host answers after the dialog was offered. A hard stop (verdict 'stopped') is the stop surface's, never this one's.
 */
export function createHungWatch({ afterMs = HUNG_AFTER_MS, now = () => Date.now(), onHung = null, onEnd = null } = {}) {
  let at = null
  let shown = false
  return {
    silence(when) { at = when },
    tick({ verdict, status }) {
      if (shown || at === null || verdict !== 'unresponsive' || status !== 'offline') return false
      const elapsed = now() - at
      if (elapsed < afterMs) return false
      shown = true
      onHung?.({ at, seconds: Math.round(elapsed / 1000) })
      return true
    },
    answered() { at = null; if (shown) { shown = false; onEnd?.(); return true } return false },
    get shown() { return shown },
  }
}
