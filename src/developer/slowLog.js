// The lines of the panel's log that say where time went: slow calls, blocked frames, late timers, stalls of the window thread, the cover after a change of scale and the guard.
// Each becomes a row { at, level, kind, label, ms, text }, newest first.

const LINE = /^\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d+)?)\] \[(\w+)\] \[[^\]]*\] (.*)$/
export const KINDS = Object.freeze(['fetch', 'invoke', 'frame', 'timer', 'stall', 'cover', 'warm', 'guard', 'cold'])

/** -> a row, or null when the line is not about timing. */
export function parseLogLine(line) {
  const m = LINE.exec(String(line).trim())
  if (!m) return null
  const [, at, level, rest] = m
  let r = /^\[renderer\] (fetch|invoke|frame|timer) (\S+) (\d+(?:\.\d+)?) ms ?(.*)$/.exec(rest)
  if (r) return { at, level, kind: r[1], label: r[2], ms: Number(r[3]), text: r[4] }
  r = /^\[stall\] (.*)$/.exec(rest)
  if (r) { const ms = /answered in (\d+) ms/.exec(r[1]); return { at, level, kind: 'stall', label: 'window thread', ms: ms ? Number(ms[1]) : 0, text: r[1] } }
  r = /^\[dpi-cover\] (.*)$/.exec(rest)
  if (r) { const ms = /(\d+) ms/.exec(r[1]); return { at, level, kind: 'cover', label: 'cover', ms: ms ? Number(ms[1]) : 0, text: r[1] } }
  r = /^\[(warm|guard|cold)\] (.*)$/.exec(rest)
  if (r) { const ms = /(?:took|after|ago|in) (\d+) ms/.exec(r[2]); return { at, level, kind: r[1], label: r[1], ms: ms ? Number(ms[1]) : 0, text: r[2] } }
  return null
}

export function parseLog(text, { kinds = null, minMs = 0, limit = 300 } = {}) {
  const rows = []
  for (const line of String(text).split(/\r?\n/)) {
    const row = parseLogLine(line)
    if (!row || (kinds && !kinds.includes(row.kind)) || row.ms < minMs) continue
    rows.push(row)
  }
  return rows.slice(-limit).reverse()
}
