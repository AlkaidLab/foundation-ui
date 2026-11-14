import { textTable } from '../locale/texts/index.js'
// The words of the update source and the Mirror酱 CDK, and every error as a plain sentence with what to do. Chinese and English; any other language reads English.
const EN = {
  source: 'Update source', channel: 'Update channel',
  sources: { auto: 'Automatic', cnb: 'CNB', github: 'GitHub', mirror: 'MirrorChyan' },
  // MirrorChyan: the wording is MAA's (MaaAssistantArknights, MaaWpfGui/Res/Localizations/en-us.xaml: UpdateSourceTip, MirrorChyanCdk*), the product name aside
  // what MirrorChyan is: the site's own sentence (https://mirrorchyan.com, 2026-11-07); the second sentence is what this software does with a CDK (source.js)
  // what MirrorChyan is, said accurately: its own site says users pay for access and the revenue is shared with developers (mirrorchyan.com), its FAQ says the share follows the users' subscriptions and
  // that updates can be checked without a CDK, then downloaded from the project's own source (github.com/MirrorChyan/docs FAQ.md; 2026-11-10). Nothing is claimed about where it serves from beyond the label 国内高速.
  mirrorAbout: 'MirrorChyan is a download acceleration service for open-source projects, and a way to sponsor their developers. With a subscription, a CDK speeds up downloads, and the revenue is shared with the developers who use MirrorChyan, this project included. The CDK is optional; without one, updates download from CNB or GitHub.', tagDomestic: 'Fast in China', tagPaid: 'Paid',
  // shown on the start page, in the about page and in the installer
  freeNotice: 'This program is free and open-source software. If you paid for it through any channel, ask for a refund right away.', supportLine: 'To support development, subscribe to MirrorChyan: faster downloads that sponsor the developers directly.',
  cdkOptional: 'MirrorChyan CDK (optional)', getCdk: 'Get a CDK', remainingDays: 'CDK expires in {0} days.', fetchFailed: 'Failed to retrieve CDK information. Showing the result from the last successful query.',
  cdk: 'MirrorChyan CDK', cdkHint: 'Kept in the system secure store; not shown again once saved.', save: 'Save', clear: 'Remove', check: 'Check CDK', checking: 'Checking…', saved: 'CDK saved', removed: 'CDK removed',
  unavailable: 'The secure store needs a newer control panel.',
  status: { none: 'No CDK', valid: 'CDK valid', expired: 'CDK expired', invalid: 'CDK invalid', limit: 'Daily download limit reached', banned: 'CDK banned', type: 'This CDK is not for this software', test: 'This is a test CDK', unknown: 'Could not tell', offline: 'MirrorChyan did not answer' },
  errors: {
    'cdk-expired': 'The CDK has expired. Please use a new CDK for authorization.',
    'cdk-invalid': 'The CDK is invalid. Please check if the input is correct.',
    'cdk-limit': 'The CDK has reached the maximum download limit for today. Please try again tomorrow.',
    'cdk-type': 'The CDK type does not match the resource to be downloaded. Please check the CDK\'s applicable scope.',
    'cdk-banned': 'The CDK has been blocked, possibly due to a refund or abnormal usage.',
    // the cases MAA has no sentence for, in the same tone
    'cdk-test': 'The CDK is a test CDK. It cannot be used for real downloads.',
    'no-resource': 'MirrorChyan has no version for this system and channel yet.',
    params: 'MirrorChyan did not accept the request. Please update the control panel and try again.',
    server: 'MirrorChyan had an error. Please try again later.', malformed: 'MirrorChyan sent something that is not an answer.', network: 'MirrorChyan did not answer. Please check the network.', unknown: 'MirrorChyan refused for a reason this panel does not know.',
  },
}
const ZH = {
  source: '更新来源', channel: '更新通道',
  sources: { auto: '自动', cnb: 'CNB', github: 'GitHub', mirror: 'Mirror酱' },
  // Mirror酱: the wording is MAA's (MaaAssistantArknights, MaaWpfGui/Res/Localizations/zh-cn.xaml: UpdateSourceTip, MirrorChyanCdk*), the product name aside
  mirrorAbout: 'Mirror酱 是面向开源项目的下载加速服务，也是一项开发者赞助计划。订阅后可用 CDK 加速下载，订阅收入会按订阅情况分给接入 Mirror酱 的开发者，包括本项目。CDK 为可选项，不填时从 CNB 或 GitHub 下载。', tagDomestic: '国内高速', tagPaid: '付费',
  freeNotice: '本程序是免费、开源的自由软件。如果你通过任何渠道付费购买了本程序，请立即申请退款。', supportLine: '如果想支持项目开发，可以订阅 Mirror酱：下载更快，同时直接赞助开发者。',
  cdkOptional: 'Mirror酱 CDK（可选）', getCdk: '获取 CDK', remainingDays: 'CDK 还剩 {0} 天到期。', fetchFailed: '获取 CDK 信息失败，已显示上次成功查询的结果。',
  cdk: 'Mirror酱 CDK', cdkHint: '保存在系统安全存储中，保存后不再显示。', save: '保存', clear: '移除', check: '检查 CDK', checking: '正在检查…', saved: 'CDK 已保存', removed: 'CDK 已移除',
  unavailable: '安全存储需要更新的控制面板。',
  status: { none: '没有 CDK', valid: 'CDK 有效', expired: 'CDK 已过期', invalid: 'CDK 无效', limit: '今日下载次数已用尽', banned: 'CDK 已被封禁', type: '这个 CDK 不适用于本软件', test: '这是测试用 CDK', unknown: '无法判断', offline: 'Mirror酱没有回应' },
  errors: {
    'cdk-expired': 'CDK 已过期，请使用新的 CDK 进行授权。',
    'cdk-invalid': 'CDK 无效，请检查输入是否正确。',
    'cdk-limit': 'CDK 今日下载次数已达上限，请明日再试。',
    'cdk-type': 'CDK 类型与待下载的资源不匹配，请检查 CDK 适用范围。',
    'cdk-banned': 'CDK 已被封禁，可能由于退款或非正常使用。',
    // MAA 没有对应句子的情况，语气保持一致
    'cdk-test': 'CDK 是测试用 CDK，不能用于实际下载。',
    'no-resource': 'Mirror酱 暂无适用于当前系统与通道的版本。',
    params: 'Mirror酱 未接受本次请求，请更新控制面板后重试。',
    server: 'Mirror酱 出错了，请稍后再试。', malformed: '无法识别 Mirror酱 的回复。', network: 'Mirror酱 没有回应，请检查网络。', unknown: 'Mirror酱 拒绝了本次请求，原因未知。',
  },
}
export const updateSourceTexts = (locale) => textTable('source', locale, EN, ZH)
