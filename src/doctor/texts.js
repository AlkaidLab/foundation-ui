// The words of the 体检 page in the two languages of the products. The checks' own titles, details, fixes and effects come from their
// source, in the language the page asks for (?lang=); these are only the page's frame.

import { textTable } from '../locale/texts/index.js'

const ZH = {
  title: '体检',
  start: '开始体检',
  again: '再查一次',
  progress: '正在检查 {done}/{total}',
  done: '用时 {s} 秒',
  groups: { service: 'Sunshine 服务', install: '安装', process: '进程与端口', drivers: '驱动', gpu: '显卡与驱动', encoder: '编码器', capture: '画面采集', vdd: '基地虚拟显示器', audio: '音频', input: '输入与手柄', network: '网络', system: '系统', host: '主机状态' },
  sources: { local: '本机', host: 'Sunshine' },
  sourceTip: { local: '控制面板自己检查，不需要 Sunshine 在运行', host: 'Sunshine 检查，需要它在运行' },
  states: { idle: '未开始', queued: '排队中', running: '检查中…', offline: 'Sunshine 没有应答，这一组没有检查' },
  offlineTitle: 'Sunshine 没有应答：{n} 组没有检查',
  offlineNext: '先让 Sunshine 运行起来（原因看「Sunshine 服务」和「进程与端口」），再查一次。',
  hostOffline: 'Sunshine 没有运行：只有本机检查有结果',
  sections: { local: '本机检查', host: 'Sunshine 检查' },
  plan: { title: '{n} 组检查', text: '本机 {local} 组由控制面板自己查，Sunshine 没有运行也能查；其余 {host} 组由 Sunshine 查。', textOffline: 'Sunshine 没有运行：只能查本机 {local} 组。' },
  what: {
    service: '运行状态、启动方式、上次退出码', install: '安装目录、版本与构建', process: '端口占用、日志末尾的错误', drivers: '基地虚拟显示器、ViGEmBus、虚拟鼠标、USB/IP',
    gpu: '显卡型号、驱动版本、编码用哪块显卡', encoder: 'NVENC、AMF、QSV、Vulkan、软件编码', capture: '试采集一帧', vdd: '驱动、HDR、刷新率',
    audio: '输出设备、虚拟声卡、麦克风', input: 'ViGEmBus、DualSense、USB 转发', network: '端口、防火墙、UPnP、公网、组网',
    system: '磁盘空间、时间同步、运行账户、待重启', host: '版本、运行时间、崩溃记录、配置错误',
  },
  last: { title: '上次体检 {ago}', empty: '上次体检没有得到任何结果', ago: { now: '刚刚', min: '{n} 分钟前', hour: '{n} 小时前', day: '{n} 天前' } },
  checkedAt: '检查于 {at}（{ago}）',
  none: { title: '没有得到任何检查结果', text: '{n} 组都没有回答，所以现在还不能说这台电脑正常或不正常。', reason: '最先的原因：{why}' },
  failure: { why: '为什么', next: '怎么办', detail: '收到的内容', http: '状态码 {status}', hit: '涉及 {n} 组：{names}' },
  status: { pass: '正常', warn: '提醒', fail: '问题', skip: '未检查' },
  counts: { fail: '{n} 个问题', warn: '{n} 个提醒', skip: '{n} 项未检查', pass: '{n} 项正常', silent: '{n} 组没有结果' },
  allGood: '全部正常',
  errors: {
    unsupported: { why: '这个版本没有这项检查', next: '把 Sunshine（或控制面板）更新到新版后重查。' },
    auth: { why: '登录已过期，Sunshine 拒绝了请求', next: '重新登录后重查。' },
    invalid: { why: '收到的内容不是体检结果，连到的可能不是 Sunshine 主机', next: '重查一次；还是这样，导出报告并反馈，附上这里显示的内容。' },
    failed: { why: '检查出错，没有结果', next: '重查一次；还是失败，导出报告并反馈，附上这里显示的内容。' },
  },
  stream: {
    live: '正在串流：{n} 项无法检查，不算正常也不算问题',
    label: { skipped: '串流中未检查', disturbed: '串流中不可靠', routed: '串流中不可靠' },
    why: {
      skipped: '正在串流，探测会占用显卡、打断画面，所以这一项没有检查。串流结束后再查。',
      disturbed: '这一项是在串流进行时测的，结果可能受串流影响，不能当作正常或问题。串流结束后再查。',
      routed: '串流时 Sunshine 自己接管声音的输出，现在读到的设备不是平时的，不能判断。串流结束后再查。',
    },
    read: '读到：{detail}',
  },
  rerunGroup: '重查这一组',
  export: '导出报告',
  ai: '交给米塔 AI 分析',
  fix: { setting: '打开设置', page: '前往「{page}」', rerun: '重新检查', restart: '重启 Sunshine', link: '查看说明', repair: '修复', start: '启动 Sunshine' },
  pages: { network: '网络', audio: '音频', display: '显示', vdd: '基地虚拟显示器', components: '组件状态', logs: '日志与诊断', config: '配置文件', update: '关于与更新' },
  confirm: { title: '{label}？', titleOf: '{label}「{item}」？', will: '会做什么', admin: '需要管理员权限：Windows 会弹出确认。', live: '正在串流：执行后串流会断开。如果你正通过这个串流远程操作，连接会断掉，可能要回到这台电脑前才能继续。', run: '执行', cancel: '取消' },
  fixAt: '在「{group}」的「{item}」里修复；修一次，这里也会好。',
  repairFailed: '没有完成：{error}',
  repairDone: '已完成，正在重新检查',
  aiPrompt: '下面是 Foundation Sunshine 的体检结果（本机检查和 Sunshine 检查）。请找出问题的原因，按先后给出修复步骤。',
  aiOffline: '没有应答',
}

