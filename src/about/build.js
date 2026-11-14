// The build identity of the host as the about page shows it (`build` of MAbout): the channel the build was made for, the UTC build time in
// local time, and the 构建详情 rows (commit, branch, variant, package, builder). The product reads the identity (the panel from the VERSIONINFO
// of sunshine.exe, the Web UI from GET /api/version) and passes it as is; no guessing from the version string. Pure: no DOM, no Vue.
//   build: { version, commit, commitShort, branch, dirty, channel, buildTimeUtc, variant, package, packageSource, builder, ciRun }
//          (camelCase from the panel, snake_case from /api/version: both are read)

const pick = (build, camel, snake) => (build ? build[camel] ?? build[snake] ?? '' : '')

/** The identity with one spelling (camelCase), or null when there is none (an older host). */
export function normalizeBuild(build) {
  if (!build || typeof build !== 'object') return null
  const commit = String(pick(build, 'commit', 'commit')).toLowerCase()
  if (!/^[0-9a-f]{7,40}$/.test(commit)) return null
  return {
    version: String(pick(build, 'version', 'version')),
    commit,
    commitShort: String(pick(build, 'commitShort', 'commit_short') || commit.slice(0, 12)),
    branch: String(pick(build, 'branch', 'branch')),
    dirty: Boolean(pick(build, 'dirty', 'dirty')),
    channel: String(pick(build, 'channel', 'channel')),
    buildTimeUtc: String(pick(build, 'buildTimeUtc', 'build_time_utc')),
    variant: String(pick(build, 'variant', 'variant')),
    package: String(pick(build, 'package', 'package')),
    builder: String(pick(build, 'builder', 'builder')),
    ciRun: String(pick(build, 'ciRun', 'ci_run')),
  }
}

/** 正式版 / 测试版 / 开发版 / 本地构建; '' for an unknown channel. */
export const buildChannelLabel = (channel, T) => (T.buildChannels && T.buildChannels[channel]) || ''

/** The UTC build time in the person's local time (YYYY-MM-DD HH:MM:SS); '' when it does not parse. */
export function buildTimeLocal(iso) {
  const ms = Date.parse(String(iso || ''))
  if (!Number.isFinite(ms) || !/Z$/.test(String(iso))) return ''
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** The 构建详情 rows: [{ id, label, value, copy? }], rows without a value left out. */
export function buildRows(build, T) {
  const b = normalizeBuild(build)
  if (!b) return []
  const rows = [
    { id: 'commit', label: T.buildCommit, value: b.commit + (b.dirty ? ` (${T.buildDirty})` : ''), copy: b.commit },
    { id: 'channel', label: T.channel, value: buildChannelLabel(b.channel, T) },
    { id: 'time', label: T.buildTime, value: buildTimeLocal(b.buildTimeUtc) },
    { id: 'branch', label: T.buildBranch, value: b.branch },
    { id: 'variant', label: T.buildVariant, value: b.variant },
    { id: 'package', label: T.buildPackage, value: (T.buildPackages && T.buildPackages[b.package]) || b.package },
    { id: 'builder', label: T.buildBuilder, value: (T.buildBuilders && T.buildBuilders[b.builder]) || b.builder },
  ]
  return rows.filter((row) => row.value)
}
