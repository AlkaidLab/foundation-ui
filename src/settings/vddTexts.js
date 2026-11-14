import { textTable } from '../locale/texts/index.js'
// Texts of the virtual display control (Chinese and English; any other interface language reads the English ones).
const EN = {
  title: 'Foundation Virtual Display',
  modes: { physical: 'Physical display', ondemand: 'Virtual · on demand', persistent: 'Virtual · always on' },
  modeText: {
    ondemand: 'A virtual display is made when a stream starts and removed when it ends.',
    persistent: 'A virtual display stays after the stream, ready for the next one.',
  },
  active: 'Foundation Virtual Display exists now', inactive: 'No Foundation Virtual Display right now',
  driverMissing: 'The Foundation Virtual Display driver is not ready', driverReady: 'Driver ready',
  display: 'Display to stream', displayAuto: 'Detect automatically',
  shared: 'One display for all clients', sharedText: 'Switching clients is faster, but each client no longer keeps its own screen scaling.',
  headless: 'Make one when the host has no display', headlessText: 'Foundation Virtual Display is created at once when no display is attached.',
  prep: 'Physical displays during a stream',
  preps: { no_operation: 'No change', ensure_active: 'Activate this display', ensure_primary: 'Set as main display', ensure_only_display: 'Use only this display', ensure_secondary: 'Extend displays' },
  resolution: 'Resolution', refresh: 'Refresh rate',
  rules: { automatic: 'As the client asks', manual: 'Fixed value', no_operation: 'Ignore the client' },
  manualResolution: 'Resolution (for example 2560x1440)', manualRefresh: 'Refresh rate (for example 59.95)',
  follow: 'Follow host resolution changes during the stream',
  advanced: 'Advanced', more: 'More options',
  trayMode: 'Always on is set from the control panel or the tray; here it can only be shown.',
  trayOnly: 'This option is saved by the control panel or the tray; a browser can show it but not change it.',
  saveFailed: 'Could not save: {error}', busy: 'Saving…',
  cardLine: { physical: 'Streams the physical display', ondemand: 'Made for each stream', persistent: 'Always on' },
}
const ZH = {
  title: '基地虚拟显示器',
  modes: { physical: '物理显示器', ondemand: '虚拟 · 按需', persistent: '虚拟 · 常驻' },
  modeText: {
    ondemand: '开始串流时创建基地虚拟显示器，结束后移除。',
    persistent: '串流结束后仍保留基地虚拟显示器，下次直接使用。',
  },
  active: '基地虚拟显示器已创建', inactive: '当前没有基地虚拟显示器',
  driverMissing: '基地虚拟显示器驱动尚未就绪', driverReady: '驱动就绪',
  display: '串流的显示器', displayAuto: '自动检测',
  shared: '所有客户端共用一个显示器', sharedText: '切换客户端更快，但各客户端不再分别记住屏幕缩放。',
  headless: '主机没有显示器时自动创建', headlessText: '没有接入任何显示器时，立即创建基地虚拟显示器。',
  prep: '串流时的物理显示器',
  preps: { no_operation: '不更改', ensure_active: '激活此显示器', ensure_primary: '设为主显示器', ensure_only_display: '仅使用此显示器', ensure_secondary: '扩展显示器' },
  resolution: '分辨率', refresh: '刷新率',
  rules: { automatic: '按客户端要求', manual: '固定值', no_operation: '忽略客户端要求' },
  manualResolution: '分辨率（例如 2560x1440）', manualRefresh: '刷新率（例如 59.95）',
  follow: '串流中跟随主机分辨率变化',
  advanced: '高级', more: '更多选项',
  trayMode: '“常驻”由控制面板或托盘设置，此处仅可查看。',
  trayOnly: '此项由控制面板或托盘保存；在浏览器中仅可查看。',
  saveFailed: '保存失败：{error}', busy: '正在保存…',
  cardLine: { physical: '串流物理显示器', ondemand: '每次串流创建', persistent: '常驻' },
}
export const vddTexts = (locale) => textTable('vdd', locale, EN, ZH)
export const VDD_TEXTS = Object.freeze({ en: EN, zh: ZH })
