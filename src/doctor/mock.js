// A health check answer that mixes every status, worded the way the host words it: for the gallery, the tests, the QA robot and the
// harness. `mockDoctorRequest` answers /api/doctor?only=<group> from it after a delay per group, so the page's progress can be seen.

const item = (id, status, title, detail = '', fix = '', action = null) => ({ id, group: id.split('.')[0], status, title, detail, fix: action ? { text: fix, action } : { text: fix } })

const GROUPS = [
  ['gpu', '显卡与驱动', [
    item('gpu.driver.0', 'warn', 'NVIDIA GeForce RTX 4070', '驱动 516.94，NVENC SDK 11.0；AV1 需要 522.25 或更新', '要用 AV1，把 NVIDIA 驱动更新到 522.25 或更新。', { kind: 'link', target: 'https://www.nvidia.com/Download/index.aspx', confirm: false }),
    item('gpu.driver.1', 'pass', 'Intel(R) UHD Graphics 770', '驱动 31.0.101.4502；主机没有 Intel 最低驱动表，以编码器探测为准'),
    item('gpu.hybrid', 'warn', '混合显卡，没有指定编码显卡', '核显和独显同时存在；不指定时由显示器所在的显卡编码，通常是核显。', '在「适配器名称」里选择独立显卡。', { kind: 'open', target: 'setting:adapter_name', confirm: false }),
  ]],
  ['encoder', '编码器', [
    item('encoder.nvenc', 'pass', 'NVENC', 'H.264 ✓ · HEVC ✓ HDR 4:4:4 · AV1 ✗ · 正在使用'),
    item('encoder.vulkan', 'pass', 'Vulkan', '本机不可用：这块显卡不支持'),
    item('encoder.quicksync', 'pass', 'Intel QSV', 'H.264 ✓ · HEVC ✓ HDR · AV1 ✓ HDR'),
    item('encoder.amdvce', 'pass', 'AMD AMF', '本机不可用：这块显卡不支持'),
    item('encoder.software', 'skip', 'Software (x264/x265/SVT-AV1)', '未检查：另一次探测占着显卡超过 12 秒', '没有串流时重新检查。', { kind: 'rerun', target: 'encoder', confirm: false }),
  ]],
  ['capture', '画面采集', [
    item('capture.test', 'pass', '试采集 (ddx)', '\\\\.\\DISPLAY1 · 2560×1440 · 首帧 38 ms · 未保存画面'),
  ]],
  ['vdd', '基地虚拟显示器', [
    item('vdd.driver', 'warn', '基地虚拟显示器驱动', '已安装；需要重启 Windows 才能启用（代码 14） · 1.0.4.0', '重启 Windows。'),
    item('vdd.hdr', 'pass', '基地虚拟显示器 HDR', '可用（Windows 版本号 22631）'),
    item('vdd.refresh', 'skip', '刷新率', '未检查：驱动只为已创建的显示器报告模式'),
  ]],
  ['audio', '音频', [
    item('audio.sink', 'fail', '音频输出', '"耳机 (USB Audio)" 不存在', '在「音频输出设备」里选一个存在的设备。', { kind: 'open', target: 'setting:audio_sink', confirm: false }),
    item('audio.virtual', 'pass', '虚拟音频设备', 'Speakers (Steam Streaming Speakers)'),
    item('audio.mic', 'skip', '麦克风', '未检查：麦克风重定向未开启'),
  ]],
  ['input', '输入与手柄', [
    item('input.vigem', 'fail', 'ViGEmBus', '未安装或没有运行 (bus not found)', '重新安装 ViGEmBus，或关闭手柄。', { kind: 'repair', target: 'driver:vigem', confirm: true, level: 3, effect: '用随产品附带的安装包（已校验 SHA256）重新安装 ViGEmBus 1.22。DS4Windows 等也用它的软件会短暂失去手柄，可能需要重启电脑。' }),
    item('input.ds5', 'pass', 'DualSense 驱动路径', '找到 usbip-win2 · usbip2_ude'),
    item('input.usb', 'pass', 'USB 转发', 'usbip-win2 就绪'),
  ]],
  ['network', '网络', [
    item('network.ports', 'fail', '端口', '没有监听：tcp 47990 (web)', '端口可能被别的程序占用；改「端口」或关掉那个程序，然后重启 Sunshine。', { kind: 'restart', target: 'sunshine', confirm: true, level: 2, effect: '重启 Sunshine 服务，大约 10 秒后回来；正在进行的串流会断开，配置不变。' }),
    item('network.firewall', 'pass', '防火墙', '已放行 Sunshine'),
    item('network.upnp', 'skip', 'UPnP', '未检查：UPnP 未开启', '需要路由器自动开端口时打开 UPnP。', { kind: 'open', target: 'setting:upnp', confirm: false }),
    item('network.public', 'warn', '公网', '连不上：路由器的外网地址是运营商级 NAT', '使用组网（Tailscale、ZeroTier…）或转发端口。', { kind: 'open', target: 'page:network', confirm: false }),
    item('network.mesh', 'pass', '组网', '已验证'),
    item('network.lan', 'pass', '局域网', '在 所有地址 上监听'),
  ]],
  ['system', '系统', [
    item('system.disk.logs', 'pass', '日志所在磁盘空间', '182 GB 可用 / 共 931 GB · C:\\Program Files\\Sunshine\\config'),
    item('system.disk.config', 'pass', '配置所在磁盘空间', '182 GB 可用 / 共 931 GB · C:\\Program Files\\Sunshine\\config'),
    item('system.time', 'pass', '时间同步', 'NTP time.windows.com,0x9 · W32Time stopped (trigger start)'),
    item('system.account', 'pass', '运行账户', 'LocalSystem（服务）'),
    item('system.reboot', 'warn', '待重启', 'Windows 更新', '重启电脑；之前装的驱动可能还没生效。'),
    item('system.os', 'pass', '操作系统', 'Windows 11 专业版 23H2 · 版本号 22631'),
  ]],
  ['host', '主机状态', [
    item('host.version', 'pass', 'Sunshine 版本', '2026.1104.121813 · 正式版或本地构建'),
    item('host.uptime', 'pass', '已运行', '2 天 3 小时 14 分钟'),
    item('host.crashes', 'warn', '最近的崩溃', '1 次（7 天内），最近一次 3 小时前', '导出带崩溃记录的诊断包并反馈。', { kind: 'open', target: 'page:logs', confirm: false }),
    item('host.config', 'warn', '启动时的配置', 'Unrecognized configurable option [encodr]', '在配置文件里改正或删除这些项。', { kind: 'open', target: 'page:config', confirm: false }),
    item('host.log', 'pass', '日志里的致命错误', '本次启动以来没有'),
  ]],
]

