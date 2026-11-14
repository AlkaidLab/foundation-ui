const ZH = {
  barCount: (n) => `${n} 项未保存`,
  undoAll: '撤销全部',
  view: '查看更改',
  save: '保存',
  saveRestart: '保存并重启',
  cancel: '取消',
  saving: '正在保存…',
  title: (n) => `保存 ${n} 项更改`,
  invalidTitle: (n) => `${n} 项更改无效，无法保存`,
  fix: '去修改',
  changes: '更改',
  from: '原值',
  restart: 'Sunshine 会重启',
  sessions: (n) => `${n} 个正在进行的串流会中断`,
  riskTitle: { critical: '严重', high: '高', medium: '中' },
  undo: '撤销',
  go: '前往',
  close: '关闭',
  listTitle: '未保存的更改',
  empty: '默认',
  on: '开',
  off: '关',
  saved: (n) => `已保存 ${n} 项更改`,
  savedRestart: (n) => `已保存 ${n} 项更改，Sunshine 正在重启`,
  undone: '已撤销',
  failed: (e) => `保存失败：${e}`,
}
const EN = {
  barCount: (n) => `${n} unsaved`,
  undoAll: 'Undo all',
  view: 'View changes',
  save: 'Save',
  saveRestart: 'Save and restart',
  cancel: 'Cancel',
  saving: 'Saving…',
  title: (n) => (n === 1 ? 'Save 1 change' : `Save ${n} changes`),
  invalidTitle: (n) => (n === 1 ? '1 change is invalid and can not be saved' : `${n} changes are invalid and can not be saved`),
  fix: 'Fix',
  changes: 'Changes',
  from: 'Was',
  restart: 'Sunshine restarts',
  sessions: (n) => (n === 1 ? '1 running stream ends' : `${n} running streams end`),
  riskTitle: { critical: 'Critical', high: 'High', medium: 'Medium' },
  undo: 'Undo',
  go: 'Go to',
  close: 'Close',
  listTitle: 'Unsaved changes',
  empty: 'default',
  on: 'On',
  off: 'Off',
  saved: (n) => (n === 1 ? 'Saved 1 change' : `Saved ${n} changes`),
  savedRestart: (n) => (n === 1 ? 'Saved 1 change, Sunshine is restarting' : `Saved ${n} changes, Sunshine is restarting`),
  undone: 'Undone',
  failed: (e) => `Save failed: ${e}`,
}
export const pendingTexts = (locale) => (String(locale || '').startsWith('zh') ? ZH : EN)

/** A value of an entry as one short piece of text. */
export function valueText(value, T) {
  if (value === undefined || value === null || value === '') return T.empty
  if (typeof value === 'boolean') return value ? T.on : T.off
  if (value === 'enabled' || value === 'true') return T.on
  if (value === 'disabled' || value === 'false') return T.off
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return text.length > 36 ? `${text.slice(0, 35)}…` : text
}
