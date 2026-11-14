// A control of the developer pages changes at once: the new state is painted on the click, the host (or the settings file) is asked after, and the answer decides: it is kept (and read back when the page
// gave a `reconcile`), or the control goes back to what it was and the failure is told. While it waits the control is marked pending, so it shows by itself that something is still going on.
// `pending` is a (reactive) map the page owns, `fail(error, key)` tells the person; both are given, so this stays a plain function that needs no window.
export function createChanger({ pending = {}, fail = () => {} } = {}) {
  return async function change(key, { paint, restore, commit, reconcile } = {}) {
    if (pending[key]) return { ok: false, busy: true }
    pending[key] = true
    try {
      paint?.()
      let answer
      try { answer = await commit?.() } catch (error) { restore?.(); try { fail(error, key) } catch { /* nothing to tell it to */ } return { ok: false, error } }
      if (reconcile) { try { await reconcile(answer) } catch { /* the painted state stands */ } }
      return { ok: true, answer }
    } finally { pending[key] = false }
  }
}
