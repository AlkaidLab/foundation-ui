// 体检: the health check, from two sources in one JSON contract. The panel checks what needs no Sunshine (service, install, processes and
// ports, drivers: `local`); Sunshine checks the rest (GET /api/doctor: `host`). This module asks each source for one group at a time so the
// page can show each group's progress, keeps the answers, marks the host's groups as offline when Sunshine does not answer (instead of
// failing them), sorts the problems first and turns a result into the text for the diagnostics bundle and 米塔 AI.
//   sources: [{ id: 'local' | 'host', groups: [{ id, icon }], fetch(group, lang) → { ok, status, json } }]
//   (the old form, `request(path)` alone, is the host source over GET /api/doctor)

import { reactive, watch } from 'vue'

/** The groups of the host (GET /api/doctor), in its order, with their icons (all in the icon set). */
export const DOCTOR_GROUPS = Object.freeze([
  { id: 'gpu', icon: 'memory' },
  { id: 'encoder', icon: 'videocam' },
  { id: 'capture', icon: 'screen_record' },
  { id: 'vdd', icon: 'desktop_windows' },
  { id: 'audio', icon: 'volume_up' },
  { id: 'input', icon: 'sports_esports' },
  { id: 'network', icon: 'lan' },
  { id: 'system', icon: 'computer' },
  { id: 'host', icon: 'dns' },
])

/** The groups the panel checks itself (doctor_local), which answer when Sunshine is down. */
export const LOCAL_GROUPS = Object.freeze([
  { id: 'service', icon: 'power_settings_new' },
  { id: 'install', icon: 'inventory_2' },
  { id: 'process', icon: 'terminal' },
  { id: 'drivers', icon: 'extension' },
])

export const STATUSES = Object.freeze(['fail', 'warn', 'skip', 'pass'])

/** How a status looks: the tone of the theme's status colours and its glyph. */
export const STATUS_LOOK = Object.freeze({
  pass: { tone: 'ok', icon: 'check_circle' },
  warn: { tone: 'warn', icon: 'warning' },
  fail: { tone: 'error', icon: 'error' },
  skip: { tone: 'neutral', icon: 'radio_button_unchecked' },
})

/**
 * The three levels of a fix: 1 leads somewhere (a page, a setting, a guide, a new check); 2 is a safe, reversible action (restart
 * Sunshine); 3 changes the system with administrator rights (install or repair a driver, the service's start type). Level 2 and 3 ask
 * first and say what they will do; level 3 says it needs administrator rights; both warn when a stream is live.
 */
export const FIX_LEVEL = Object.freeze({ open: 1, link: 1, rerun: 1, restart: 2, repair: 3 })

/**
 * What a running stream does to a check (the checks of the host's encoder and capture groups, audio output): the host steps aside for the probes ("Not checked: a stream is running")
 * and says so in the `streaming` flag of its answer; the page knows the live session as well (`streaming` of createDoctor). While a stream is live these rows are neither passed nor failed:
 *   skipped   the host did not run the probe (encoder.*, capture.test): the GPU and the capture belong to the stream and a probe would disturb the picture
 *   disturbed a probe that ran anyway (a stream that began mid-check, an older host): its answer may be the stream's, not the PC's
 *   routed    audio.sink, audio.virtual: Sunshine routes the sound to its own virtual device while it streams, so the output read now is not the one of an idle PC
 * Every other check reads settings, drivers, files and the network and gives the same answer with or without a stream.
 */
export const STREAM_LIMITED = Object.freeze([
  { match: /^encoder\./, kind: 'probe' },
  { match: /^capture\./, kind: 'probe' },
  { match: /^audio\.(sink|virtual)$/, kind: 'routed' },
])

/** The limit a live stream puts on an item: '' (none), 'skipped', 'disturbed' or 'routed'. */
export function streamLimit(item, live) {
  if (!live) return ''
  const rule = STREAM_LIMITED.find((r) => r.match.test(item.id))
  if (!rule) return ''
  if (rule.kind === 'routed') return 'routed'
  return (item.rawStatus || item.status) === 'skip' ? 'skipped' : 'disturbed'
}

