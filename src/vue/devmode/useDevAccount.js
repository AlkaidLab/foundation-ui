import { computed, ref } from 'vue'
import { createSignIn, readSession } from '../../devmode/signin.js'
import { devBackend } from '../../devmode/config.js'

// The GitHub account of the developer-mode flows: one session handle for the whole window (the sign-in dialog sets it, the report and the Issue page read it).
const session = ref(readSession())
const flow = createSignIn()
export const useDevAccount = () => ({
  session,
  signedIn: computed(() => !!session.value),
  login: computed(() => session.value?.login || ''),
  backend: () => devBackend(),
  flow,
  set(next) { session.value = next },
  async signOut() { await flow.signOut(); session.value = null },
})
