import contributors from './contributors.json' with { type: 'json' }
import { inTeamOrder } from './data.js'

export { BILIBILI, SITE_LINK, brandUrl, PRODUCT, PROJECT_LINKS, THANKS, FONTS, NOTICE_URL, CONTRIBUTORS_URL, TEAM_PROJECTS, TEAM_ORDER, TEAM_SPONSORS, FOUNDER, SPONSORS, inTeamOrder, linkDetail, resolveLink, buildDateOf, versionSubline, versionText, LONG_PRESS_MS } from './data.js'
export { aboutTexts } from './texts.js'
export { buildChannelLabel, buildRows, buildTimeLocal, normalizeBuild } from './build.js'
export { parseContributors, parseTeam } from './readme.js'
export { CREDITS_TAPS, CREDITS_WINDOW_MS, VIVI_TAPS, EGG_WINDOW_MS, tapCounter } from './eggs.js'
export { FRIENDS, friendSheet, friendLine } from './friends.js'

/** People of the README: `team` (the four of the development team, with their commit counts, in the team's choice) and `others` (the contributors block, bots left out). */
export const TEAM = Object.freeze(inTeamOrder(contributors.people.filter((p) => p.team)))
export const CONTRIBUTORS = Object.freeze(contributors.people.filter((p) => !p.team && !p.bot))
export const CONTRIBUTORS_SOURCE = contributors.host
export { shortVersion, hasTestSuffix, titleVersionView, titleVersionTip, reportText } from './titleVersion.js'
