// The repositories of the Issue 与 PR page: only the ones this product is built from (). A repository that was not confirmed is not here, whatever else the build touches.
// `private`: listed only while the person is signed in with access to it (GitHub answers 404 to a request without).
export const DEV_REPOS = Object.freeze([
  Object.freeze({ id: 'fs', owner: 'AlkaidLab', name: 'foundation-sunshine', icon: 'dns', hue: 'primary' }),
  Object.freeze({ id: 'cp', owner: 'qiin2333', name: 'sunshine-control-panel', icon: 'tune', hue: 'secondary' }),
  Object.freeze({ id: 'vdd', owner: 'qiin2333', name: 'zako-vdd', icon: 'desktop_windows', hue: 'tertiary' }),
  Object.freeze({ id: 'vm', owner: 'AlkaidLab', name: 'ZakoVirtualMouse', icon: 'mouse', hue: 'secondary', private: true }),
  Object.freeze({ id: 'ah', owner: 'AlkaidLab', name: 'moonlight-audio-haptics', icon: 'graphic_eq', hue: 'tertiary' }),
])
export const DEFAULT_REPO = 'fs'
export const repoOf = (id) => DEV_REPOS.find((r) => r.id === id) || null
export const repoSlug = (id) => { const r = repoOf(id); return r ? `${r.owner}/${r.name}` : '' }
export const repoUrl = (id) => (repoOf(id) ? `https://github.com/${repoSlug(id)}` : '')
/** The repositories the person can see: the private one only with access. */
export const visibleRepos = ({ signedIn = false } = {}) => DEV_REPOS.filter((r) => !r.private || signedIn)

// which repository a report about this place belongs to; anything not named goes to the host's repository
const AREA = [
  [/vdd|virtual-?display/i, 'vdd'],
  [/virtual-?mouse|vmouse/i, 'vm'],
  [/haptic/i, 'ah'],
]
/** -> the repository id for a report: `hint` is a route, a page name or a component name. */
export function repoForArea(hint = '') {
  const text = String(hint || '')
  for (const [re, id] of AREA) if (re.test(text)) return id
  return DEFAULT_REPO
}

const URL_LIMIT = 7000
/** The page for a new issue on GitHub with the title and the text filled in (no account needed here: GitHub asks the person to sign in on its own page). The text is cut so the address stays usable. */
export function newIssueUrl(id, { title = '', body = '', labels = [] } = {}) {
  const r = repoOf(id) || repoOf(DEFAULT_REPO)
  const url = new URL(`https://github.com/${r.owner}/${r.name}/issues/new`)
  url.searchParams.set('title', String(title).slice(0, 200))
  // a label that the repository does not have is ignored by GitHub (the page never creates one)
  if (labels?.length) url.searchParams.set('labels', labels.join(','))
  let text = String(body)
  const build = (t) => { url.searchParams.set('body', t); return url.href }
  let href = build(text)
  while (href.length > URL_LIMIT && text.length > 200) { text = `${text.slice(0, Math.floor(text.length * 0.8))}…`; href = build(text) }
  return href
}
