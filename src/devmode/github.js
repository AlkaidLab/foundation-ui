// The public read of GitHub for the Issue 与 PR page: GET only, no account, cached for five minutes and revalidated with ETag. The answer always says which of its states it is in:
//   ok | rate (the 60 requests an hour of an unsigned client are used: resetAt) | offline | forbidden (a private repository without access) | auth (the sign-in is no longer valid) | error
// An answer that is not ok still carries the items of the last good one (stale: true) so the page has something to show.
import { repoOf, repoSlug } from './repos.js'
import { devBackend } from './config.js'
import { adoptHandle, readSession } from './signin.js'
import { parseTemplate } from './issueForm.js'
import { hostOf, reasonOf } from './net.js'

export const API = 'https://api.github.com'
export const CACHE_KEY = 'foundation-ui.devmode.gh.v1'
export const TTL_MS = 5 * 60 * 1000
const store = () => { try { return globalThis.localStorage } catch { return null } }

/** The longest text kept of an item or a comment (characters); the rest is on GitHub. */
export const BODY_MAX = 20000
const capBody = (b) => String(b || '').slice(0, BODY_MAX)
/** The comments one issue shows at most (one page of the endpoint). */
export const COMMENTS_MAX = 100
/** The Issue Forms of a repository change rarely: they are read again after six hours (the ETag saves the rest), at most TEMPLATES_MAX files. */
export const TEMPLATES_TTL_MS = 6 * 60 * 60 * 1000
export const TEMPLATES_MAX = 8
// what the stored cache keeps of the comment threads: the newest ones only, the last comments of each, the texts cut (the memory of the window keeps all)
const THREADS_KEPT = 8, THREAD_ITEMS_KEPT = 30, THREAD_BODY_KEPT = 3000

export const labelName = (l) => (typeof l === 'string' ? l : l?.name || '')
/** One entry of /issues or /pulls as the page uses it. */
export function normalize(raw, repo, kind) {
  const pr = kind === 'pr'
  let state = String(raw.state || 'open')
  if (pr) state = raw.merged_at ? 'merged' : raw.draft ? 'draft' : state
  return {
    key: `${repo}#${raw.number}`,
    n: raw.number,
    repo,
    kind,
    title: String(raw.title || ''),
    state,
    labels: (raw.labels || []).map(labelName).filter(Boolean),
    who: raw.user?.login || '',
    at: raw.updated_at || raw.created_at || '',
    created: raw.created_at || '',
    comments: Number(raw.comments ?? raw.review_comments ?? 0) || 0,
    body: capBody(raw.body),
    bodyCut: String(raw.body || '').length > BODY_MAX,
    url: raw.html_url || '',
    branch: pr && raw.head?.ref ? `${raw.head.ref} → ${raw.base?.ref || ''}` : '',
  }
}

/** One entry of /issues/{n}/comments as the reader uses it. */
export const normalizeComment = (raw) => ({
  id: String(raw.id ?? ''),
  who: raw.user?.login || '',
  at: raw.created_at || raw.updated_at || '',
  body: capBody(raw.body),
  bodyCut: String(raw.body || '').length > BODY_MAX,
  url: raw.html_url || '',
  role: String(raw.author_association || '').toLowerCase(),
})

/** True when the list entry is a pull request (the issues endpoint lists both). */
export const isPullEntry = (raw) => !!raw.pull_request

