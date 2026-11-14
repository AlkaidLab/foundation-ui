import { canonicalLocale } from '../locale/texts/resolve.js'
// Text of the about page: Chinese and English, every other language falls back to English. A product may override single entries.

const EN = {
  title: 'About', slogan: 'Game streaming, more elegantly', version: 'Version', channel: 'Channel', built: 'Built',
  stable: 'Stable', prerelease: 'Pre-release', copy: 'Copy version', copied: 'Copied',
  check: 'Check for updates', checking: 'Checking…', latest: 'Up to date', failed: 'Check failed, try again', available: 'Update available',
  projectTitle: 'Project', site: 'Website', bilibili: 'Bilibili', docs: 'Documentation', github: 'GitHub', changelog: 'Changelog', license: 'Licence', qq: 'QQ group', issues: 'Report an issue',
  developers: 'Developers', teamRole: 'AlkaidLab development team', commits: '{n} commits', projects: 'Projects',
  testflight: 'TestFlight',
  contributors: 'Contributors', contributorsAll: 'All contributions', contributorsLine: '{n} people from Foundation and Sunshine upstream',
  thanks: 'Open source', thanksUpstream: 'Based on Sunshine', thirdParty: 'Third-party licences', gpl: 'GPL-3.0',
  supportTitle: 'Support us', star: 'Star on GitHub', sponsor: 'Sponsor', share: 'Share', shareText: 'Foundation Sunshine: game streaming, more elegantly', shareCopied: 'Link copied',
  dismiss: 'Dismiss',
  open: 'Open', less: 'Show fewer', freeTitle: 'Free and open source, not for sale', freeText: 'No one is authorised to sell it. If you paid for it, ask for a refund right away.',
  viviSlogan: 'Vivi keeps every frame smooth for you', viviLabel: 'Say hi to Vivi', versionUnknown: 'not read yet',
  founder: 'Founder', follow: 'Follow on GitHub', sponsorAfdian: 'Sponsor on Afdian',
  credits: 'Credits', creditsTeam: 'Team', creditsSponsors: 'Sponsors', creditsUpstream: 'Built on', creditsFonts: 'Fonts (SIL Open Font License 1.1)', creditsContributors: 'Contributors',
  creditsEnd: 'Thank you to everyone who streams with Foundation Sunshine.', creditsPause: 'Pause', creditsPlay: 'Play',
  buildDetails: 'Build details', buildCommit: 'Commit', buildDirty: 'uncommitted changes', buildTime: 'Built', buildBranch: 'Branch', buildVariant: 'Variant', buildPackage: 'Package', buildBuilder: 'Built by', copyCommit: 'Copy commit',
  buildChannels: { stable: 'Stable', beta: 'Pre-release', dev: 'Development', local: 'Local build' }, buildPackages: { installer: 'Installer', portable: 'Portable' }, buildBuilders: { ci: 'CI', local: 'This computer' },
  updateChannel: 'Update channel', channelNote: 'Pre-releases bring new features sooner and can be less stable.', channelFailed: 'The update channel was not saved. Try again.',
  viviFound: 'You found the whole team!', friendsLabel: 'Pixel friends of the team', friendClose: 'Close',
  viviLines: ['Have fun today!', 'Less latency, more joy.', 'Stuck? Ask Mita AI.', 'Take a break, your eyes count too.', 'I am right here.', 'One more round?'],
}
const ZH = {
  title: '关于', slogan: '让游戏串流更优雅', version: '版本', channel: '通道', built: '构建',
  stable: '正式版', prerelease: '测试版', copy: '复制版本', copied: '已复制',
  check: '检查更新', checking: '检查中…', latest: '已是最新', failed: '检查失败，重试', available: '有新版本',
  projectTitle: '项目', site: '官网', bilibili: 'B 站', docs: '文档', github: 'GitHub', changelog: '更新日志', license: '许可证', qq: 'QQ 交流群', issues: '问题反馈',
  developers: '开发者', teamRole: '基地开发团队成员', commits: '{n} 次提交', projects: '项目',
  testflight: 'TestFlight',
  contributors: '贡献者', contributorsAll: '全部贡献记录', contributorsLine: '来自 Foundation 与 Sunshine 上游的 {n} 位贡献者',
  thanks: '开源致谢', thanksUpstream: '基于 Sunshine', thirdParty: '第三方许可', gpl: 'GPL-3.0',
  supportTitle: '支持我们', star: '在 GitHub 点 Star', sponsor: '赞助', share: '分享', shareText: 'Foundation Sunshine：让游戏串流更优雅', shareCopied: '链接已复制',
  dismiss: '关闭',
  open: '打开', less: '收起', freeTitle: '开源、免费，未授权任何人售卖', freeText: '如果你是付费购买的，请立即申请退款。',
  viviSlogan: '薇薇陪你，让每一帧都顺滑', viviLabel: '和薇薇打个招呼', versionUnknown: '还没读到',
  founder: '创始人', follow: '在 GitHub 关注', sponsorAfdian: '在爱发电赞助',
  credits: '制作人员', creditsTeam: '开发团队', creditsSponsors: '赞助', creditsUpstream: '基于', creditsFonts: '字体（SIL Open Font License 1.1）', creditsContributors: '贡献者',
  creditsEnd: '感谢每一位用 Foundation Sunshine 串流的人。', creditsPause: '暂停', creditsPlay: '播放',
  buildDetails: '构建详情', buildCommit: '提交', buildDirty: '含未提交的改动', buildTime: '构建时间', buildBranch: '分支', buildVariant: '变体', buildPackage: '安装方式', buildBuilder: '构建方', copyCommit: '复制提交',
  buildChannels: { stable: '正式版', beta: '测试版', dev: '开发版', local: '本地构建' }, buildPackages: { installer: '安装版', portable: '便携版' }, buildBuilders: { ci: 'CI', local: '本机' },
  updateChannel: '更新通道', channelNote: '测试版更早带来新功能，也可能不稳定。', channelFailed: '更新通道没有保存，请重试。',
  viviFound: '你找到大家啦！', friendsLabel: '开发团队的像素小伙伴', friendClose: '关闭',
  viviLines: ['今天也要玩得开心！', '延迟低一点，快乐多一点。', '卡住了？问问米塔 AI。', '休息一下，眼睛也要保养。', '我一直在这儿呢。', '再来一局？'],
}
const merge = (base, extra) => (extra ? { ...base, ...extra } : base)

