// Reads the people out of the host README. Pure, so the build script and the tests share it.

const AVATAR = /https:\/\/avatars\.githubusercontent\.com\/(?:u|in)\/(\d+)/
const isBotUrl = (url) => /github\.com\/apps\//.test(url)

/** The "基地开发团队成员" / "AlkaidLab development team" table: avatar link cells. */
export function parseTeam(readme) {
  const text = String(readme || '')
  const start = text.search(/^##\s+(基地开发团队成员|AlkaidLab development team)/m)
  if (start < 0) return []
  const rest = text.slice(start + 1)
  const end = rest.search(/\n##\s/)
  const block = end < 0 ? rest : rest.slice(0, end)
  const people = []
  for (const m of block.matchAll(/\[!\[([^\]]+)\]\((https:\/\/avatars\.githubusercontent\.com\/u\/(\d+)[^)]*)\)\]\((https:\/\/github\.com\/([^)\s]+))\)/g)) {
    people.push({ login: m[1], id: m[3], url: m[4], bot: false })
  }
  return people
}

/** The block between CONTRIBUTORS:START and CONTRIBUTORS:END. Bots (apps) are marked, not dropped. */
export function parseContributors(readme) {
  const text = String(readme || '')
  const a = text.indexOf('<!-- CONTRIBUTORS:START -->')
  const b = text.indexOf('<!-- CONTRIBUTORS:END -->')
  if (a < 0 || b < a) return []
  const people = []
  const seen = new Set()
  for (const m of text.slice(a, b).matchAll(/<a href="(https:\/\/github\.com\/[^"]+)"><img src="([^"]+)"[^>]*alt="([^"]*)"/g)) {
    const id = AVATAR.exec(m[2].replace(/&amp;/g, '&'))?.[1]
    if (!id || seen.has(id)) continue
    seen.add(id)
    people.push({ login: m[3], id, url: m[1], bot: isBotUrl(m[1]) || /\[bot\]$/.test(m[3]) })
  }
  return people
}
