// The update sheet's state model: phases, the shape of each phase, the step list and the texts. Pure, no DOM.

export const UPDATE_PHASES = Object.freeze(['checking', 'available', 'downloading', 'ready', 'installing', 'latest', 'error'])

// One shape per phase; every shape has the same number of points, so the badge morphs from one to the next.
const SHAPES = Object.freeze({
  checking: 'sunny',
  available: 'cookie',
  downloading: 'clover',
  ready: 'burst',
  installing: 'gem',
  latest: 'circle',
  error: 'squircle',
})
const ICONS = Object.freeze({
  checking: 'refresh',
  available: 'system_update_alt',
  downloading: 'download',
  ready: 'restart_alt',
  installing: 'sync',
  latest: 'check_circle',
  error: 'error',
})
const TONES = Object.freeze({
  checking: 'neutral',
  available: 'primary',
  downloading: 'primary',
  ready: 'tertiary',
  installing: 'tertiary',
  latest: 'ok',
  error: 'error',
})

export const phaseShape = (phase) => ({
  shape: SHAPES[phase] || SHAPES.available,
  icon: ICONS[phase] || ICONS.available,
  tone: TONES[phase] || TONES.available,
})

const INSTALL_RANK = Object.freeze({ preparing: 0, 'building-command': 0, 'launching-installer': 0, 'installer-started': 0, 'app-exiting': 1 })

/**
 * The three steps with a status each: download, install, restart.
 * `installStage` is the stage name of the panel's `install-progress` event; `failedStep` names the step an error stopped at.
 * @returns {Array<{ key: 'download'|'install'|'restart', status: 'pending'|'active'|'done'|'failed' }>}
 */
export const stepsFor = (phase, { installStage = '', failedStep = '' } = {}) => {
  const keys = ['download', 'install', 'restart']
  let active = -1
  let done = 0
  if (phase === 'downloading') active = 0
  else if (phase === 'ready') done = 1
  else if (phase === 'installing') {
    const rank = INSTALL_RANK[installStage]
    done = 1 + (rank === 1 ? 1 : 0)
    active = rank === 1 ? 2 : 1
  }
  let failed = -1
  if (phase === 'error') {
    failed = Math.max(0, keys.indexOf(failedStep))
    done = failed
  }
  if (phase === 'installing' && installStage === 'failed') {
    failed = 1
    active = -1
    done = 1
  }
  return keys.map((key, index) => ({
    key,
    status: index === failed ? 'failed' : index < done ? 'done' : index === active ? 'active' : 'pending',
  }))
}

export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export const formatText = (template, values = {}) =>
  String(template ?? '').replace(/\{(\w+)\}/g, (all, key) => (values[key] == null ? all : String(values[key])))

const EN = Object.freeze({
  titleChecking: 'Checking for updates',
  titleAvailable: 'Update available',
  titleDownloading: 'Downloading the update',
  titleReady: 'Ready to install',
  titleInstalling: 'Installing',
  titleLatest: 'You are up to date',
  titleError: 'The update stopped',
  checkFailed: 'Could not reach the release servers. Try again in a moment.',
  current: 'Current',
  next: 'New',
  channelStable: 'Stable',
  channelPrerelease: 'Pre-release',
  driverCaution: 'Driver notice in the release notes',
  driverUpdate: 'Driver update in the release notes',
  driverMention: 'The release notes mention drivers',
  componentMention: 'The release notes mention components',
  driverFrom: 'Quoted from the release notes of this version.',
  notesTitle: 'What is new',
  notesEmpty: 'This release has no notes.',
  more: 'Show more',
  less: 'Show less',
  moreLines: '{count} more lines',
  fullNotes: 'Full notes on the release page',
  stepDownload: 'Download',
  stepInstall: 'Install',
  stepRestart: 'Restart',
  stepDownloadHint: 'From {source}, checked against the published SHA-256',
  stepDownloadHintPlain: 'Checked against the published SHA-256',
  stepInstallHint: 'Sunshine stops, the installer runs',
  stepRestartHint: 'The panel opens again with the result',
  phaseConnecting: 'Connecting to a download source',
  phaseRetrying: 'Download failed, trying another source',
  phaseVerifying: 'Verifying the file',
  phaseComplete: 'Download complete',
  background: 'Continue in the background',
  backgroundHint: 'The download keeps going after this closes; the tray tooltip and the panel show its progress.',
  progress: '{percent}%',
  sizeOf: '{done} of {total}',
  source: 'Source {source}',
  mirrorChip: 'Info from the mirror',
  mirrorMetadata: 'Release information came from the mirror ({host}).',
  installWarning: 'Installing closes Sunshine and this panel, then opens the panel again. Streams in progress end.',
  installLong: 'Still working in the background. Please do not start the installer again.',
  linkOnly: 'This page cannot install updates by itself. The button opens the release page.',
  linkViaPanel: 'The Control Panel downloads and installs the update.',
  updateNow: 'Update now',
  download: 'Open download page',
  later: 'Later',
  skip: 'Skip this version',
  restartNow: 'Install and restart',
  retry: 'Try again',
  close: 'Close',
  openRelease: 'Release page',
  fullChangelog: 'Full changelog',
  working: 'Working…',
  checkingHint: 'Asking the release servers…',
  latestHint: 'Version {version} is the newest one.',
})

