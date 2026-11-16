// The drawing rules of the linear wavy progress (MProgress), pure so that they are tested without a browser.
// Sources: Compose Material3 WavyProgressIndicator.kt (WavyProgressIndicatorDefaults.indicatorAmplitude: no wave at 10 % and below or 95 % and above;
// "When the progress becomes known, the indeterminate lines leave the track and the indicator then animates from no progress to the returned value") and
// LinearProgressIndicatorTokens.kt (gap 4 dp between the active indicator and the track, stop indicator 4 dp). Both files are in docs/authority/source-index.tsv.

export const FLAT_AT_OR_BELOW = 0.1
export const FLAT_AT_OR_ABOVE = 0.95
/** The finished bar: the track is shorter than the gap and the stop dot, so neither is drawn. */
export const DONE_AT = 0.985
/** How long the determinate parts need to fade out before the drawn value goes back to no progress behind them. */
export const FADE_OUT_MS = 200

export const isFlat = (shown) => shown <= FLAT_AT_OR_BELOW || shown >= FLAT_AT_OR_ABOVE
export const isDone = (shown) => shown >= DONE_AT

/**
 * The value that is drawn for the value that is given (`null` = the length is not known).
 * A value that only changes (up, or back down) is drawn at once; the width transition eases it. While the length is unknown the drawn value goes back to 0
 * unseen (the determinate parts have faded out); when a value is known again the bar starts from no progress and moves to it, it never cuts from one drawing to the other.
 * `schedule(fn, ms)` runs fn after ms (ms 0: after the next two frames, so that the 0 has been drawn first).
 */
export function createShown(initial, onShown, schedule) {
  let shown = initial == null ? 0 : initial
  let unknown = initial == null
  let current = initial
  const set = (v) => { if (v !== shown) { shown = v; onShown(v) } }
  return {
    get shown() { return shown },
    feed(value) {
      current = value
      if (value == null) {
        unknown = true
        schedule(() => { if (unknown) set(0) }, FADE_OUT_MS)
        return
      }
      if (unknown) {
        unknown = false
        set(0)
        schedule(() => { if (!unknown && current != null) set(current) }, 0)
        return
      }
      set(value)
    },
  }
}
