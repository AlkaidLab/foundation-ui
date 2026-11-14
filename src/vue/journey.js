// The state of the connect journey on the overview (device -> install -> pair -> done): kept locally per interface, advanced by the person and by the host
// (the step moves on by itself when a client has been paired since the journey began). No Vue, no DOM.
export const JOURNEY_STEPS = 4
const KEY = (storageKey) => `foundation-ui.journey.${storageKey}`
const EMPTY = Object.freeze({ step: 0, os: '', started: -1, dismissed: false, opens: 0, since: 0 })

export function readJourney(storageKey, storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage?.getItem(KEY(storageKey)) || 'null')
    if (v && typeof v === 'object') return { step: Math.max(0, Math.min(JOURNEY_STEPS - 1, Number(v.step) || 0)), os: ['windows', 'macos', 'linux', 'android', 'ios', 'harmony', 'tv'].includes(v.os) ? v.os : '', started: Number.isInteger(v.started) ? v.started : -1, dismissed: v.dismissed === true, opens: Math.max(0, Number(v.opens) || 0), since: Number(v.since) || 0 }
  } catch { /* corrupted: the start */ }
  return { ...EMPTY }
}
export function writeJourney(storageKey, state, storage = globalThis.localStorage) { try { storage?.setItem(KEY(storageKey), JSON.stringify(state)) } catch { /* storage unavailable */ } }

/** The journey is shown while the host has no paired client and the person has not closed it; the first time it is shown it counts the clients there are. */
export const journeyActive = (count, state) => count === 0 && !state.dismissed

/** The state after the host's client count was read: a client paired since the journey began moves it to the last step. */
export function journeyAfterCount(state, count) {
  const started = state.started < 0 ? count : state.started
  const next = { ...state, started }
  if (count > started && state.step < JOURNEY_STEPS - 1) next.step = JOURNEY_STEPS - 1
  return next
}

export const JOURNEY_STALE_DAYS = 7
export const JOURNEY_STALE_OPENS = 3
/** One more time the overview opened with the journey on it (the first time starts the clock). */
export const journeyOpened = (state, now = Date.now()) => ({ ...state, opens: state.opens + 1, since: state.since || now })
/** The card suggests moving itself off the overview (never removes itself) after a week or three opens without a new pairing. */
export const journeyStale = (state, now = Date.now()) => state.step < JOURNEY_STEPS - 1 && !!state.since && (now - state.since >= JOURNEY_STALE_DAYS * 86400000 || state.opens >= JOURNEY_STALE_OPENS)
