// 恢复默认设置: what the page does without a window: the host calls, the time of a backup, the countdown of the confirm button. Pure functions (no Vue, no DOM).

/** The confirm button of a reset cannot be pressed until this many seconds have passed since the question opened. */
export const RESET_SECONDS = 5

/**
 * The host's side of it (FS /api/config/reset*). `fetcher(path, init)` is the product's own fetch (it adds the session, the CSRF header or the panel's proxy);
 * every call answers { ok: true, data } or { ok: false, code } with one of the host's words (busy, no_backup, ...) or `unreachable`.
 */
export function createResetClient(fetcher) {
  async function call(method, path, body) {
    let response
    try {
      response = await fetcher(path, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    } catch { return { ok: false, code: 'unreachable' } }
    let data = null
    try { data = await response.json() } catch { /* an answer without a body */ }
    if (response.ok && data?.status !== false) return { ok: true, data: data || {} }
    return { ok: false, code: typeof data?.code === 'string' && data.code ? data.code : `http_${response.status}`, status: response.status }
  }
  return {
    /** The backups that exist: { ok, data: { backups: [{ stamp, created_ms, has_apps }] (newest first), limit } } */
    status: () => call('GET', '/api/config/reset'),
    /** Back up, write the defaults, restart. `clearApps` also puts the default application list in place. */
    reset: (clearApps = false) => call('POST', '/api/config/reset', { clear_apps: !!clearApps }),
    /** Put the newest backup back (the settings that are there now are backed up first), restart. */
    restore: () => call('POST', '/api/config/reset/restore', {}),
  }
}

/** The newest backup of a status answer, or null. */
export const latestBackup = (status) => {
  const list = Array.isArray(status?.backups) ? status.backups : []
  return list.length ? list[0] : null
}

/** The date and time of a backup in the language of the interface ("Nov 19, 2026, 3:30 PM"). */
export function backupTime(ms, locale = 'en') {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  try { return new Intl.DateTimeFormat(String(locale).replace('_', '-'), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms)) } catch { return new Date(ms).toISOString() }
}

/** `text` with {name} replaced. */
export const fill = (text, values = {}) => String(text).replace(/\{(\w+)\}/g, (all, key) => (key in values ? String(values[key]) : all))

/** The label of a confirm button while it counts down, and as it is once it can be pressed. */
export const countdownLabel = (texts, label, remaining) => (remaining > 0 ? fill(texts.seconds, { label, n: remaining }) : label)

/**
 * The countdown of a confirm button: `start()` sets it to `seconds`, `tick()` takes one away. A caller drives it with a timer (useCountdown) or by hand in a test;
 * nothing here reads a clock, so a question that stays open cannot come ready early.
 */
export function createCountdown(seconds = RESET_SECONDS) {
  const state = { remaining: seconds, running: false }
  return {
    state,
    start() { state.remaining = seconds; state.running = true },
    stop() { state.running = false },
    tick() { if (state.running && state.remaining > 0) state.remaining -= 1; if (state.remaining <= 0) state.running = false; return state.remaining },
    get ready() { return state.running === false && state.remaining <= 0 },
  }
}

/** The text of an answer that did not work: the reason, when there is one, and that nothing was changed. */
export const failureText = (texts, code) => [texts.errors?.[code], texts.failed].filter(Boolean).join(' ')
