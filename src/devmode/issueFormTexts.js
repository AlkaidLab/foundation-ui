// The words of the Issue Form view (MIssueForm). Chinese is the original, English a plain translation; any other language reads English. Kept apart from locales.js: this page is the only reader.
const ZH = {
  raw: '原文', rawBack: '表单视图', rawTip: '显示 Issue 的 Markdown 原文',
  env: '环境', diag: '诊断信息', fingerprint: '指纹', release: '版本', attachments: '附件', contact: '联系方式',
  lines: '{n} 行', expand: '展开', collapse: '收起', copy: '复制', copied: '已复制',
  viewerTitle: '图片', viewerClose: '关闭', viewerPrev: '上一张', viewerNext: '下一张', viewerOf: '{n} / {m}', imageFailed: '图片无法加载', imageAlt: '附图 {n}',
  updatedAt: '更新于 {when}', sectionEmpty: '没有内容',
  blocks: { Error: '错误', Environment: '环境', Log: '日志' },
  formKind: '类型', formBug: '问题', formFeature: '建议',
}
const EN = {
  raw: 'Source', rawBack: 'Form view', rawTip: 'Show the Markdown source of the issue',
  env: 'Environment', diag: 'Diagnostics', fingerprint: 'Fingerprint', release: 'Release', attachments: 'Attachments', contact: 'Contact',
  lines: '{n} lines', expand: 'Expand', collapse: 'Collapse', copy: 'Copy', copied: 'Copied',
  viewerTitle: 'Image', viewerClose: 'Close', viewerPrev: 'Previous', viewerNext: 'Next', viewerOf: '{n} / {m}', imageFailed: 'The image could not be loaded', imageAlt: 'Attachment {n}',
  updatedAt: 'Updated {when}', sectionEmpty: 'Empty',
  blocks: { Error: 'Error', Environment: 'Environment', Log: 'Log' },
  formKind: 'Type', formBug: 'Problem', formFeature: 'Suggestion',
}
export const issueFormTexts = (locale = 'en') => (/^zh/i.test(String(locale)) ? { ...EN, ...ZH } : EN)
