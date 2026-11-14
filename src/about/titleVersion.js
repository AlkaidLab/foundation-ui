// The version in the caption bar of both products: a short form beside the name, a 测试版 tag for a pre-release build, and the text a click copies for a bug report.
// Pure: no DOM, no Vue. The identity of the build is what the host recorded (see build.js); without it the suffix of the version is the only hint and the view says so (`testFrom`).
import { normalizeBuild } from './build.js'
import { PRODUCT } from './data.js'

const clean = (version) => String(version || '').trim().replace(/^[vV](?=\d)/, '')

/**
 * The short version: the host stamps "YYYY.MMDD.HHMMSS[.suffix]", the short form is "YYYY.MMDD" (2026.1107). A semantic version keeps major.minor.patch without its suffix;
 * anything else is kept as it is up to 14 characters. '' when there is no version.
 */
export function shortVersion(version) {
  const v = clean(version)
  if (!v) return ''
  const stamp = /^(\d{4})\.(\d{4})(?:\.|$)/.exec(v)
  if (stamp) return `${stamp[1]}.${stamp[2]}`
  const semantic = /^(\d+\.\d+(?:\.\d+)?)(?:[-+.]|$)/.exec(v)
  if (semantic) return semantic[1]
  return v.length > 14 ? v.slice(0, 14) : v
}

/** A pre-release hint in the version text itself: -beta, -rc.1, -alpha, -dev, -pre, .beta2 */
export const hasTestSuffix = (version) => /(?:^|[-+._])(?:alpha|beta|rc|pre|dev|test|nightly)(?:[-+._\d]|$)/i.test(clean(version))

/**
 * What the caption bar shows.
 *   test: this is a pre-release build; testFrom: 'build' (the recorded channel: beta, dev, local) | 'suffix' (the version text; the build carries no identity) | ''
 *   the channel 'stable' is never a test build, even if the version text looks like one
 */
export function titleVersionView({ version, build } = {}) {
  const full = clean(version)
  const identity = normalizeBuild(build)
  const channel = identity ? identity.channel : ''
  let test = false
  let testFrom = ''
  if (channel) { test = channel !== 'stable'; testFrom = test ? 'build' : '' } else if (hasTestSuffix(full)) { test = true; testFrom = 'suffix' }
  return { full, short: shortVersion(full), test, testFrom, channel, commit: identity ? identity.commitShort : '' }
}

/** The tooltip of the version: the full version, and the build date or commit when known. */
export function titleVersionTip(view, T) {
  if (!view.full) return ''
  return [view.full, view.test ? T.test : '', view.commit].filter(Boolean).join(' · ')
}

/** The text a click copies for a bug report: the product and the full version, the channel, the commit, the build time, the package and the operating system, one fact per line. */
export function reportText({ version, build, os = '' } = {}, T, timeLocal = () => '') {
  const view = titleVersionView({ version, build })
  const b = normalizeBuild(build)
  const channelName = b && b.channel ? (T.channels && T.channels[b.channel]) || b.channel : view.test ? T.test : ''
  const lines = [
    `${PRODUCT.name} ${view.full || T.unknown}`,
    channelName && `${T.channel}: ${channelName}`,
    b && `${T.commit}: ${b.commit}${b.dirty ? ` (${T.dirty})` : ''}`,
    b && b.branch && `${T.branch}: ${b.branch}`,
    b && timeLocal(b.buildTimeUtc) && `${T.built}: ${timeLocal(b.buildTimeUtc)}`,
    b && b.package && `${T.package}: ${(T.packages && T.packages[b.package]) || b.package}`,
    os && `${T.os}: ${os}`,
  ]
  return lines.filter(Boolean).join('\n')
}
