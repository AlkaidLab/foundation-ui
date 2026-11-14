// The numbers of the HUD, with no DOM in them: frame times from animation-frame timestamps, and counts over a sliding window.

/** Frame times over the last `windowMs`: fps, mean, 95th percentile and worst frame time, and the frames that missed (longer than 1.6 times the median, at least 24 ms). */
export function createFrameMeter({ windowMs = 2000 } = {}) {
  let stamps = []
  return {
    push(t) {
      stamps.push(t)
      const from = t - windowMs
      let i = 0
      while (i < stamps.length - 2 && stamps[i] < from) i += 1
      if (i) stamps = stamps.slice(i)
    },
    reset() { stamps = [] },
    stats() {
      if (stamps.length < 2) return { fps: 0, avgMs: 0, p95Ms: 0, worstMs: 0, dropped: 0, frames: stamps.length }
      const gaps = []
      for (let i = 1; i < stamps.length; i += 1) gaps.push(stamps[i] - stamps[i - 1])
      const sorted = [...gaps].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      const total = stamps[stamps.length - 1] - stamps[0]
      const limit = Math.max(24, median * 1.6)
      return { fps: total > 0 ? (gaps.length * 1000) / total : 0, avgMs: total / gaps.length, p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))], worstMs: sorted[sorted.length - 1], dropped: gaps.filter((g) => g > limit).length, frames: stamps.length }
    },
  }
}

/** Events with a weight (mutation records, long tasks) over the last `windowMs`: the sum in the window and the rate per second. */
export function createRateWindow({ windowMs = 10_000 } = {}) {
  let items = []
  let total = 0
  const trim = (now) => { const from = now - windowMs; while (items.length && items[0][0] < from) items.shift() }
  return {
    add(t, n = 1, value = 0) { items.push([t, n, value]); total += n; trim(t) },
    snapshot(now) { trim(now); const count = items.reduce((s, i) => s + i[1], 0); return { count, perSecond: count / (windowMs / 1000), max: items.reduce((m, i) => Math.max(m, i[2]), 0), total } },
    reset() { items = []; total = 0 },
  }
}

/** The text of the HUD, line by line, for the flags that are on. */
export function hudLines(flags, frame, longTasks, mutations) {
  const lines = []
  if (flags.hud) lines.push(`${Math.round(frame.fps)} fps  ${frame.avgMs.toFixed(1)} ms  p95 ${frame.p95Ms.toFixed(1)}  worst ${frame.worstMs.toFixed(1)}  missed ${frame.dropped}`)
  if (flags.longTasks) lines.push(`long tasks ${longTasks.count}${longTasks.count ? `  longest ${Math.round(longTasks.max)} ms` : ''}  (10 s)`)
  if (flags.mutations) lines.push(`DOM ${mutations.perSecond.toFixed(1)}/s  ${mutations.count} in 10 s  ${mutations.total} since on`)
  return lines
}
