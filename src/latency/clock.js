// The latency test clock (toolbox, 延迟测试时钟): one clock read every frame, the same on the host and, through the stream, on the client, so a photo of both
// screens gives the end-to-end latency as host reading − client reading, with no clock sync. Pure helpers, no DOM.

/**
 * A wall clock that advances smoothly between frames: Date.now() once as the anchor, performance.now() for the time since (monotonic, sub-millisecond),
 * so two readings a frame apart differ by the frame and never step back when the system clock is adjusted. resync() takes a new anchor (when the page is shown again).
 */
export function createClock({ now = () => Date.now(), perf = () => performance.now() } = {}) {
  let base = now() - perf()
  return {
    read: () => base + perf(),
    resync() { base = now() - perf() },
    /** how far the clock is from Date.now() now (the drift since the anchor) */
    drift: () => base + perf() - now(),
  }
}

const pad = (n, w) => String(n).padStart(w, '0')
/** HH:MM:SS.mmm in local time: always 12 characters (the digits are tabular, so the text never changes width). */
export function formatClock(ms) {
  const d = new Date(Math.floor(ms))
  return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}.${pad(d.getMilliseconds(), 3)}`
}

/** Where the sweep bar is in its second: 0 at .000, 0.999 at .999. */
export const sweepOf = (ms) => (((Math.floor(ms) % 1000) + 1000) % 1000) / 1000

/**
 * The display's refresh from the frame intervals (requestAnimationFrame deltas): the median of the last ones, a hitch (over 250 ms: a hidden page, a pause) left out.
 * interval is the error bound of a reading: a photo can catch the screen at any moment within one frame. Returns { hz, interval } or null with too few frames.
 */
export function frameStats(deltas, { min = 10 } = {}) {
  const d = deltas.filter((x) => x > 0 && x < 250).sort((a, b) => a - b)
  if (d.length < min) return null
  const mid = d.length >> 1
  const interval = d.length % 2 ? d[mid] : (d[mid - 1] + d[mid]) / 2
  return { hz: Math.round((1000 / interval) * 10) / 10, interval: Math.round(interval * 10) / 10 }
}

/** A ring of the last n frame intervals. */
export function deltaRing(n = 120) {
  const a = new Float64Array(n); let i = 0; let count = 0
  return {
    push(x) { a[i] = x; i = (i + 1) % n; count = Math.min(count + 1, n) },
    values: () => Array.from(count < n ? a.subarray(0, count) : a),
    clear() { i = 0; count = 0 },
  }
}
