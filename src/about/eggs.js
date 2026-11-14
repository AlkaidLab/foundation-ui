// The easter eggs of the about page and how many quick taps open each: seven on the version line (developer mode, and the credits), six on 薇薇
// (the pixel friends walk in). Taps count while each comes within the window of the one before; a slower tap starts again at one. The version
// line uses the window of developer mode, so the tap that turns it on is the tap that opens the credits; 薇薇 asks for a quicker run, so reading
// her lines one by one never sets it off.
export const CREDITS_TAPS = 7
export const CREDITS_WINDOW_MS = 3000
export const VIVI_TAPS = 6
export const EGG_WINDOW_MS = 1200

/**
 * A counter of quick taps: `tap(now)` returns true on the tap that reaches `needed` (and starts again), false otherwise. `now` is a time in
 * milliseconds (the caller passes performance.now() or Date.now(); tests pass their own clock).
 */
export function tapCounter(needed, windowMs = EGG_WINDOW_MS) {
  let count = 0
  let last = -Infinity
  return {
    tap(now) {
      count = now - last <= windowMs ? count + 1 : 1
      last = now
      if (count < needed) return false
      count = 0
      last = -Infinity
      return true
    },
    get count() { return count },
    reset() { count = 0; last = -Infinity },
  }
}
