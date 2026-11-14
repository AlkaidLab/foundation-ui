// Builds the data of the about page from the host repository: the contributors block of the README (names, ids, links) and
// the avatars, which are copied into the package so the page works offline.
//   node scripts/build-about.mjs <host-repo-dir> [--no-fetch]
// Writes src/about/contributors.json and src/about/avatars/<id>.<ext> (and <id>-256.<ext> for the team). Avatars already present are kept.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { parseContributors, parseTeam } from '../src/about/readme.js'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'src', 'about')
const host = process.argv[2]
if (!host) { console.error('usage: node scripts/build-about.mjs <host-repo-dir> [--no-fetch]'); process.exit(2) }
const readme = readFileSync(join(host, 'README.md'), 'utf8')
const people = [...parseTeam(readme).map((p) => ({ ...p, team: true })), ...parseContributors(readme)]
mkdirSync(join(out, 'avatars'), { recursive: true })

const extOf = (buf) => (buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg' : buf[0] === 0x89 && buf[1] === 0x50 ? 'png' : buf.slice(0, 4).toString() === 'RIFF' ? 'webp' : '')
const have = (id) => ['jpg', 'png', 'webp'].find((ext) => existsSync(join(out, 'avatars', `${id}.${ext}`)))

for (const person of people) {
  let ext = have(person.id)
  if (!ext && !process.argv.includes('--no-fetch')) {
    const res = await fetch(`https://avatars.githubusercontent.com/u/${person.id}?s=96`)
    if (!res.ok) { console.error(`avatar ${person.login}: HTTP ${res.status}`); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    ext = extOf(buf)
    if (!ext) { console.error(`avatar ${person.login}: unknown image type`); continue }
    writeFileSync(join(out, 'avatars', `${person.id}.${ext}`), buf)
  }
  person.avatar = ext ? `${person.id}.${ext}` : ''
}

// the team's avatars also at 256 px (the same image, larger): the pixel friends show them as a badge that must stay sharp on a dense screen
for (const person of people.filter((p) => p.team)) {
  if (['jpg', 'png', 'webp'].some((ext) => existsSync(join(out, 'avatars', `${person.id}-256.${ext}`))) || process.argv.includes('--no-fetch')) continue
  const res = await fetch(`https://avatars.githubusercontent.com/u/${person.id}?s=256`)
  if (!res.ok) { console.error(`avatar ${person.login} 256: HTTP ${res.status}`); continue }
  const buf = Buffer.from(await res.arrayBuffer())
  const ext = extOf(buf)
  if (ext) writeFileSync(join(out, 'avatars', `${person.id}-256.${ext}`), buf)
}

// commits per author in the host history (the team only): the one number the history states about each member
const commitCount = (login, names) => {
  const log = execFileSync('git', ['-C', host, 'log', '--format=%an'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n')
  return log.filter((name) => names.some((n) => n.toLowerCase() === name.toLowerCase())).length
}
const ALIASES = { qiin2333: ['qiin2333', 'qiin'], Yundi339: ['Yundi339'], ShadowLemoon: ['ShadowLemoon'], skyhua0224: ['skyhua0224', 'SkyHua'] }
for (const person of people.filter((p) => p.team)) person.commits = commitCount(person.login, ALIASES[person.login] || [person.login])

const head = execFileSync('git', ['-C', host, 'log', '-1', '--format=%H %cs'], { encoding: 'utf8' }).trim()
writeFileSync(join(out, 'contributors.json'), JSON.stringify({ source: 'README.md of the host repository', host: head, people }, null, 1) + '\n')
console.log(`${people.length} people, ${people.filter((p) => p.avatar).length} avatars`)
