import { computed, reactive } from 'vue'

/**
 * One unsaved-changes state for a whole product window (the panel, the Web UI): every page that edits something reports its edits
 * here (`sync`), so the change stays when the person goes to another page, and one bar (MPendingBar) and one dialog (MSaveDialog)
 * save, undo or discard all of them.
 *
 * A *source* is one place that holds edits (the settings, the application list, the virtual display, the gamepad tuning):
 *
 *   define(id, { page, pageLabel, label, save, revertSaved, restart, consequences })   once at start, module-level functions only,
 *       so a source can be saved while its page is not on screen:
 *     save(entries, { restart })    writes the entries to the host; resolves { ok, error? }
 *     revertSaved(entries)          writes the `before` values back (the 撤销 of the snackbar); absent: the save cannot be undone
 *     restart(entries)              true when these entries need a restart of the host to take effect
 *     consequences(entries)         [{ id, kind: 'restart' | 'sessions' | 'risk' | 'note', severity?, title, text?, value?, recovery? }]
 *   attach(id, { revert(key), revertAll(), saved(entries) })   while the page is on screen: undo is applied to its model
 *   sync(id, entries)               entries: [{ key, label, before, after, page? }]; replaces the source's entries
 *
 * Entries outlive the page: `entries(id)` is what a page that mounts again applies to its fresh model.
 */
