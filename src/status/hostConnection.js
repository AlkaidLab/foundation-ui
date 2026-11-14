// Whether the host (Sunshine) answers. A pure state machine: online -> offline -> restarting -> online, and a restart that fails goes back to offline with its
// reason. The product probes and restarts; this decides what the window shows and when the next probe is due. The retry pace is the one of the old
// error page: one probe a second for the first ten, then every 5 s four times, then every 30 s.
//
// A window that opens while the host is still starting (the computer was just switched on, the service has not published its credential yet, the first answers of a cold host take
// seconds) starts in `connecting`, not in `online`: a neutral state that probes with a short backoff and says nothing is wrong. It becomes `online` at the first answer and `offline`
// only when a failure is certain: the grace has run out (CONNECT_GRACE_S) or the product says the host is not installed ({ type: 'certain' }). The Web UI, which a running host
// has just served, starts `online` as before.

export const OFFLINE_AFTER = 2 // failed probes in a row before the window says offline (one dropped answer is not an outage)
export const FAST_ROUNDS = 10
export const SLOW_ROUNDS = 4
export const RESTART_TRIES = 20 // probes while a restart runs (one every 2 s)
export const CONNECT_GRACE_S = 60 // seconds a starting window keeps trying before it calls the host offline

/** Seconds until the next probe after `waited` seconds of connecting: quick at first (a host that is a moment away answers in a second or two), then calmer. */
export const connectDelay = (waited) => (waited < 6 ? 1 : waited < 20 ? 2 : 3)

/** Seconds until the next probe after `round` failed probes while offline. */
export const retryDelay = (round) => (round <= FAST_ROUNDS ? 1 : round <= FAST_ROUNDS + SLOW_ROUNDS ? 5 : 30)

/** `verdict` is set by the product's read of the operating system (hostLoss.js): '' | 'unresponsive' | 'stopped' | 'requested' | 'expected' */
export const initialConnection = () => Object.freeze({ status: 'online', fails: 0, round: 0, nextIn: 0, probing: false, mode: '', attempt: 0, error: '', recovered: false, verdict: '', waited: 0 })
/** The state of a window that has just opened and has not heard from the host yet: it probes at once. */
export const startingConnection = () => Object.freeze({ ...initialConnection(), status: 'connecting', probing: true })
const offlineNow = (state) => ({ ...initialConnection(), status: 'offline', fails: state.fails + 1, round: 1, nextIn: retryDelay(1) })

/**
 * Events: { type: 'probe', ok } the result of a probe; { type: 'tick' } one second passed; { type: 'retry' } the person asks for a probe now;
 * { type: 'restart', mode: 'service' | 'user' } a restart was started; { type: 'restart-failed', message } the restart could not be started.
 * `recovered` is true in the state that comes right after offline or restarting turned online (the product returns to the page then).
 */
export function connection(state, event) {
  switch (event.type) {
    case 'probe': {
      if (event.ok) return { ...initialConnection(), recovered: state.status !== 'online' }
      if (state.status === 'connecting') {
        // still starting: not a failure to show. Only when the grace has run out is it one.
        return state.waited >= CONNECT_GRACE_S ? offlineNow(state) : { ...state, fails: state.fails + 1, probing: false, nextIn: connectDelay(state.waited), recovered: false }
      }
      if (state.status === 'online') {
        const fails = state.fails + 1
        return fails >= OFFLINE_AFTER ? { ...initialConnection(), status: 'offline', fails, round: 1, nextIn: retryDelay(1) } : { ...state, fails, recovered: false }
      }
      if (state.status === 'restarting') {
        const attempt = state.attempt + 1
        return attempt >= RESTART_TRIES
          ? { ...initialConnection(), status: 'offline', fails: state.fails, round: 1, nextIn: retryDelay(1), error: 'timeout', mode: state.mode }
          : { ...state, attempt, recovered: false }
      }
      const round = state.round + 1
      return { ...state, round, nextIn: retryDelay(round), probing: false, recovered: false }
    }
    case 'tick': {
      if (state.status === 'connecting') {
        const waited = state.waited + 1
        if (state.probing) return { ...state, waited }
        const nextIn = Math.max(0, state.nextIn - 1)
        return { ...state, waited, nextIn, probing: nextIn === 0 }
      }
      if (state.status !== 'offline' || state.probing) return state
      const nextIn = Math.max(0, state.nextIn - 1)
      return { ...state, nextIn, probing: nextIn === 0 }
    }
    case 'certain':
      // the product knows the host cannot come up by itself (it is not installed): no grace
      return state.status === 'connecting' ? offlineNow(state) : state
    case 'retry':
      return state.status === 'offline' ? { ...state, nextIn: 0, probing: true, error: '' } : state
    case 'restart':
      return state.status === 'online' ? state : { ...initialConnection(), status: 'restarting', fails: state.fails, mode: event.mode || 'service' }
    case 'restart-failed':
      return state.status === 'restarting' ? { ...initialConnection(), status: 'offline', fails: state.fails, round: 1, nextIn: retryDelay(1), error: String(event.message || 'failed'), mode: state.mode } : state
    default:
      return state
  }
}
