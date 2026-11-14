import { canonicalLocale } from '../locale/texts/resolve.js'
// The words of the sign-in page and of 安全与登录. Chinese and English; any other language reads English.
// The wrong-user and wrong-password answers are one sentence on purpose: the host does not say which one was wrong, and neither does the page.

const EN = {
  signInTitle: 'Sign in', signInLead: 'Foundation Sunshine · WebUI panel', forgot: 'Forgot password?', forgotHint: 'Reset it in the Panel on this computer: Host settings › Security and sign-in › Reset password. No old password is needed there. A web page on a phone or another device cannot reset it.', docs: 'Docs', github: 'GitHub', site: 'Website', bilibili: 'Bilibili', language: 'Language', setupTitle: 'Create the account', setupLead: 'Choose a user name and a password for the WebUI panel.',
  username: 'User name', password: 'Password', confirm: 'Repeat the password', remember: 'Stay signed in', rememberHint: 'For up to 30 days on this device. Use it only on a device that is yours.',
  showPassword: 'Show password', signIn: 'Sign in', create: 'Create account and sign in', checking: 'Checking…', back: 'Back',
  passwordRule: 'At least 12 characters. A long sentence is easier to remember than a short mix of symbols.',
  issues: { 'too-short': 'The password needs at least 12 characters.', 'too-long': 'The password can have at most 128 characters.', 'same-as-username': 'The password cannot be your user name.', mismatch: 'The two passwords are not the same.' },
  errors: {
    invalid: 'The user name or the password is wrong.',
    throttled: 'Too many attempts. Try again in {time}.',
    csrf: 'This page is out of date. Reload it and try again.',
    'signed-out': 'You are signed out. Sign in again.',
    'setup-done': 'An account already exists. Sign in with it.',
    'bad-request': 'The host did not accept this. Check the fields.',
    network: 'The host does not answer. Check that it is on and try again.',
    server: 'The host could not do this. Try again in a moment.',
  },
  footerLocal: '',
  units: { seconds: (n) => `${n} s`, minutes: (n) => `${n} min`, hours: (n) => `${n} h`, days: (n) => `${n} days` },

  title: 'Security and sign-in', lead: '',
  now: 'This sign-in', signedAs: 'Signed in as {name}', local: 'This computer', localText: '',
  signedOutTitle: 'You are signed out', signedOutText: 'Sign in again to change the password or to see the devices that are signed in.',
    startedAt: 'Signed in {time}', endsIn: 'Ends in {span} without use', endsAtMost: 'Ends at the latest in {span}', remembered: 'Stays signed in',
  signOut: 'Sign out', signOutAsk: 'Sign out of this device?', signOutAsk2: 'You will need the user name and password to come back.',
  sessions: 'Where you are signed in', sessionsEmpty: 'No other session.', thisDevice: 'This device', lastSeen: 'Last used {time}', lastSeenNow: 'Used just now',
  revoke: 'Sign out', revokeAsk: 'Sign this device out?', revokeAll: 'Sign out everywhere', revokeAllAsk: 'Sign out of every device?', revokeAllText: 'Every session ends, this one too. You sign in again here.',
  revoked: 'Signed out.', revokedAll: 'Signed out everywhere.', cancel: 'Cancel', confirm2: 'Sign out',
  password2: 'Password', passwordText: 'Changing it signs out every other device.', change: 'Change user name and password', resetTitle: 'Reset password', resetText: 'On this computer the old password is not needed. Every device is signed out.', resetUnsupported: 'This host version cannot reset the password here. Change it with the old password.', resetForbidden: 'Only the Panel on the host computer can reset the password without the old one.', current: 'Current password', next: 'New password', repeat: 'Repeat the new password',
  save: 'Save', changed: 'Saved. Other devices are signed out.', wrongCurrent: 'The current password is wrong.',
  unavailable: 'This host cannot manage sign-in yet.', unavailableText: 'It needs a newer host version.',
  failed: 'Could not load the sign-in state.', retry: 'Try again',
  never: 'never', ago: { now: 'just now', minutes: (n) => `${n} min ago`, hours: (n) => `${n} h ago`, days: (n) => `${n} days ago` },
}