const BRAND = {
  zh_TW: { site: '官網', bilibili: 'B 站' },
  de: { site: 'Webseite', bilibili: 'Bilibili' },
  fr: { site: 'Site', bilibili: 'Bilibili' },
  es: { site: 'Sitio', bilibili: 'Bilibili' },
  it: { site: 'Sito', bilibili: 'Bilibili' },
  ja: { site: '公式サイト', bilibili: 'Bilibili' },
  ko: { site: '웹사이트', bilibili: 'Bilibili' },
  ru: { site: 'Сайт', bilibili: 'Bilibili' },
  pt_BR: { site: 'Site', bilibili: 'Bilibili' },
  pt: { site: 'Sítio', bilibili: 'Bilibili' },
  bg: { site: 'Сайт', bilibili: 'Bilibili' },
  cs: { site: 'Web', bilibili: 'Bilibili' },
  pl: { site: 'Strona', bilibili: 'Bilibili' },
  sv: { site: 'Webbplats', bilibili: 'Bilibili' },
  tr: { site: 'Site', bilibili: 'Bilibili' },
  uk: { site: 'Сайт', bilibili: 'Bilibili' },
}

export const aboutTexts = (locale = 'en', overrides = null) => {
  const code = canonicalLocale(locale)
  const base = code === 'zh' || code === 'zh_TW' ? merge(EN, ZH) : EN
  const brand = code === 'zh_TW' ? BRAND.zh_TW : BRAND[code]
  return merge(brand ? merge(base, brand) : base, overrides)
}