const worst = (items) => (items.some((i) => i.status === 'fail') ? 'fail' : items.some((i) => i.status === 'warn') ? 'warn' : items.some((i) => i.status === 'pass') ? 'pass' : 'skip')

/** The whole answer, as GET /api/doctor would give it. */
export const MOCK_DOCTOR = Object.freeze({
  version: 1,
  checked_at: '2026-11-04T08:00:00Z',
  elapsed_ms: 9400,
  summary: { pass: 0, warn: 0, fail: 0, skip: 0 },
  groups: GROUPS.map(([id, title, items]) => ({ id, title, status: worst(items), elapsed_ms: 0, timed_out: false, items: items.map((i) => i.id) })),
  items: GROUPS.flatMap(([, , items]) => items),
})

// The panel's own checks (doctor_local), worded the way it words them
const LOCAL = [
  ['service', 'Sunshine 服务', [
    item('service.state', 'pass', '运行状态', '服务 RUNNING · sunshine.exe PID 8124 · 主机有应答'),
    item('service.start_type', 'warn', '启动方式', '手动启动：电脑重启后没人登录时远程连不上', '把启动方式设为“开机自动”。', { kind: 'repair', target: 'service:start_type', confirm: true, level: 3, effect: '把 SunshineService 的启动方式改为“自动”。' }),
    item('service.last_exit', 'pass', '上次退出', '退出码 0'),
    item('service.recovery', 'skip', '失败后自动重启', '未检查：恢复策略的读取等服务工作合入'),
  ]],
  ['install', '安装', [
    item('install.dir', 'pass', '安装目录', 'C:\\Program Files\\Sunshine · sunshine.exe 存在'),
    item('install.version', 'pass', '版本与构建', '2026.1104.121813 · 构建信息由版本号推断（sunshine --version --json 还没合入）'),
  ]],
  ['process', '进程与端口', [
    item('process.ports', 'fail', '端口占用', 'tcp 47990 被 nginx.exe（PID 4420）占用', '关掉 nginx.exe 或改 Sunshine 的「端口」，然后重启 Sunshine。', { kind: 'open', target: 'setting:port', confirm: false }),
    item('process.log', 'warn', '日志末尾', '最后一条错误（3 分钟前）：Couldn\'t bind http server to ports [47989, 47990]', '在「日志与诊断」里看完整日志。', { kind: 'open', target: 'page:logs', confirm: false }),
  ]],
  ['drivers', '驱动', [
    item('drivers.vdd', 'pass', '基地虚拟显示器', '运行中 · 驱动 100.0.18.2 · 设备正常'),
    item('drivers.vigem', 'fail', 'ViGEmBus', '设备问题代码 28（驱动没有安装）', '重新安装 ViGEmBus。上游已停止维护，DualSense 可以改走 USB 方式。', { kind: 'repair', target: 'driver:vigem', confirm: true, level: 3, effect: '用随产品附带的安装包（已校验 SHA256）重新安装 ViGEmBus 1.22。DS4Windows 等也用它的软件会短暂失去手柄，可能需要重启电脑。' }),
    item('drivers.vmouse', 'skip', '虚拟鼠标', '未检查：没有安装'),
    item('drivers.usbip', 'pass', 'USB/IP（usbip-win2）', '就绪 · 0.9.7.7'),
  ]],
]