const RANK = { fail: 0, warn: 1, skip: 2, pass: 3 }
const statusOf = (s) => (s in RANK ? s : 'skip')

/** Problems first (fail, warn), then what was not checked, then the passes; the source's order inside each. */
export function sortItems(items = []) {
  return items.map((item, index) => ({ item, index })).sort((a, b) => RANK[statusOf(a.item.status)] - RANK[statusOf(b.item.status)] || a.index - b.index).map((x) => x.item)
}

/** The worst status of a list: fail > warn > pass > skip (a list of skips is skip). */
export function worstStatus(items = []) {
  let out = 'skip'
  for (const item of items) {
    const s = statusOf(item.status)
    if (s === 'fail') return 'fail'
    if (s === 'warn') out = 'warn'
    else if (s === 'pass' && out === 'skip') out = 'pass'
  }
  return out
}

function normalizeAction(a) {
  if (!a || typeof a !== 'object' || typeof a.kind !== 'string') return null
  const level = [1, 2, 3].includes(Number(a.level)) ? Number(a.level) : FIX_LEVEL[a.kind] || 1
  return { kind: a.kind, target: String(a.target || ''), confirm: !!a.confirm || level >= 2, level, effect: String(a.effect || '') }
}

/** One item of an answer; unknown fields are dropped, a missing status is skip. */
export function normalizeItem(raw = {}, source = '') {
  const fix = raw.fix && typeof raw.fix === 'object' ? raw.fix : {}
  return {
    id: String(raw.id || ''),
    group: String(raw.group || ''),
    status: statusOf(raw.status),
    rawStatus: statusOf(raw.status),
    limit: '',
    title: String(raw.title || ''),
    detail: String(raw.detail || ''),
    source: String(raw.source || source || ''),
    fix: { text: String(fix.text || ''), action: normalizeAction(fix.action) },
    rawFix: { text: String(fix.text || ''), action: normalizeAction(fix.action) },
  }
}

/** Marks the items a live stream limits: they show as not checked (skip), with the host's own answer kept (rawStatus, rawFix) and a re-check as their only fix; no stream puts them back. Idempotent. */
export function applyStreamLimits(groups, live) {
  for (const g of groups) {
    if (g.state !== 'done') continue
    for (const i of g.items) {
      const limit = streamLimit(i, live)
      i.limit = limit
      i.status = limit ? 'skip' : i.rawStatus
      i.fix = limit ? { text: '', action: normalizeAction({ kind: 'rerun', target: i.group || g.id }) } : i.rawFix
    }
    g.status = worstStatus(g.items)
  }
  applyRepairMerge(groups)
}

/**
 * One problem, one repair. Two checks can name the same repair (the host reads USB forwarding as `input.usb`, the panel reads the usbip-win2 driver as
 * `drivers.usbip`; both say `driver:usbip`) and a person who sees two repair buttons takes them for two problems. The check of this PC states the driver best
 * (installed, running, version, problem code; it also answers while Sunshine is down) and sits with the other driver repairs, so it keeps the button; when no
 * source is local the first row keeps it. The other rows keep their status and detail and say where the repair is (`fix.at`), with no button of their own.
 * Only rows that are a problem count (a passed or unchecked row has nothing to repair). Run after applyStreamLimits, which puts the sources' fixes back first.
 */
export function applyRepairMerge(groups) {
  const byTarget = new Map()
  for (const g of groups) {
    if (g.state !== 'done') continue
    for (const item of g.items) {
      const a = item.fix.action
      if (!a || a.kind !== 'repair' || !a.target || (item.status !== 'fail' && item.status !== 'warn')) continue
      if (!byTarget.has(a.target)) byTarget.set(a.target, [])
      byTarget.get(a.target).push({ g, item })
    }
  }
  for (const rows of byTarget.values()) {
    if (rows.length < 2) continue
    const owner = rows.find((r) => (r.item.source || r.g.source) === 'local') || rows[0]
    for (const r of rows) {
      if (r === owner) continue
      r.item.fix = { text: '', action: null, at: { group: owner.g.id, groupTitle: owner.g.title, item: owner.item.id, title: owner.item.title } }
    }
  }
}

