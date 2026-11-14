import { computed, reactive, ref } from 'vue'

// The reactive state of sign-in and of 安全与登录, over an auth client (auth/client.js). One instance per page.
//   state: 'loading' | 'ready' | 'unavailable' (the host has no session API: older host) | 'error'
//   session: normalized GET /api/auth/session; list: normalized GET /api/auth/sessions; error: { kind, ... } of the last failed action
// What the last load found stays for the next page of this app: opening 安全与登录 again draws it at once and the host's answer replaces it (a failed answer drops it).
let kept = null
export function forgetAuthSession() { kept = null }

export function useAuthSession(client) {
  const state = ref(kept ? 'ready' : 'loading')
  const session = ref(kept ? kept.session : null)
  const list = reactive(kept ? { current: kept.current, sessions: kept.sessions, loaded: kept.loaded } : { current: '', sessions: [], loaded: false })
  const busy = ref('')
  const error = ref(null)
  const signedIn = computed(() => !!session.value?.authenticated)
  // does this host have the reset route (probed once per load, only on the host's own computer): null = not asked, true, false
  const resetSupported = ref(null)
  const local = computed(() => !!session.value?.local)

  async function load() {
    if (!kept) state.value = 'loading'
    error.value = null
    const s = await client.session()
    if (!s.ok) { kept = null; error.value = s.error; state.value = (s.error.status === 404 || s.error.status === 444) ? 'unavailable' : 'error'; return false }
    session.value = s.data
    if (s.data.authenticated) await loadSessions()
    resetSupported.value = null // the control panel asks for the old password like any other client: nothing here probes the old-password-free reset any more
    state.value = 'ready'
    kept = { session: session.value, current: list.current, sessions: list.sessions, loaded: list.loaded }
    return true
  }
  async function loadSessions() {
    const r = await client.sessions()
    if (r.ok) { list.current = r.data.current; list.sessions = r.data.sessions; list.loaded = true } else { list.sessions = []; list.loaded = false }
    return r
  }
  async function run(name, fn) {
    if (busy.value) return { ok: false, error: { kind: 'busy' } }
    busy.value = name; error.value = null
    try { const r = await fn(); if (!r.ok) error.value = r.error; return r } finally { busy.value = '' }
  }
  const login = (input) => run('login', async () => { kept = null; const r = await client.login(input); if (r.ok) session.value = r.data; return r })
  const setup = (input) => run('setup', async () => { kept = null; const r = await client.setup(input); if (r.ok) session.value = r.data; return r })
  const signOut = () => run('signout', async () => { kept = null; const r = await client.logout(); if (r.ok) { session.value = { ...session.value, authenticated: false }; list.sessions = [] } return r })
  const revoke = (id) => run('revoke', async () => { const r = await client.revoke(id); if (r.ok) await loadSessions(); return r })
  const revokeAll = () => run('revokeall', async () => { kept = null; const r = await client.revokeAll(); if (r.ok) { session.value = { ...session.value, authenticated: false }; list.sessions = [] } return r })
  // after a change the page shows the account as the host has it now (a renamed account has a new name)
  const changePassword = (input) => run('password', async () => { const r = await client.changePassword(input); if (r.ok) { const s = await client.session(); if (s.ok) session.value = s.data; await loadSessions() } return r })

  const resetPassword = (input) => run('password', async () => { const r = await client.resetPassword(input); if (r.ok) await loadSessions(); return r })

  return { state, session, list, busy, error, signedIn, local, resetSupported, load, loadSessions, login, setup, signOut, revoke, revokeAll, changePassword, resetPassword }
}
