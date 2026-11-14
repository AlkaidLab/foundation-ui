import { ref } from 'vue'
import { createActivity, CHECK_EVERY_MS } from '../../devmode/activity.js'
import { sharedGithubClient } from '../../devmode/github.js'

// The dot of the 开发者 rail: `unseen` is true while something in the host's repository is newer than the last look at Issue 与 PR. The product starts the check while developer mode is on and stops it when it is off.
const unseen = ref(false)
let timer = 0
let first = 0
let activity = null
const get = () => (activity ||= createActivity({ client: sharedGithubClient() }))
async function run() { try { unseen.value = await get().check() } catch { /* the next check tries again */ } }
export const useDevActivity = () => ({
  unseen,
  start() { if (timer) return; first = setTimeout(run, 20000); timer = setInterval(run, CHECK_EVERY_MS) },
  stop() { clearTimeout(first); clearInterval(timer); timer = 0; unseen.value = false },
  markSeen() { get().markSeen(); unseen.value = false },
})
