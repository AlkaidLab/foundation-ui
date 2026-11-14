// Rolling history that the host does not keep: samples of the live numbers (for the curves), a summary of every finished session and
// minutes streamed per day. It lives in this interface's local storage, so it starts when the interface first runs and only holds what this
// interface has seen. Pure functions plus `createHistory(storage, key)`; the products feed it from the data they already poll.

import { sessionClientLabel } from './clientLabel.js'
const DAY = 86400000
const SAMPLE_MAX = 1200 // an hour at one sample every three seconds

export function pushSample(list, value, max = SAMPLE_MAX) {
  if (!Number.isFinite(value)) return list
  list.push(value)
  while (list.length > max) list.shift()
  return list
}

const dayKey = (at) => { const d = new Date(at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function createHistory(storage = globalThis.localStorage, key = 'foundation-ui.history.home') {
  const read = () => {
    try { const v = JSON.parse(storage?.getItem(key) || 'null'); if (v && typeof v === 'object') return { sessions: Array.isArray(v.sessions) ? v.sessions.slice(-200) : [], days: v.days && typeof v.days === 'object' ? v.days : {} } } catch { /* damaged: start again */ }
    return { sessions: [], days: {} }
  }
  const saved = read()
  const samples = {}
  let open = null
  const save = () => { try { storage?.setItem(key, JSON.stringify({ sessions: saved.sessions.slice(-200), days: saved.days })) } catch { /* storage unavailable: the history stays in memory */ } }
  return {
    samples,
    sessions: saved.sessions,
    days: saved.days,
    /** One sample of a named series (cpu, gpu, mem, bitrate, fps, latency, loss, dropped). */
    sample(name, value) { pushSample(samples[name] ||= [], value) },
    clear(name) { samples[name] = [] },
    /**
     * Call with the running session (or null) whenever the product polls. A session is summarised when it ends (at least ten seconds long):
     * start, length, client, application, average bitrate and frame rate, the worst latency and the dropped frames.
     */
    observe(session, now = Date.now()) {
      if (session && !open) open = { start: now, client: sessionClientLabel(session), app: session.app_name || '', n: 0, bitrate: 0, fps: 0, p95: 0, dropped: 0, loss: 0 }
      if (session && open) {
        open.n += 1
        open.client = sessionClientLabel(session) || open.client; open.app = session.app_name || open.app
        if (Number.isFinite(session.bitrate)) open.bitrate += session.bitrate / 1000
        const f = Number.isFinite(session.fpsMeasured) ? session.fpsMeasured : session.fps
        if (Number.isFinite(f)) open.fps += f
        if (Number.isFinite(session.latencyP95Ms)) open.p95 = Math.max(open.p95, session.latencyP95Ms)
        if (Number.isFinite(session.dropped_frames)) open.dropped = Math.max(open.dropped, session.dropped_frames)
        if (Number.isFinite(session.packet_loss)) open.loss = Math.max(open.loss, session.packet_loss)
      }
      if (!session && open) {
        const s = open; open = null
        const ms = now - s.start
        if (ms < 10000 || !s.n) return null
        const row = { start: s.start, end: now, ms, client: s.client, app: s.app, bitrate: +(s.bitrate / s.n).toFixed(1), fps: +(s.fps / s.n).toFixed(1), p95: +s.p95.toFixed(1), dropped: s.dropped, loss: +s.loss.toFixed(2) }
        saved.sessions.push(row)
        const k = dayKey(s.start)
        saved.days[k] = Math.round(((saved.days[k] || 0) + ms / 60000) * 10) / 10
        for (const old of Object.keys(saved.days)) if (Date.parse(old) < now - 90 * DAY) delete saved.days[old]
        save()
        return row
      }
      return null
    },
    last() { return saved.sessions[saved.sessions.length - 1] || null },
  }
}

/** Minutes streamed per day over the last `n` days, oldest first: [{ label, value }]. `extra` adds minutes by day key (from the host log). */
export function heatDays(days = {}, now = Date.now(), n = 30, extra = {}) {
  return Array.from({ length: n }, (_, i) => {
    const key = dayKey(now - (n - 1 - i) * DAY)
    return { label: key, value: Math.max(days[key] || 0, extra[key] || 0) }
  })
}

/** Minutes per day from the host log's connect and disconnect lines (what the log still holds). */
export function logDays(text) {
  if (typeof text !== 'string') return {}
  const out = {}
  let open = null
  for (const line of text.split('\n')) {
    const m = /^\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)(?:\.\d+)?\]:\s*\w+:\s*CLIENT (CONNECTED|DISCONNECTED)/.exec(line)
    if (!m) continue
    const at = Date.parse(m[1].replace(' ', 'T'))
    if (m[2] === 'CONNECTED') open = at
    else if (open !== null && at >= open) { const k = dayKey(open); out[k] = Math.round(((out[k] || 0) + (at - open) / 60000) * 10) / 10; open = null }
  }
  return out
}

/** Errors and warnings per hour over the last `hours` hours from the raw host log: { labels, errors[], warnings[] }, oldest first. */
export function errorsByHour(text, now = Date.now(), hours = 24) {
  if (typeof text !== 'string') return null
  const end = Math.floor(now / 3600000) * 3600000
  const errors = new Array(hours).fill(0), warnings = new Array(hours).fill(0)
  for (const line of text.split('\n')) {
    const m = /^\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)(?:\.\d+)?\]:\s*(Error|Fatal|Warning):/.exec(line)
    if (!m) continue
    const slot = hours - 1 - Math.floor((end - Math.floor(Date.parse(m[1].replace(' ', 'T')) / 3600000) * 3600000) / 3600000)
    if (slot < 0 || slot >= hours) continue
    if (m[2] === 'Warning') warnings[slot] += 1; else errors[slot] += 1
  }
  const labels = Array.from({ length: hours }, (_, i) => `${String(new Date(end - (hours - 1 - i) * 3600000).getHours()).padStart(2, '0')}:00`)
  return { labels, errors, warnings, total: errors.reduce((a, b) => a + b, 0), totalWarnings: warnings.reduce((a, b) => a + b, 0) }
}

/** Applications of the finished sessions, most recent first, each once: [{ app, at }]. */
export function recentApps(sessions = [], limit = 6) {
  const seen = new Set(), out = []
  for (let i = sessions.length - 1; i >= 0 && out.length < limit; i--) { const s = sessions[i]; if (s.app && !seen.has(s.app)) { seen.add(s.app); out.push({ app: s.app, at: s.end }) } }
  return out
}
