// The environment of the window as rows and as text for a report or a bug (versions, builds, channel, system, graphics, the WebView).

const USER_PATH = /([A-Za-z]:\\Users\\)[^\\\s"']+/g
export const scrubPaths = (text) => String(text ?? '').replace(USER_PATH, '$1«user»')

/** The labels of the details card in each language; the copied text keeps the stable English keys above (a report is read by people who do not read the interface language). */
export const ENV_LABELS = Object.freeze({
  zh_TW: { product: '產品', version: '版本', channel: '渠道', 'build panel': '面板建置', host: '主機', os: '系統', arch: '架構', gpu: '顯示卡', webview: 'WebView', display: '顯示', locale: '語言', 'user agent': '瀏覽器標識' },
  zh: { product: '产品', version: '版本', channel: '渠道', 'build panel': '面板构建', host: '主机', os: '系统', arch: '架构', gpu: '显卡', webview: 'WebView', display: '显示', locale: '语言', 'user agent': '浏览器标识' },
})
/** The rows as the card shows them: `labels` renames the keys (`build <name>` keeps its name), a key without a label is shown as it is. */
export function environmentDisplayRows(info = {}, labels = null) {
  return environmentRows(info).map(([key, value]) => {
    if (!labels) return [key, value]
    return [labels[key] || key, value]
  })
}

/**
 * The component table: every component the product knows with its version and short commit; one that is not installed says so. `info.components` is
 * [{ id, name, version, commit, installed }]; without it (a product that has no inventory) the builds are the rows.
 */
export function componentRows(info = {}) {
  const list = Array.isArray(info.components) ? info.components : []
  if (list.length) return list.filter((c) => c && c.name).map((c) => ({ id: c.id || c.name, name: c.name, version: c.installed === false ? '' : String(c.version || ''), commit: c.installed === false ? '' : String(c.commit || ''), installed: c.installed !== false }))
  return (info.builds || []).filter((b) => b.name && b.sha).map((b) => ({ id: b.name, name: b.name, version: '', commit: String(b.sha), installed: true }))
}

/** `info` is whatever the product knows: { product, version, channel, builds: [{ name, sha }], os, arch, gpu, webview, host, locale, display, userAgent }. Missing things are left out. */
export function environmentRows(info = {}) {
  const rows = []
  const add = (key, value) => { if (value !== undefined && value !== null && String(value) !== '') rows.push([key, scrubPaths(value)]) }
  add('product', info.product)
  add('version', info.version)
  add('channel', info.channel)
  for (const b of info.builds || []) add(`build ${b.name}`, b.sha)
  add('host', info.host)
  add('os', info.os)
  add('arch', info.arch)
  add('gpu', info.gpu)
  add('webview', info.webview)
  add('display', info.display)
  add('locale', info.locale)
  add('user agent', info.userAgent)
  return rows
}
export const environmentText = (info) => environmentRows(info).map(([k, v]) => `${k}: ${v}`).join('\n')