/** The groups to ask again after a repair: every group with a check that wanted that same repair (the team row and the rows that point to it). */
export function repairGroups(groups, action) {
  return groups.filter((g) => g.items.some((i) => i.rawFix?.action?.kind === 'repair' && i.rawFix.action.target === action?.target)).map((g) => g.id)
}

/** An answer: { version: 1, checked_at, source?, streaming?, groups: [{ id, title, status, items: [ids] }], items: [...] } → groups with their items. */
export function normalizeReport(raw, source = '') {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.items) || !Array.isArray(raw.groups)) return null
  const from = String(raw.source || source || '')
  const items = raw.items.map((i) => normalizeItem(i, from)).filter((i) => i.id)
  const byId = new Map(items.map((i) => [i.id, i]))
  const groups = raw.groups.map((g) => {
    const list = (Array.isArray(g.items) ? g.items : []).map((id) => byId.get(id)).filter(Boolean)
    return { id: String(g.id || ''), title: String(g.title || ''), status: worstStatus(list), elapsed: Number(g.elapsed_ms) || 0, timedOut: !!g.timed_out, items: list }
  }).filter((g) => g.id)
  return { checkedAt: String(raw.checked_at || ''), source: from, streaming: raw.streaming === true, groups }
}

/** Counts of every status (groups that did not answer count nothing). */
export function countStatuses(groups = []) {
  const out = { pass: 0, warn: 0, fail: 0, skip: 0 }
  for (const g of groups) for (const i of g.items) out[i.status] += 1
  return out
}

/** The host source over GET /api/doctor?only=<group>&lang=. */
export const hostSource = (request) => ({ id: 'host', groups: DOCTOR_GROUPS, fetch: (group, lang) => request(`/api/doctor?only=${encodeURIComponent(group)}&lang=${lang}`) })

// Sunshine is not answering: the proxy says the upstream is gone, or the request never got an answer
/** Why a group has no result: the route is missing (404), the sign-in is gone (401, 403), the answer is not a health check (200 but another shape), else a plain failure. */
export function errorKind(r) {
  if (r?.status === 404) return 'unsupported'
  if (r?.status === 401 || r?.status === 403) return 'auth'
  if (r?.ok) return 'invalid'
  return 'failed'
}

/** The words the source gave for a failure (`error` or `message` of its answer, else the body itself), cut short; empty when it gave none. */
export function errorDetail(r) {
  const j = r?.json
  // an answer without `error` or `message` (a 200 with another body: a stand-in server) is shown as it came, so the person can see what answered
  const raw = j && typeof j === 'object' ? j.error || j.message || JSON.stringify(j) : typeof j === 'string' ? j : ''
  const text = String(raw).replace(/\s+/g, ' ').trim()
  return text.length > 240 ? `${text.slice(0, 237)}…` : text
}

const isOffline = (r) => !r || r.status === 0 || r.status === 502 || r.status === 503 || r.status === 504

/**
 * The page's state: one entry per group (state idle | queued | running | done | offline | error). run() asks every source for every
 * group, at most `parallel` requests at a time, the local groups first; rerun(id) asks for one group again. A host group whose request
 * finds Sunshine down is `offline`, not an error: the local groups say why.
 */
