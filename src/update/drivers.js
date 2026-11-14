// Driver and component signals in a release.
//
// The release metadata has no structured field for drivers: its channels carry version, prerelease, githubReleaseId,
// publishedAt, releaseNotes and assets (installer, portable archive, checksums, the DualSense sidecar package). The only
// place a driver is named is the release notes, so that is the only place read here, and only the plain lines
// `parseReleaseNotes` produced. Nothing is inferred from a version number or an asset name.

const DRIVER = /\bdrivers?\b|驱动|驅動/i
const COMPONENT = /\bcomponents?\b|组件|組件/i
// The line tells the reader to stay away from something or names a known fault.
const CAUTION = /避开|避免|不要|请勿|切勿|不建议|\bavoid\b|\bdo not\b|\bdon['’]t\b|\bknown (?:issue|bug|problem)s?\b|\bbroken\b|\bregress/i
// The line says something is updated or shipped.
const CHANGE = /\b(?:update[ds]?|upgrade[ds]?|bump(?:ed)?|ship(?:s|ped)?|install(?:s|ed)?)\b|更新|升级|安装|内置/i

export const DRIVER_LEVELS = Object.freeze(['caution', 'update', 'mention'])
const RANK = { caution: 0, update: 1, mention: 2 }
const MAX_ITEMS = 3

const levelOf = (text) => (CAUTION.test(text) ? 'caution' : CHANGE.test(text) ? 'update' : 'mention')

/**
 * @param {{ title?: string, lines?: Array<{ text: string }> } | null | undefined} parsed result of parseReleaseNotes
 * @returns {{ found: boolean, driver: boolean, component: boolean, level: 'caution'|'update'|'mention'|'', items: Array<{ topic: 'driver'|'component', level: string, text: string }> }}
 */
export const detectDriverNotes = (parsed) => {
  const items = []
  const seen = new Set()
  for (const line of parsed?.lines || []) {
    const text = typeof line?.text === 'string' ? line.text : ''
    if (!text || seen.has(text)) continue
    const topic = DRIVER.test(text) ? 'driver' : COMPONENT.test(text) ? 'component' : ''
    if (!topic) continue
    seen.add(text)
    items.push({ topic, level: levelOf(text), text })
  }
  items.sort((a, b) => (a.topic === b.topic ? 0 : a.topic === 'driver' ? -1 : 1) || RANK[a.level] - RANK[b.level])
  const driver = items.some((item) => item.topic === 'driver')
  const component = items.some((item) => item.topic === 'component')
  const shown = items.slice(0, MAX_ITEMS)
  const strongest = items.reduce((best, item) => (best === '' || RANK[item.level] < RANK[best] ? item.level : best), '')
  return { found: items.length > 0, driver, component, level: strongest, items: shown }
}
