import { textTable } from '../locale/texts/index.js'
// The words of the announcement popups, the caption button, the 公告 page and developer mode. Chinese and English; any other language reads English.
const EN = {
  title: 'Announcements', button: 'Announcements', none: 'No announcements', open: 'Open', dismiss: 'Dismiss', read: 'Read', all: 'All announcements',
  popupGotIt: 'Got it', dontShow: 'Do not show this again until the announcement changes', popupLink: 'Open', acknowledge: 'I have read this', acknowledgeIn: 'I have read this ({n})', mustRead: 'Please read this first', scrollHint: 'Read to the end to confirm', secondsLeft: '', scrollAndWait: 'Scroll to the end to confirm', acknowledged: 'Acknowledged {time}',
  modes: { notice: 'Notice', modal: 'Popup', 'must-read': 'Must read' },
  categories: { announce: 'Announcements', update: 'Updates', guide: 'Guides' }, allCategories: 'All', back: 'Announcements', newOne: 'New', warning: 'Warning',
  dev: { title: 'Developer', entry: 'Local announcement source and debug options', on: 'Developer mode is on', off: 'Developer mode is off', taps: '{n} more taps turn on developer mode', turnOff: 'Turn off developer mode', source: 'Announcement source (a local address)', sourceHint: 'Plain http works for this computer only (localhost, 127.0.0.1). Empty: the real hosts.', apply: 'Use this source', reset: 'Use the real hosts', refresh: 'Fetch now', applied: 'Source saved', bad: 'Not a usable address' },
}
const ZH = {
  title: '公告', button: '公告', none: '暂无公告', open: '打开', dismiss: '忽略', read: '已读', all: '全部公告',
  popupGotIt: '知道了', dontShow: '下次公告更新前不再显示', popupLink: '打开', acknowledge: '我已阅读', acknowledgeIn: '我已阅读（{n}）', mustRead: '请先阅读', scrollHint: '读到最后即可确认', secondsLeft: '', scrollAndWait: '滚动到最后才能确认', acknowledged: '{time} 已确认',
  modes: { notice: '通知', modal: '弹窗', 'must-read': '必读' },
  categories: { announce: '公告', update: '更新', guide: '教程' }, allCategories: '全部', back: '公告', newOne: '新', warning: '警告',
  dev: { title: '开发者', entry: '本地公告来源和调试选项', on: '开发者模式已开启', off: '开发者模式已关闭', taps: '再点 {n} 次开启开发者模式', turnOff: '关闭开发者模式', source: '公告来源（本机地址）', sourceHint: '只有本机（localhost、127.0.0.1）可以用 http。留空：使用正式地址。', apply: '使用这个来源', reset: '使用正式地址', refresh: '立即获取', applied: '来源已保存', bad: '不是可用的地址' },
}
export const announcementTexts = (locale) => textTable('announcement', locale, EN, ZH)