const ZH = Object.freeze({
  titleChecking: '正在检查更新',
  titleAvailable: '发现新版本',
  titleDownloading: '正在下载更新',
  titleReady: '可以安装了',
  titleInstalling: '正在安装',
  titleLatest: '已是最新版本',
  titleError: '更新中断了',
  checkFailed: '无法连接发布服务器，请稍后再试。',
  current: '当前',
  next: '新版本',
  channelStable: '稳定版',
  channelPrerelease: '预发布',
  driverCaution: '更新说明里有驱动提示',
  driverUpdate: '更新说明里有驱动更新',
  driverMention: '更新说明提到了驱动',
  componentMention: '更新说明提到了组件',
  driverFrom: '摘自此版本的更新说明。',
  notesTitle: '更新内容',
  notesEmpty: '这个版本没有更新说明。',
  more: '展开',
  less: '收起',
  moreLines: '还有 {count} 行',
  fullNotes: '在发布页查看完整说明',
  stepDownload: '下载',
  stepInstall: '安装',
  stepRestart: '重启',
  stepDownloadHint: '来源 {source}，并用发布的 SHA-256 校验',
  stepDownloadHintPlain: '并用发布的 SHA-256 校验',
  stepInstallHint: '先停止 Sunshine，再运行安装程序',
  stepRestartHint: '面板会重新打开并显示结果',
  phaseConnecting: '正在连接下载源',
  phaseRetrying: '下载失败，正在尝试备用源',
  phaseVerifying: '正在校验文件',
  phaseComplete: '下载完成',
  background: '转到后台下载',
  backgroundHint: '关闭此页后下载会继续，托盘提示和面板顶部的标记会显示进度。',
  progress: '{percent}%',
  sizeOf: '{done} / {total}',
  source: '来源 {source}',
  mirrorChip: '版本信息来自镜像',
  mirrorMetadata: '版本信息来自镜像（{host}）。',
  installWarning: '安装会关闭 Sunshine 和本面板，完成后自动重新打开面板。正在进行的串流会结束。',
  installLong: '仍在后台进行，请不要重复启动安装程序。',
  linkOnly: '此页面无法自行安装更新，按钮会打开发布页。',
  linkViaPanel: '由控制面板下载并安装更新。',
  updateNow: '立即更新',
  download: '打开下载页',
  later: '稍后',
  skip: '跳过此版本',
  restartNow: '安装并重启',
  retry: '重试',
  close: '关闭',
  openRelease: '发布页',
  fullChangelog: '完整更新日志',
  working: '处理中…',
  checkingHint: '正在询问发布服务器…',
  latestHint: '版本 {version} 就是最新的。',
})

const TABLES = { en: EN, zh: ZH }

/** Texts for a locale ("zh-CN", "en", "de"…): Chinese has its own table, every other language falls back to English. */
export const updateTexts = (locale = 'en', overrides = {}) => {
  const language = typeof locale === 'string' ? locale.trim().toLowerCase().split(/[-_]/)[0] : ''
  return { ...(TABLES[language] || EN), ...(overrides && typeof overrides === 'object' ? overrides : {}) }
}