const ZH = {
  signInTitle: '登录', signInLead: 'Foundation Sunshine · WebUI 面板', forgot: '忘记密码？', forgotHint: '到这台电脑上的 Panel 重置：主机设置 › 安全与登录 › 重置密码，不需要旧密码。手机或其他设备上的网页不能重置密码。', docs: '文档', github: 'GitHub', site: '官网', bilibili: 'B 站', language: '语言', setupTitle: '创建账号', setupLead: '为 WebUI 面板设置用户名和密码。',
  username: '用户名', password: '密码', confirm: '再输入一次密码', remember: '保持登录', rememberHint: '在这台设备上最长 30 天。只在属于你自己的设备上使用。',
  showPassword: '显示密码', signIn: '登录', create: '创建账号并登录', checking: '检查中…', back: '返回',
  passwordRule: '至少 12 个字符。一句长话比一小串符号更好记。',
  issues: { 'too-short': '密码至少需要 12 个字符。', 'too-long': '密码最多 128 个字符。', 'same-as-username': '密码不能和用户名相同。', mismatch: '两次输入的密码不一样。' },
  errors: {
    invalid: '用户名或密码不对。',
    throttled: '尝试次数太多，请 {time} 后再试。',
    csrf: '页面已过期，请刷新后重试。',
    'signed-out': '你已退出登录，请重新登录。',
    'setup-done': '已经有账号了，请直接登录。',
    'bad-request': '主机没有接受这个请求，请检查填写的内容。',
    network: '主机没有响应。请确认它已开机，然后重试。',
    server: '主机没能完成这件事，请稍后再试。',
  },
  footerLocal: '',
  units: { seconds: (n) => `${n} 秒`, minutes: (n) => `${n} 分钟`, hours: (n) => `${n} 小时`, days: (n) => `${n} 天` },

  title: '安全与登录', lead: '',
  now: '本次登录', signedAs: '已登录为 {name}', local: '这台电脑', localText: '',
  signedOutTitle: '你已退出登录', signedOutText: '重新登录后，才能修改密码、查看已登录的设备。',
    startedAt: '{time} 登录', endsIn: '不使用的话 {span}后结束', endsAtMost: '最迟 {span}后结束', remembered: '保持登录',
  signOut: '退出登录', signOutAsk: '退出这台设备的登录？', signOutAsk2: '再回来需要用户名和密码。',
  sessions: '已登录的设备', sessionsEmpty: '没有其他登录。', thisDevice: '这台设备', lastSeen: '{time}使用过', lastSeenNow: '刚刚使用过',
  revoke: '退出', revokeAsk: '让这台设备退出登录？', revokeAll: '全部设备退出登录', revokeAllAsk: '让所有设备退出登录？', revokeAllText: '所有登录都会结束，包括这一个。你需要在这里重新登录。',
  revoked: '已退出。', revokedAll: '所有设备都已退出。', cancel: '取消', confirm2: '退出登录',
  password2: '密码', passwordText: '修改后，其他设备会全部退出登录。', change: '修改用户名和密码', resetTitle: '重置密码', resetText: '在这台电脑上不需要旧密码，所有设备都会退出登录。', resetUnsupported: '这台主机的版本还不能在这里重置密码，请用旧密码修改。', resetForbidden: '只有主机电脑上的 Panel 能在不知道旧密码时重置密码。', current: '当前密码', next: '新密码', repeat: '再输入一次新密码',
  save: '保存', changed: '已保存，其他设备已退出登录。', wrongCurrent: '当前密码不对。',
  unavailable: '这台主机还不能管理登录。', unavailableText: '需要更新的主机版本。',
  failed: '没能读取登录状态。', retry: '重试',
  never: '从未', ago: { now: '刚刚', minutes: (n) => `${n} 分钟前`, hours: (n) => `${n} 小时前`, days: (n) => `${n} 天前` },
}

const AUTH_BRAND = {
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
export const authTexts = (locale) => {
  const code = canonicalLocale(locale)
  if (code === 'zh') return ZH
  if (code === 'zh_TW') return { ...ZH, ...AUTH_BRAND.zh_TW }
  if (code === 'en' || code === 'en_GB' || code === 'en_US') return EN
  const extra = AUTH_BRAND[code]
  return extra ? { ...EN, ...extra } : EN
}

/** `{name}`-style fill-in. */
export const fill = (text, values = {}) => String(text).replace(/\{(\w+)\}/g, (_, k) => (values[k] === undefined ? `{${k}}` : String(values[k])))

/** `3 分钟前` for a moment in the past; the clock when it is older than three days. */
export function agoText(at, now, T) {
  if (!at) return T.never
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 45) return T.ago.now
  const m = Math.round(s / 60)
  if (m < 60) return T.ago.minutes(Math.max(1, m))
  const h = Math.round(m / 60)
  if (h < 48) return T.ago.hours(h)
  return T.ago.days(Math.round(h / 24))
}