export function createDoctor({ request, sources, locale = 'en', parallel = 3, streaming = null } = {}) {
  const lang = () => (/^zh/i.test(String(typeof locale === 'function' ? locale() : locale)) ? 'zh' : 'en')
  const list = sources?.length ? sources : [hostSource(request)]
  const order = [...list].sort((a, b) => (a.id === 'local' ? -1 : b.id === 'local' ? 1 : 0))
  const state = reactive({
    running: false,
    startedAt: 0,
    finishedAt: 0,
    streaming: false,
    hostOffline: false,
    groups: order.flatMap((s) => s.groups.map((g) => ({ id: g.id, icon: g.icon, source: s.id, title: '', state: 'idle', status: 'skip', items: [], error: '', errorStatus: 0, errorDetail: '', elapsed: 0 }))),
  })
  const sourceOf = (entry) => list.find((s) => s.id === entry.source)
  let generation = 0
  // a stream is live when a host answer says so or the product does (its live sessions); the checks it limits are marked again whenever either changes
  const restate = () => applyStreamLimits(state.groups, state.streaming || !!(typeof streaming === 'function' ? streaming() : streaming))

  async function fetchGroup(entry, gen) {
    entry.state = 'running'
    entry.error = ''
    entry.errorStatus = 0
    entry.errorDetail = ''
    const started = Date.now()
    let r = null
    try { r = await sourceOf(entry).fetch(entry.id, lang()) }
    catch { r = { ok: false, status: 0, json: null } }
    if (gen !== generation) return
    const report = r?.ok ? normalizeReport(r.json, entry.source) : null
    const group = report?.groups.find((g) => g.id === entry.id)
    if (group) {
      entry.state = 'done'
      entry.title = group.title
      entry.items = group.items
      entry.status = group.status
      entry.elapsed = group.elapsed
      if (report.streaming) state.streaming = true
      if (entry.source === 'host') state.hostOffline = false
    }
    else if (entry.source === 'host' && isOffline(r)) {
      entry.state = 'offline'
      entry.items = []
      entry.status = 'skip'
      state.hostOffline = true
    }
    else {
      entry.state = 'error'
      entry.error = errorKind(r)
      entry.errorStatus = Number(r?.status) || 0
      entry.errorDetail = errorDetail(r)
      entry.items = []
      entry.status = 'skip'
    }
    if (!entry.elapsed) entry.elapsed = Date.now() - started
    restate()
  }

  async function run() {
    const gen = ++generation
    state.running = true
    state.startedAt = Date.now()
    state.finishedAt = 0
    state.streaming = false
    state.hostOffline = false
    for (const g of state.groups) Object.assign(g, { state: 'queued', status: 'skip', items: [], error: '', errorStatus: 0, errorDetail: '', elapsed: 0 })
    const queue = [...state.groups]
    const worker = async () => { while (queue.length && gen === generation) await fetchGroup(queue.shift(), gen) }
    await Promise.all(Array.from({ length: Math.max(1, parallel) }, worker))
    if (gen !== generation) return
    state.running = false
    state.finishedAt = Date.now()
  }

  async function rerun(id) {
    const entry = state.groups.find((g) => g.id === id)
    if (!entry || entry.state === 'running') return
    entry.elapsed = 0
    await fetchGroup(entry, generation)
    if (!state.groups.some((g) => g.state === 'running' || g.state === 'queued')) { state.running = false; state.finishedAt = Date.now() }
  }

  function reset() {
    generation += 1
    state.running = false
    state.startedAt = 0
    state.finishedAt = 0
    state.streaming = false
    state.hostOffline = false
    for (const g of state.groups) Object.assign(g, { state: 'idle', status: 'skip', items: [], error: '', errorStatus: 0, errorDetail: '', elapsed: 0 })
  }

  return { state, run, rerun, reset, restate }
}

const answered = (g) => g.state === 'done' || g.state === 'error' || g.state === 'offline'

/** The finished groups as the sources answered them, for the bundle and the AI: plain data, no Vue proxies. */
export function doctorSnapshot(state) {
  return {
    version: 1,
    checked_at: state.finishedAt ? new Date(state.finishedAt).toISOString() : '',
    host_offline: !!state.hostOffline,
    streaming: !!state.streaming,
    groups: state.groups.filter(answered).map((g) => ({
      id: g.id, source: g.source, title: g.title, state: g.state, error: g.error || undefined, error_status: g.errorStatus || undefined, error_detail: g.errorDetail || undefined, status: g.status, elapsed_ms: g.elapsed,
      items: g.items.map((i) => ({ id: i.id, status: i.status, title: i.title, detail: i.detail, limit: i.limit || undefined, host_status: i.limit ? i.rawStatus : undefined, fix: i.fix.text || undefined, action: i.fix.action || undefined, repair_at: i.fix.at ? i.fix.at.item : undefined })),
    })),
  }
}

