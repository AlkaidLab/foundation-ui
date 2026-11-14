// The dot on the 开发者 rail: something in the host's repository changed since the person last looked at Issue 与 PR. One quiet check every fifteen minutes while developer mode is on (the issues and the pull requests of
// the host's repository; ETag makes a repeat cheap, the unsigned limit is 60 an hour) and the newest update time against the time the page was last open. The first check of a window only sets the mark: a new window starts without a dot.
import { DEFAULT_REPO } from './repos.js'

export const SEEN_KEY = 'foundation-ui.devmode.seen'
export const CHECK_EVERY_MS = 15 * 60 * 1000
const store = () => { try { return globalThis.localStorage } catch { return null } }
const newest = (items) => items.reduce((t, i) => Math.max(t, Date.parse(i.at) || 0), 0)

export function createActivity({ client, storage = store(), now = () => Date.now(), repo = DEFAULT_REPO } = {}) {
  const read = () => Number(storage?.getItem(SEEN_KEY)) || 0
  const write = (t) => { try { storage?.setItem(SEEN_KEY, String(t)) } catch { /* not remembered */ } }
  /** -> true when something is newer than the mark */
  async function check() {
    const [issues, prs] = await Promise.all([client.list(repo, 'issue'), client.list(repo, 'pr')])
    if (issues.state !== 'ok' && prs.state !== 'ok') return false
    const latest = Math.max(newest(issues.items), newest(prs.items))
    const seen = read()
    if (!seen) { write(now()); return false }
    return latest > seen
  }
  return { check, markSeen: () => write(now()), seen: read }
}
