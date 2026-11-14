// Announcements that ship with the product and are always there, also offline and before the file was ever fetched. They are plain notices in the list (never a popup, never a warning),
// they cannot be dismissed, and they do not count as unread.

export const OPEN_SOURCE_ID = 'builtin-open-source'
export const REPO_URL = 'https://github.com/AlkaidLab/foundation-sunshine'

// The standard wording of MAA and ZZZ OneDragon, by name and licence: free and open source, nobody is authorised to sell it, and a refund when it was bought.
export const OPEN_SOURCE_TEXT = Object.freeze({
  zh: 'Foundation Sunshine 是开源、免费的软件（GPL-3.0）。本项目未授权任何个人、商家或自媒体账号售卖；如果你是付费购买的，请立即申请退款。',
  en: 'Foundation Sunshine is free, open-source software (GPL-3.0). This project has not authorised any individual, shop or media account to sell it. If you paid for it, please ask for a refund right away.',
})

export const BUILTIN_ITEMS = Object.freeze([
  Object.freeze({
    id: OPEN_SOURCE_ID, builtin: true, severity: 'info', mode: 'notice', countdown: 0, type: 'notice', category: 'announce', banner: null, published: null, revision: '1', pinned: true,
    title: Object.freeze({ zh: '开源与免费声明', en: 'Open source and free' }),
    body: Object.freeze({ zh: `${OPEN_SOURCE_TEXT.zh}\n\n[GitHub](${REPO_URL})`, en: `${OPEN_SOURCE_TEXT.en}\n\n[GitHub](${REPO_URL})` }),
    url: REPO_URL, starts: null, ends: null, minVersion: null, maxVersion: null,
  }),
])