// `base` and `token` may be functions, read at every request: signed in with the backend, the reads go through the Worker (GET {worker}/github/repos/..., the same paths as GitHub's REST, with the person's session
// handle as the credential; the Worker adds the GitHub token). That raises the limit and makes the private repository readable; without it the reads are the public ones above.
export function createGithubClient({ fetchImpl = (...a) => fetch(...a), storage = store(), session: sessionStore = undefined, now = () => Date.now(), ttlMs = TTL_MS, token: tokenOf = () => '', base: baseOf = API } = {}) {
  const token = () => (typeof tokenOf === 'function' ? tokenOf() : tokenOf)
  const base = () => (typeof baseOf === 'function' ? baseOf() : baseOf)
  const memory = new Map()
  let rate = { remaining: null, limit: null, resetAt: 0 }
  const load = () => { try { return JSON.parse(storage?.getItem(CACHE_KEY) || '{}') || {} } catch { return {} } }
  const persist = () => {
    try {
      const out = {}
      const threads = []
      for (const [k, v] of memory) {
        if (k.includes('|comments|')) threads.push([k, v])
        else out[k] = { at: v.at, etag: v.etag, items: v.items.slice(0, 30), more: v.more }
      }
      for (const [k, v] of threads.sort((a, b) => b[1].at - a[1].at).slice(0, THREADS_KEPT)) out[k] = { at: v.at, etag: v.etag, items: v.items.slice(-THREAD_ITEMS_KEPT).map((c) => ({ ...c, body: c.body.slice(0, THREAD_BODY_KEPT) })), more: v.more }
      storage?.setItem(CACHE_KEY, JSON.stringify(out))
    } catch { /* not remembered */ }
  }
  const stored = load()
  for (const [k, v] of Object.entries(stored)) if (v && Array.isArray(v.items)) memory.set(k, v)

  const urlOf = (repo, kind, { state, page, perPage }) => `${base()}/repos/${repoSlug(repo)}/${kind === 'pr' ? 'pulls' : 'issues'}?state=${state}&sort=updated&direction=desc&per_page=${perPage}&page=${page}`

  // One read of one address with the cache (five minutes), the ETag revalidation and the rate-limit rules; `map` turns the answer into the items. The list and the comments of an issue use it alike.
  /** @returns {Promise<{ state: string, items: object[], at: number, stale?: boolean, fromCache?: boolean, more?: boolean, resetAt?: number }>} */
  async function read(url, key, force, map, { ttl = ttlMs, object = false } = {}) {
    const cached = memory.get(key)
    const t = now()
    if (cached && !force && t - cached.at < ttl) return { state: 'ok', items: cached.items, at: cached.at, more: !!cached.more, fromCache: true }
    // while the limit is used up and the window is not over, do not ask
    if (rate.remaining === 0 && rate.resetAt > t && !token()) return { state: 'rate', items: cached?.items || [], at: cached?.at || 0, stale: !!cached, resetAt: rate.resetAt, resetKnown: true }
    const headers = { accept: 'application/vnd.github+json' }
    // the version header is for GitHub itself; the Worker adds it on its own side, and its CORS preflight does not allow it: sent there, the request is refused before it leaves the window
    if (url.startsWith(API)) headers['x-github-api-version'] = '2022-11-28'
    if (cached?.etag) headers['if-none-match'] = cached.etag
    const tk = token()
    if (tk) headers.authorization = `Bearer ${tk}`
    let res
    try { res = await fetchImpl(url, { method: 'GET', headers, cache: 'no-store', referrerPolicy: 'no-referrer' }) } catch (error) { return { state: 'offline', items: cached?.items || [], at: cached?.at || 0, stale: !!cached, host: hostOf(url), reason: reasonOf(error) } }
    adoptHandle(res, sessionStore)
    const h = (name) => res.headers?.get?.(name)
    if (h('x-ratelimit-remaining') !== null && h('x-ratelimit-remaining') !== undefined) rate = { remaining: Number(h('x-ratelimit-remaining')), limit: Number(h('x-ratelimit-limit')) || null, resetAt: (Number(h('x-ratelimit-reset')) || 0) * 1000 }
    if (res.status === 304 && cached) { cached.at = now(); persist(); return { state: 'ok', items: cached.items, at: cached.at, more: !!cached.more, validated: true } }
    if (res.status === 403 || res.status === 429) {
      const retry = Number(h('retry-after'))
      const resetAt = retry ? now() + retry * 1000 : rate.resetAt || now() + 60 * 60 * 1000
      return { state: 'rate', items: cached?.items || [], at: cached?.at || 0, stale: !!cached, resetAt, resetKnown: !!(retry || rate.resetAt) }
    }
    if (res.status === 401) return { state: 'auth', items: cached?.items || [], at: cached?.at || 0, stale: !!cached }
    if (res.status === 404) return { state: 'forbidden', items: [], at: 0 }
    if (!res.ok) return { state: 'error', items: cached?.items || [], at: cached?.at || 0, stale: !!cached, status: res.status }
    let raw
    try { raw = await res.json() } catch { return { state: 'error', items: cached?.items || [], at: cached?.at || 0, stale: !!cached } }
    const rows = map(Array.isArray(raw) ? raw : object && raw && typeof raw === 'object' ? [raw] : [])
    const more = /rel="next"/.test(h('link') || '')
    const entry = { at: now(), etag: h('etag') || '', items: rows, more }
    memory.set(key, entry)
    persist()
    return { state: 'ok', items: rows, at: entry.at, more }
  }
  async function list(repo, kind = 'issue', { state = 'open', page = 1, perPage = 30, force = false } = {}) {
    if (!repoOf(repo)) return { state: 'error', items: [], at: 0 }
    return read(urlOf(repo, kind, { state, page, perPage }), `${repo}|${kind}|${state}|${page}`, force, (all) => all.filter((r) => (kind === 'pr' ? true : !isPullEntry(r))).map((r) => normalize(r, repo, kind)))
  }
  /** The comments of one issue or pull request (the conversation: /issues/{n}/comments serves both), oldest first, one page of COMMENTS_MAX. */
  async function comments(repo, number, { force = false } = {}) {
    if (!repoOf(repo) || !Number.isInteger(Number(number))) return { state: 'error', items: [], at: 0 }
    return read(`${base()}/repos/${repoSlug(repo)}/issues/${Number(number)}/comments?per_page=${COMMENTS_MAX}&page=1`, `${repo}|comments|${Number(number)}`, force, (all) => all.map(normalizeComment))
  }
  /**
   * The Issue Forms of a repository (.github/ISSUE_TEMPLATE/*.yml), read once and kept for TEMPLATES_TTL_MS, with the same ETag and rate-limit rules as the other reads: the folder, then each file. -> { state, items: [template] }
   * `items` are parseTemplate results; any file that cannot be read is left out. Not ok (rate, offline, a repository without the folder): the page keeps its built-in templates.
   */
  async function templates(repo, { force = false } = {}) {
    if (!repoOf(repo)) return { state: 'error', items: [], at: 0 }
    const slug = repoSlug(repo)
    const dir = await read(`${base()}/repos/${slug}/contents/.github/ISSUE_TEMPLATE`, `${repo}|templates-dir`, force, (all) => all.filter((f) => f.type === 'file' && /\.ya?ml$/i.test(f.name) && f.name !== 'config.yml').map((f) => ({ name: f.name, path: f.path, sha: f.sha })), { ttl: TEMPLATES_TTL_MS })
    if (dir.state !== 'ok') return { state: dir.state, items: [], at: dir.at, resetAt: dir.resetAt }
    const items = []
    for (const f of dir.items.slice(0, TEMPLATES_MAX)) {
      const one = await read(`${base()}/repos/${slug}/contents/${f.path.split('/').map(encodeURIComponent).join('/')}`, `${repo}|template|${f.name}|${f.sha || ''}`, force, (raw) => {
        const file = raw[0]
        if (!file || typeof file.content !== 'string') return []
        let text = ''
        try { text = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), (c) => c.charCodeAt(0))) } catch { return [] }
        const t = parseTemplate(f.name, text)
        return t ? [t] : []
      }, { ttl: TEMPLATES_TTL_MS, object: true })
      if (one.state === 'rate') return { state: 'rate', items, at: one.at, resetAt: one.resetAt }
      if (one.state === 'ok') items.push(...one.items)
    }
    return { state: 'ok', items, at: dir.at }
  }
  return { list, comments, templates, rate: () => ({ ...rate }), forget() { memory.clear(); try { storage?.removeItem(CACHE_KEY) } catch { /* nothing */ } } }
}