/** A short text of the result, problems first: what 米塔 AI reads. */
export function doctorText(state, { titleOf = (g) => g.title || g.id, fixAtText = (at) => `repair it at ${at.title}`, offlineText = 'not answering', limitText = (limit) => `not judged: a stream is running (${limit})`, mark = { fail: '✗', warn: '!', skip: '–', pass: '✓' } } = {}) {
  const lines = []
  for (const g of state.groups) {
    if (g.state === 'offline') { lines.push(`## ${titleOf(g)} [${g.source}: ${offlineText}]`); continue }
    if (g.state !== 'done') continue
    lines.push(`## ${titleOf(g)} [${g.source}, ${g.status}]`)
    for (const i of sortItems(g.items)) {
      lines.push(`${mark[i.status]} ${i.title}${i.detail ? `: ${i.detail}` : ''}${i.limit ? ` [${limitText(i.limit)}]` : ''}`)
      if (i.fix.text && i.status !== 'pass') lines.push(`  → ${i.fix.text}`)
      else if (i.fix.at && i.status !== 'pass') lines.push(`  → ${fixAtText(i.fix.at)}`)
    }
  }
  return lines.join('\n')
}

/** What the page keeps of the last check, to show on the first screen before the next one: when, the counts and each group's result. */
export function summarizeDoctor(state) {
  const groups = {}
  for (const g of state.groups) if (answered(g)) groups[g.id] = g.state === 'done' ? g.status : g.state
  const answers = state.groups.filter(answered)
  return {
    v: 1,
    at: state.finishedAt || Date.now(),
    s: state.finishedAt && state.startedAt ? Math.max(1, Math.round((state.finishedAt - state.startedAt) / 1000)) : 0,
    counts: countStatuses(state.groups),
    groups,
    // no group gave a result at all: the last check found nothing out
    empty: answers.length > 0 && answers.every((g) => g.state !== 'done'),
  }
}

/** The kept summary, or null when there is none or it is not ours (a storage that throws counts as none). */
export function readDoctorSummary(storage, key) {
  try {
    const s = JSON.parse(storage?.getItem(key) || 'null')
    return s && s.v === 1 && Number(s.at) > 0 && s.counts && s.groups ? s : null
  }
  catch { return null }
}

export function writeDoctorSummary(storage, key, summary) {
  try { storage?.setItem(key, JSON.stringify(summary)) } catch { /* private mode: the next visit just shows no last result */ }
}

// ---- the last result, kept across visits -------------------------------------------------------------------------------------------------------------------------
// A page of the control panel is built when it is opened and thrown away when the person goes somewhere else; following a fix to another page and coming back used to
// start from nothing and run every check again. The result now belongs to the session, not to the page: `sessionDoctor(key)` gives the same doctor to every visit (a run that
// is still going on goes on, and shows its progress when the page is opened again), and a finished result is written to the storage and read back when the app is opened again.

/** A finished result as plain data (what is written to the storage and read back). */
export function doctorResult(state) {
  return {
    v: 1,
    at: state.finishedAt,
    startedAt: state.startedAt,
    streaming: !!state.streaming,
    hostOffline: !!state.hostOffline,
    groups: state.groups.filter(answered).map((g) => ({ id: g.id, source: g.source, title: g.title, state: g.state, status: g.status, items: JSON.parse(JSON.stringify(g.items)), error: g.error, errorStatus: g.errorStatus, errorDetail: g.errorDetail, elapsed: g.elapsed })),
  }
}

