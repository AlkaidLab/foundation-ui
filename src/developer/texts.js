// The words of 开发者选项. A row says what it is and what state it is in; nothing else. Chinese is the original, English a plain translation.
const ZH = {
  title: '开发者选项', on: '开', off: '关', yes: '是', no: '否', cancel: '取消', close: '关闭', copy: '复制', export: '导出', refresh: '刷新', copied: '已复制', read: '读取', turnOff: '关闭开发者模式',
  unavailable: '此环境不可用', needsRestart: '下次启动生效', nextChange: '下次缩放变化生效', pending: '读取中…', failed: '失败：{message}',
  groups: { debug: '调试与日志', render: '渲染与性能', window: '窗口与缩放', webview: 'WebView', data: '数据与状态', host: '主机', telemetry: '遥测', update: '更新' },
  debugOutput: '调试输出', logLevel: '日志级别', slowLog: '慢调用与停顿日志', slowLogCount: '{n} 条', environment: '环境信息', environmentCopy: '复制环境信息', environmentExport: '导出环境信息',
  hud: '帧率与帧耗时浮层', longTasks: '长任务标记', outlines: '布局边界', flashes: '重绘闪烁', flashesState: '改动的元素闪红框', mutations: 'DOM 变化计数', animScale: '动画速度',
  animScaleState: '{s}×（{r}）', animSlower: '更慢', animFaster: '更快', animNormal: '正常',
  cover: '缩放遮罩', coverModes: { off: '关闭', fixed: '固定', adaptive: '自适应', fast: '快速', warm: '预抓快照', snapshot: '即时快照' }, coldCloak: '冷启动隐身', simulateDpi: '模拟缩放变化',
  simulateDpiState: '当前 {dpi}%', simulateDpiBack: '回到系统', simulateConfirm: '窗口会按 {dpi}% 缩放一次，随后可以回到系统缩放。',
  devtoolsPanel: '打开面板 DevTools', devtoolsWeb: '打开 DevTools，查看 Web UI 框架', reload: '重新加载界面', clearCache: '清除 WebView 缓存', clearCacheConfirm: '清除 WebView 的 HTTP 缓存（不含面板设置和已保存的数据）。',
  clearPalette: '清除壁纸取色缓存', clearPaletteState: '{n} 张', resetOnboarding: '重置首次运行引导', resetOverview: '重置概览布局', resetAll: '重置全部面板设置',
  confirmTitle: '确认', resetOnboardingConfirm: '下次启动会再次显示首次运行引导。', resetOverviewConfirm: '概览的卡片布局回到默认。', resetAllConfirm: '面板的全部设置回到默认值，面板会重新加载。此操作不能撤销。', clearPaletteConfirm: '下次显示壁纸时重新取色。',
  api: 'API 检查器', apiState: '只读 · {path}', apiPath: '路径', apiRaw: '原始输出', apiHidden: '密码、令牌和证书内容已隐藏',
  reach: '重新检查可达性', reachState: '{state}', simulateHost: '模拟主机状态', simulateOffline: '主机离线', simulateStopped: '主机已停止', simulateUnresponsive: '主机无响应', simulateEnd: '结束模拟',
  telemetryPreview: '预览错误报告载荷', telemetryPreviewState: '已去除个人信息', telemetryTest: '发送测试事件', telemetryTestState: '遥测{state}', telemetryId: '安装 ID', telemetryQueueTitle: '待发送的报告', telemetryQueue: '{n} 条',
  telemetryConsentOff: '遥测未开启，不会发送', telemetrySent: '测试事件已发送',
  channel: '更新通道', channelStable: '稳定版', channelBeta: '预览版', checkUpdate: '立即检查更新', checkUpdateState: '当前 {version}', latest: '已是最新', updateAvailable: '有新版本 {version}',
  filterAll: '全部', kinds: { fetch: '请求', invoke: '命令', frame: '帧', timer: '定时器', stall: '停顿', cover: '遮罩', warm: '快照', guard: '守卫', cold: '启动' }, noRows: '没有记录',
  envTitle: '环境信息', hudNow: '{fps} fps', mutRate: '{n}/s',
}
const EN = {
  title: 'Developer options', on: 'On', off: 'Off', yes: 'Yes', no: 'No', cancel: 'Cancel', close: 'Close', copy: 'Copy', export: 'Export', refresh: 'Refresh', copied: 'Copied', read: 'Read', turnOff: 'Turn off developer mode',
  unavailable: 'Not available here', needsRestart: 'Takes effect at the next start', nextChange: 'Takes effect at the next scale change', pending: 'Reading…', failed: 'Failed: {message}',
  groups: { debug: 'Debug and log', render: 'Rendering and performance', window: 'Window and scale', webview: 'WebView', data: 'Data and state', host: 'Host', telemetry: 'Telemetry', update: 'Update' },
  debugOutput: 'Debug output', logLevel: 'Log level', slowLog: 'Slow calls and stalls log', slowLogCount: '{n} entries', environment: 'Environment', environmentCopy: 'Copy environment info', environmentExport: 'Export environment info',
  hud: 'Frame rate and frame time overlay', longTasks: 'Long task markers', outlines: 'Layout bounds', flashes: 'Repaint flashes', flashesState: 'Changed elements flash a red frame', mutations: 'DOM change counter', animScale: 'Animation speed',
  animScaleState: '{s}× ({r})', animSlower: 'slower', animFaster: 'faster', animNormal: 'normal',
  cover: 'Scale change cover', coverModes: { off: 'Off', fixed: 'Fixed', adaptive: 'Adaptive', fast: 'Fast', warm: 'Warm snapshot', snapshot: 'Instant snapshot' }, coldCloak: 'Cold start cloak', simulateDpi: 'Simulate a scale change',
  simulateDpiState: 'Now {dpi}%', simulateDpiBack: 'Back to the system', simulateConfirm: 'The window will take a {dpi}% scale once; it can go back to the system scale after.',
  devtoolsPanel: 'Open DevTools for the panel', devtoolsWeb: 'Open DevTools to inspect the Web UI frame', reload: 'Reload the interface', clearCache: 'Clear the WebView cache', clearCacheConfirm: 'Clears the HTTP cache of the WebView (not the settings or saved data of the panel).',
  clearPalette: 'Clear the wallpaper palette cache', clearPaletteState: '{n} pictures', resetOnboarding: 'Reset first-run onboarding', resetOverview: 'Reset the overview layout', resetAll: 'Reset all panel settings',
  confirmTitle: 'Confirm', resetOnboardingConfirm: 'The first-run guide shows again at the next start.', resetOverviewConfirm: 'The overview cards go back to the default layout.', resetAllConfirm: 'All panel settings go back to their defaults and the panel reloads. This cannot be undone.', clearPaletteConfirm: 'The palette is read again the next time a wallpaper is shown.',
  api: 'API inspector', apiState: 'Read only · {path}', apiPath: 'Path', apiRaw: 'Raw output', apiHidden: 'Fields that hold passwords, tokens or certificates are hidden',
  reach: 'Check reachability again', reachState: '{state}', simulateHost: 'Simulate a host state', simulateOffline: 'Host offline', simulateStopped: 'Host stopped', simulateUnresponsive: 'Host not responding', simulateEnd: 'End the simulation',
  telemetryPreview: 'Preview an error report payload', telemetryPreviewState: 'Personal data removed', telemetryTest: 'Send a test event', telemetryTestState: 'Telemetry {state}', telemetryId: 'Install ID', telemetryQueueTitle: 'Reports waiting', telemetryQueue: '{n}',
  telemetryConsentOff: 'Telemetry is off, nothing is sent', telemetrySent: 'Test event sent',
  channel: 'Update channel', channelStable: 'Stable', channelBeta: 'Preview', checkUpdate: 'Check for updates now', checkUpdateState: 'Now {version}', latest: 'Up to date', updateAvailable: 'New version {version}',
  filterAll: 'All', kinds: { fetch: 'Requests', invoke: 'Commands', frame: 'Frames', timer: 'Timers', stall: 'Stalls', cover: 'Cover', warm: 'Snapshot', guard: 'Guard', cold: 'Start' }, noRows: 'Nothing recorded',
  envTitle: 'Environment', hudNow: '{fps} fps', mutRate: '{n}/s',
}
import { canonicalLocale } from '../locale/texts/resolve.js'
import { DEVELOPER_LOCALES } from './locales.js'

const deep = (a, b) => {
  const o = { ...a }
  for (const k of Object.keys(b || {})) {
    const v = b[k]
    o[k] = v && typeof v === 'object' ? deep(a[k] || {}, v) : v
  }
  return o
}
export const developerTexts = (locale = 'en') => {
  const code = canonicalLocale(locale)
  if (code === 'zh') return { ...EN, ...ZH }
  if (code === 'en' || code === 'en_GB' || code === 'en_US') return EN
  const base = code === 'zh_TW' ? { ...EN, ...ZH } : EN
  const extra = DEVELOPER_LOCALES[code]
  return extra ? deep(base, extra) : base
}
export const fill = (text, values = {}) => String(text).replace(/\{(\w+)\}/g, (_, k) => (values[k] ?? ''))