export function createPendingStore({ storage = null, storageKey = 'foundation-ui.pending', restartHost = null, activeSessions = null } = {}) {
  const state = reactive({ sources: {}, entries: {}, review: null, saving: false, error: '', last: null })
  const live = {}
  let hostRestart = restartHost
  let sessionsOf = activeSessions

  if (storage) {
    try {
      const saved = JSON.parse(storage.getItem(storageKey) || 'null')
      if (saved && typeof saved === 'object') for (const [id, list] of Object.entries(saved)) if (Array.isArray(list) && list.length) state.entries[id] = list
    } catch { /* a broken copy is simply not used */ }
  }
  const persist = () => {
    if (!storage) return
    try { storage.setItem(storageKey, JSON.stringify(state.entries)) } catch { /* private mode: the state stays in memory */ }
  }

  const sourceOf = (id) => state.sources[id] || null
  const list = (id) => state.entries[id] || []

  const all = computed(() => Object.keys(state.entries).flatMap((id) => (state.entries[id] || []).map((e) => ({ ...e, source: id, page: e.page || sourceOf(id)?.page || id, pageLabel: e.pageLabel || sourceOf(id)?.pageLabel || sourceOf(id)?.label || id }))))
  const count = computed(() => all.value.length)
  const pages = computed(() => {
    const out = []
    for (const e of all.value) {
      const hit = out.find((p) => p.page === e.page)
      if (hit) hit.count += 1
      else out.push({ page: e.page, label: e.pageLabel, count: 1 })
    }
    return out
  })

  function define(id, def) { state.sources[id] = { id, ...def } }
  function attach(id, handlers) { live[id] = handlers; return () => { if (live[id] === handlers) delete live[id] } }
  function detach(id) { delete live[id] }
  /** restartHost(): restarts the host; activeSessions(): how many streams are running now (they end with a restart) */
  function configure(options) { if (options.restartHost) hostRestart = options.restartHost; if (options.activeSessions) sessionsOf = options.activeSessions }

  // credentials (passwords, tokens, API keys, CDKs) never enter the store: it is persisted for the session and shows its values in the list and the undo history
  const SECRET = /(^|[_-])(pass|password|passwd|token|secret|cdk|api[_-]?key)($|[_-])/i
  function sync(id, entries) {
    const next = (entries || []).filter((e) => !e.secret && !SECRET.test(String(e.key))).map((e) => ({ ...e }))
    if (next.length) state.entries[id] = next
    else delete state.entries[id]
    persist()
  }

  function dropEntry(id, key) {
    const rest = list(id).filter((e) => e.key !== key)
    if (rest.length) state.entries[id] = rest
    else delete state.entries[id]
  }

  /** Undo one entry. With the page on screen it puts the old value in its model; otherwise the entry is dropped (the next load reads the host's value). */
  async function undo(id, key) {
    const handlers = live[id]
    if (handlers?.revert) await handlers.revert(key)
    dropEntry(id, key)
    persist()
  }

  async function undoSource(id) {
    const handlers = live[id]
    if (handlers?.revertAll) await handlers.revertAll()
    else if (handlers?.revert) for (const e of [...list(id)]) await handlers.revert(e.key)
    delete state.entries[id]
    persist()
  }

  async function undoAll() {
    for (const id of Object.keys(state.entries)) await undoSource(id)
    state.review = null
  }
  const discard = undoAll

  /** What saving would do, for the dialog: the entries grouped by page and every consequence the sources report. */
  async function plan() {
    const ids = Object.keys(state.entries)
    const entries = all.value
    const consequences = []
    let restart = false
    for (const id of ids) {
      const def = sourceOf(id)
      if (!def) continue
      if (def.restart?.(list(id))) restart = true
      for (const c of def.consequences?.(list(id)) || []) consequences.push({ source: id, ...c })
    }
    if (restart && !consequences.some((c) => c.kind === 'restart')) consequences.unshift({ id: 'restart', kind: 'restart', source: ids[0] })
    if (restart && sessionsOf) {
      let sessions = 0
      try { sessions = Number(await sessionsOf()) || 0 } catch { sessions = 0 }
      if (sessions > 0) consequences.push({ id: 'sessions', kind: 'sessions', count: sessions })
    }
    const risks = consequences.filter((c) => c.kind === 'risk')
    // a change the host would refuse (a port out of range) can not be saved: the dialog lists these and offers no save
    const invalid = entries.filter((e) => e.invalid)
    return { entries, pages: pages.value, consequences, risks, restart, invalid, count: entries.length }
  }

  /** The save button: opens the one confirmation. Nothing is written until `confirm`. */
  async function request() {
    if (!count.value || state.saving) return null
    state.error = ''
    state.review = await plan()
    return state.review
  }
  function cancel() { if (!state.saving) state.review = null }

  /** Writes one source and clears its entries. Resolves { ok, entries, restarted } (restarted: the source restarted the host itself). */
  async function saveSource(id, { restart = false } = {}) {
    const def = sourceOf(id)
    const entries = list(id).map((e) => ({ ...e }))
    if (entries.some((e) => e.invalid)) return { ok: false, error: 'invalid', entries }
    if (!def?.save) return { ok: true, entries, restarted: false }
    const result = await def.save(entries, { restart })
    if (!result?.ok) return { ok: false, error: result?.error || 'save', entries }
    live[id]?.saved?.(entries)
    delete state.entries[id]
    persist()
    return { ok: true, entries, restarted: !!result.restarted }
  }

  /** The confirmation: writes every source, then restarts the host when asked. Resolves { ok, restarted }. */
  async function confirm({ restart = false } = {}) {
    if (state.saving) return { ok: false }
    if (all.value.some((e) => e.invalid)) { state.error = 'invalid'; return { ok: false, error: 'invalid', invalid: all.value.filter((e) => e.invalid) } }
    const batch = []
    let restarted = false
    state.saving = true
    state.error = ''
    try {
      for (const id of Object.keys(state.entries)) {
        const result = await saveSource(id, { restart })
        if (!result.ok) { state.error = result.error; return { ok: false, error: state.error } }
        batch.push({ id, entries: result.entries })
        if (result.restarted) restarted = true
      }
      if (restart && !restarted && hostRestart) { await hostRestart(); restarted = true }
      state.review = null
      state.last = { batch, restarted, at: Date.now() }
      return { ok: true, restarted, saved: batch.reduce((n, b) => n + b.entries.length, 0) }
    } catch (error) {
      state.error = error?.message || String(error)
      return { ok: false, error: state.error }
    } finally {
      state.saving = false
    }
  }

  /** Whether the last save can be taken back (the 撤销 of the snackbar): every source of it knows how to write the old values. */
  const canUndoLast = () => !!state.last && state.last.batch.every((b) => typeof sourceOf(b.id)?.revertSaved === 'function')

  async function undoLast() {
    const last = state.last
    if (!last || !canUndoLast()) return { ok: false }
    state.saving = true
    try {
      for (const b of last.batch) {
        const result = await sourceOf(b.id).revertSaved(b.entries)
        if (result && result.ok === false) { state.error = result.error || 'undo'; return { ok: false, error: state.error } }
        live[b.id]?.reverted?.(b.entries)
      }
      if (last.restarted && hostRestart) await hostRestart()
      state.last = null
      return { ok: true }
    } finally {
      state.saving = false
    }
  }
  const clearLast = () => { state.last = null }

  /** Replaces the entries from outside (a copy kept by the window around a frame) without touching the persisted copy twice. */
  function hydrate(map) {
    for (const [id, entries] of Object.entries(map || {})) sync(id, entries)
  }
  const snapshot = () => JSON.parse(JSON.stringify(state.entries))

  return { state, all, count, pages, define, attach, detach, configure, sync, entries: list, undo, undoSource, undoAll, discard, plan, saveSource, request, cancel, confirm, canUndoLast, undoLast, clearLast, hydrate, snapshot }
}

let shared = null
/** The one store of the window. */
export function usePending(options) {
  if (!shared) {
    let storage = null
    try { storage = globalThis.sessionStorage || null } catch { storage = null }
    shared = createPendingStore({ storage, ...options })
    // a handle for the QA robot and the console of a developer
    if (typeof window !== 'undefined') (window.__foundationUi ||= {}).pending = shared
  }
  return shared
}
export function resetPending() { shared = null }