/** The panel's answer (doctor_local), as one report. */
export const MOCK_DOCTOR_LOCAL = Object.freeze({
  version: 1,
  source: 'local',
  checked_at: '2026-11-04T08:00:00Z',
  elapsed_ms: 600,
  summary: { pass: 0, warn: 0, fail: 0, skip: 0 },
  groups: LOCAL.map(([id, title, items]) => ({ id, title, status: worst(items), elapsed_ms: 0, timed_out: false, items: items.map((i) => i.id) })),
  items: LOCAL.flatMap(([, , items]) => items.map((i) => ({ ...i, source: 'local' }))),
})

/** The panel's answer with Sunshine stopped (the service is down, its port free): the offline scenario. */
export const MOCK_DOCTOR_LOCAL_DOWN = Object.freeze({
  ...MOCK_DOCTOR_LOCAL,
  items: MOCK_DOCTOR_LOCAL.items.map((i) => (i.id === 'service.state'
    ? { ...i, status: 'fail', detail: '服务 STOPPED · 没有 sunshine.exe · 主机没有应答：Sunshine 没有运行', fix: { text: '启动 Sunshine。', action: { kind: 'repair', target: 'service:start', confirm: true, level: 2, effect: '停止并重新启动 SunshineService；Windows 可能会请求管理员确认。正在进行的串流会断开。' } } }
    : i.id === 'service.last_exit' ? { ...i, status: 'warn', detail: '退出码 1067（0x42b）', fix: { text: '那次运行的日志里有原因。', action: { kind: 'open', target: 'page:logs', confirm: false } } }
      : i)),
  groups: MOCK_DOCTOR_LOCAL.groups.map((g) => (g.id === 'service' ? { ...g, status: 'fail' } : g)),
})

/** A local source for createDoctor / MDoctor from the mock (the gallery and the tests; the panel answers doctor_local itself). */
export function mockLocalSource({ speed = 1, report = MOCK_DOCTOR_LOCAL } = {}) {
  return {
    id: 'local',
    groups: report.groups.map((g) => ({ id: g.id, icon: { service: 'power_settings_new', install: 'inventory_2', process: 'terminal', drivers: 'extension' }[g.id] || 'help' })),
    fetch: async (group) => {
      const g = report.groups.find((x) => x.id === group)
      await new Promise((r) => setTimeout(r, 150 * speed))
      return { ok: !!g, status: g ? 200 : 400, json: g ? { ...report, groups: [g], items: report.items.filter((i) => g.items.includes(i.id)) } : null }
    },
  }
}

const DELAYS = { gpu: 400, encoder: 2600, capture: 900, vdd: 300, audio: 500, input: 450, network: 1800, system: 350, host: 250 }

/** request(path) for createDoctor: answers each ?only= group from the mock after its delay (scaled by `speed`). */
export function mockDoctorRequest({ speed = 1, report = MOCK_DOCTOR, offline = false } = {}) {
  return async (path) => {
    if (offline) return { ok: false, status: 503, json: null }
    const only = new URL(path, 'http://x').searchParams.get('only') || ''
    const group = report.groups.find((g) => g.id === only)
    await new Promise((r) => setTimeout(r, (DELAYS[only] || 300) * speed))
    if (!group) return { ok: false, status: 400, json: { ok: false, error: `Unknown group: ${only}` } }
    const items = report.items.filter((i) => group.items.includes(i.id))
    return { ok: true, status: 200, json: { ...report, groups: [{ ...group, elapsed_ms: DELAYS[only] || 300 }], items } }
  }
}