/** Puts a kept result into a doctor's state when it is for the same groups; false (and nothing changed) when it is not ours or the groups differ. */
export function restoreDoctor(state, saved) {
  if (!saved || saved.v !== 1 || !(Number(saved.at) > 0) || !Array.isArray(saved.groups) || !saved.groups.length) return false
  const byId = new Map(saved.groups.map((g) => [`${g.source}/${g.id}`, g]))
  if (!state.groups.some((g) => byId.has(`${g.source}/${g.id}`))) return false
  for (const g of state.groups) {
    const s = byId.get(`${g.source}/${g.id}`)
    if (!s || !answered(s)) continue
    Object.assign(g, { title: s.title || '', state: s.state, status: s.status in RANK ? s.status : 'skip', items: Array.isArray(s.items) ? s.items : [], error: s.error || '', errorStatus: Number(s.errorStatus) || 0, errorDetail: s.errorDetail || '', elapsed: Number(s.elapsed) || 0 })
  }
  state.startedAt = Number(saved.startedAt) || Number(saved.at)
  state.finishedAt = Number(saved.at)
  state.streaming = !!saved.streaming
  state.hostOffline = !!saved.hostOffline
  state.running = false
  return true
}

export function readDoctorResult(storage, key) {
  try { return JSON.parse(storage?.getItem(key) || 'null') } catch { return null }
}
export function writeDoctorResult(storage, key, result) {
  try { storage?.setItem(key, JSON.stringify(result)) } catch { /* private mode or a full storage: the result stays for this session only */ }
}

const sessions = new Map()
/** The doctors of this session, by key. */
export const resetDoctorSessions = () => sessions.clear()

/**
 * The doctor of `key` for this session: made once (and filled from the storage when a result was kept), then handed to every visit of the page. `options` are the page's props: a visit
 * refreshes them (the request, the sources' fetch, the language, whether a stream is live), so a later run uses what the page has now, not what the first visit had.
 *   options: { request, sources, locale: () => string, parallel, streaming: () => boolean, storage, storageKey }
 */
export function sessionDoctor(key, options) {
  let s = sessions.get(key)
  const signature = (options.sources?.length ? options.sources : [{ id: 'host', groups: DOCTOR_GROUPS }]).map((x) => `${x.id}:${x.groups.map((g) => g.id).join(',')}`).join('|')
  if (s && s.signature !== signature) { sessions.delete(key); s = null }
  if (!s) {
    const holder = {}
    const sources = options.sources?.map((x) => ({ ...x, fetch: (group, lang) => holder.sources.find((y) => y.id === x.id).fetch(group, lang) }))
    const doctor = createDoctor({ request: (p) => holder.request?.(p), sources, locale: () => holder.locale?.() ?? 'en', parallel: options.parallel, streaming: () => !!holder.streaming?.() })
    s = { key, signature, holder, doctor, handled: null, storage: null }
    sessions.set(key, s)
    const kept = readDoctorResult(options.storage, `${options.storageKey}.result`)
    if (kept) restoreDoctor(doctor.state, kept)
    watch(() => doctor.state.finishedAt, (at) => { if (at && s.storage) writeDoctorResult(s.storage, `${s.storageKey}.result`, doctorResult(doctor.state)) })
  }
  Object.assign(s.holder, { request: options.request, sources: options.sources, locale: options.locale, streaming: options.streaming })
  s.storage = options.storage; s.storageKey = options.storageKey
  return s
}

/**
 * Whether opening the page starts a run. `autostart` is what the entry asked for: a number is the entry's own token (the control panel gives each press of 「开始体检」 a new one, and the
 * entry of the history keeps it, so coming back with Back does not run again); `true` is an entry without a token: it runs when there is no result yet or the result is older than `staleMs`.
 */
export function shouldAutostart(session, autostart, now = Date.now(), staleMs = 5 * 60 * 1000) {
  const state = session.doctor.state
  if (!autostart || state.running) return false
  if (typeof autostart === 'number') {
    if (session.handled === autostart) return false
    session.handled = autostart
    return true
  }
  return !state.finishedAt || now - state.finishedAt > staleMs
}