/** "12 分钟前" / "12 min ago" from an ISO time. */
export function ago(iso, { now = Date.now(), locale = 'zh' } = {}) {
  const t = Date.parse(iso)
  if (!t) return ''
  const zh = /^zh/i.test(String(locale))
  const s = Math.max(0, Math.round((now - t) / 1000))
  const m = Math.round(s / 60); const h = Math.round(s / 3600); const d = Math.round(s / 86400)
  if (s < 45) return zh ? '刚刚' : 'just now'
  if (m < 60) return zh ? `${m} 分钟前` : `${m} min ago`
  if (h < 24) return zh ? `${h} 小时前` : `${h} h ago`
  if (d === 1) return zh ? '昨天' : 'yesterday'
  if (d < 30) return zh ? `${d} 天前` : `${d} d ago`
  const date = new Date(t)
  return zh ? `${date.getMonth() + 1} 月 ${date.getDate()} 日` : date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

let shared = null
/** The one client of the window: the page and the check behind the rail's dot share its cache. Signed in with the backend configured, it reads through the Worker. */
export const sharedGithubClient = () => (shared ||= createGithubClient({
  base: () => { const b = devBackend(); return b.configured && readSession() ? `${b.workerUrl}/github` : API },
  token: () => { const b = devBackend(); const s = b.configured ? readSession() : null; return s ? s.handle : '' },
}))