const EN = {
  title: 'Health check',
  start: 'Start health check',
  again: 'Check again',
  progress: 'Checking {done}/{total}',
  done: 'Took {s} s',
  groups: { service: 'Sunshine service', install: 'Installation', process: 'Processes and ports', drivers: 'Drivers', gpu: 'Graphics and driver', encoder: 'Encoders', capture: 'Screen capture', vdd: 'Foundation Virtual Display', audio: 'Audio', input: 'Input and gamepads', network: 'Network', system: 'System', host: 'Host status' },
  sources: { local: 'This PC', host: 'Sunshine' },
  sourceTip: { local: 'Checked by the control panel; Sunshine does not need to run', host: 'Checked by Sunshine; it has to be running' },
  states: { idle: 'Not started', queued: 'Queued', running: 'Checking…', offline: 'Sunshine did not answer, so this group was not checked' },
  offlineTitle: 'Sunshine did not answer: {n} groups not checked',
  offlineNext: 'Get Sunshine running first (Sunshine service and Processes and ports say why not), then check again.',
  hostOffline: 'Sunshine is not running: only the checks of this PC have results',
  sections: { local: 'Checks of this PC', host: 'Checks by Sunshine' },
  plan: { title: '{n} groups', text: '{local} groups are checked by the control panel itself and work while Sunshine is stopped; the other {host} are checked by Sunshine.', textOffline: 'Sunshine is not running: only the {local} groups of this PC can be checked.' },
  what: {
    service: 'State, start type, last exit code', install: 'Install folder, version and build', process: 'Ports in use, errors at the end of the log', drivers: 'Foundation Virtual Display, ViGEmBus, virtual mouse, USB/IP',
    gpu: 'Graphics cards, driver versions, which card encodes', encoder: 'NVENC, AMF, QSV, Vulkan, software', capture: 'One test frame', vdd: 'Driver, HDR, refresh rate',
    audio: 'Output device, virtual sound card, microphone', input: 'ViGEmBus, DualSense, USB forwarding', network: 'Ports, firewall, UPnP, internet, mesh',
    system: 'Disk space, time sync, account, pending restart', host: 'Version, uptime, crashes, configuration errors',
  },
  last: { title: 'Last check {ago}', empty: 'Last check got no result at all', ago: { now: 'just now', min: '{n} min ago', hour: '{n} h ago', day: '{n} d ago' } },
  checkedAt: 'Checked {at} ({ago})',
  none: { title: 'No check gave a result', text: 'None of the {n} groups answered, so this PC cannot be called fine or broken yet.', reason: 'First reason: {why}' },
  failure: { why: 'Why', next: 'What to do', detail: 'What was received', http: 'status {status}', hit: '{n} groups: {names}' },
  status: { pass: 'OK', warn: 'Warning', fail: 'Problem', skip: 'Not checked' },
  counts: { fail: '{n} problems', warn: '{n} warnings', skip: '{n} not checked', pass: '{n} OK', silent: '{n} groups without a result' },
  allGood: 'All OK',
  errors: {
    unsupported: { why: 'This version has no such check', next: 'Update Sunshine (or the control panel), then check again.' },
    auth: { why: 'Signed out: Sunshine refused the request', next: 'Sign in again, then check again.' },
    invalid: { why: 'What was received is not a health check result; it may not be a Sunshine host', next: 'Check again; if it stays like this, export the report and send feedback with what is shown here.' },
    failed: { why: 'The check failed and gave no result', next: 'Check again; if it fails again, export the report and send feedback with what is shown here.' },
  },
  stream: {
    live: 'A stream is running: {n} checks cannot be made and count as neither OK nor a problem',
    label: { skipped: 'Not checked while streaming', disturbed: 'Unreliable while streaming', routed: 'Unreliable while streaming' },
    why: {
      skipped: 'A stream is running and a probe would take the GPU and disturb the picture, so this was not checked. Check again when the stream has ended.',
      disturbed: 'This was measured while a stream was running and may be the stream\'s answer, so it counts as neither OK nor a problem. Check again when the stream has ended.',
      routed: 'While it streams Sunshine takes over the sound output itself, so the device read now is not the one of an idle PC and cannot be judged. Check again when the stream has ended.',
    },
    read: 'Read: {detail}',
  },
  rerunGroup: 'Check this group again',
  export: 'Export report',
  ai: 'Ask 米塔 AI',
  fix: { setting: 'Open setting', page: 'Open {page}', rerun: 'Check again', restart: 'Restart Sunshine', link: 'Read how', repair: 'Repair', start: 'Start Sunshine' },
  pages: { network: 'Network', audio: 'Audio', display: 'Display', vdd: 'Foundation Virtual Display', components: 'Components', logs: 'Logs and diagnostics', config: 'Configuration files', update: 'About and updates' },
  confirm: { title: '{label}?', titleOf: '{label} {item}?', will: 'What it does', admin: 'Needs administrator rights: Windows asks to confirm.', live: 'A stream is live: it ends when this runs. If you are controlling this PC through that stream, you lose the connection and may have to come back to this PC.', run: 'Run', cancel: 'Cancel' },
  fixAt: 'Repair it under {group} › {item}; one repair fixes it here too.',
  repairFailed: 'Not done: {error}',
  repairDone: 'Done; checking again',
  aiPrompt: 'Here is the health check of a Foundation Sunshine host (the checks of this PC and of Sunshine). Find the causes of the problems and give the fixes in order.',
  aiOffline: 'not answering',
}

export const doctorTexts = (locale = 'en', overrides = null) => {
  const base = textTable('doctor', locale, EN, ZH)
  return overrides ? { ...base, ...overrides } : base
}

const fill = (text, values) => String(text).replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '')

/** The button label and icon of a fix action; `canRepair(action)` says whether this product can run a repair. */
export function fixButton(action, T, { canRepair = () => false } = {}) {
  if (!action) return null
  if (action.kind === 'open') {
    if (action.target.startsWith('setting:')) return { label: T.fix.setting, icon: 'tune' }
    const page = action.target.replace(/^page:/, '')
    return { label: T.pages[page] ? fill(T.fix.page, { page: T.pages[page] }) : fill(T.fix.page, { page: '' }).replace(/「」|\s+$/g, ''), icon: 'arrow_forward' }
  }
  if (action.kind === 'rerun') return { label: T.fix.rerun, icon: 'refresh' }
  if (action.kind === 'restart') return { label: T.fix.restart, icon: 'restart_alt' }
  if (action.kind === 'link') return { label: T.fix.link, icon: 'open_in_new' }
  if (action.kind === 'repair' && canRepair(action)) return action.target === 'service:start' ? { label: T.fix.start, icon: 'play_arrow' } : { label: T.fix.repair, icon: 'build' }
  return null
}

export { fill as fillDoctorText }

/** "3 hours ago" in the words of the page: a time stamp (ms) against now. */
export function doctorAgo(at, T, now = Date.now()) {
  const min = Math.max(0, Math.round((now - at) / 60000))
  const a = T.last.ago
  if (min < 1) return a.now
  if (min < 60) return fill(a.min, { n: min })
  if (min < 1440) return fill(a.hour, { n: Math.round(min / 60) })
  return fill(a.day, { n: Math.round(min / 1440) })
}

/** The clock time of a result: the time of day for today, the date and the time for another day (the local time of the machine that shows it). */
export function doctorClock(at, now = Date.now()) {
  const d = new Date(at), n = new Date(now)
  const two = (v) => String(v).padStart(2, '0')
  const time = `${two(d.getHours())}:${two(d.getMinutes())}`
  return d.toDateString() === n.toDateString() ? time : `${two(d.getMonth() + 1)}-${two(d.getDate())} ${time}`
}
