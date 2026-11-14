import { canonicalLocale } from '../locale/texts/resolve.js'
// Texts of the pages of 显示与视频 (the tree in displayTree.js): section titles, the words of the new controls. Chinese and English; any
// other interface language reads the English ones. Professional terms; a line says a state, a consequence or a number, never what the title already says.
const EN = {
  sections: {
    output: { target: 'Output display', mode: 'Display mode', prep: 'Display configuration', headless: 'Headless mode', advanced: 'Advanced' },
    modes: { policy: 'Resolution policy', resolutions: 'Supported resolutions', rates: 'Supported refresh rates' },
    hdr: { status: 'HDR', system: 'System HDR', calibration: 'Calibration', advanced: 'Advanced' },
    quality: { nr: 'Noise reduction' },
    encoders: { bitrate: 'Bitrate', format: 'Video format', encoder: 'Encoder', effective: 'Encoder status', advanced: 'Advanced' },
    virtual: { device: 'Device', links: 'Related settings' },
    advanced: { capture: 'Capture', gpu: 'Graphics card', compat: 'Compatibility', sync: 'Sync and special', reset: 'Reset this group' },
  },
  display: {
    auto: 'Automatic', autoText: 'Chosen by the host', virtual: 'Foundation Virtual Display', virtualOn: 'Created for the stream', virtualOff: 'Not created', physical: 'Display', countOne: '{n} display', countMany: '{n} displays', primary: 'Main display', arrangement: 'Displays',
    window: 'Window capture', windowText: 'Streams the selected window instead of a whole display', windowTitle: 'Window title', windowPlaceholder: 'Window title (partial match)',
    noneFound: 'No physical display is listed', unavailableInBrowser: 'The list of displays comes from the host',
    ids: 'Display names and ids',
  },
  mode: {
    resolution: 'Resolution', refresh: 'Refresh rate', scale: 'Scaling', applying: 'Applying…', applied: 'Applied', failed: 'Could not apply: {error}', unsupported: 'Applied by the control panel on the host', sliderHost: 'Display settings can only be changed on the host',
    target: 'Applies to {name}', targetStream: 'Applies to {name}, the display being streamed', unit: 'Hz', vrr: 'Variable refresh rate',
  },
  prep: {
    no_operation: 'No change', ensure_active: 'Activate this display', ensure_primary: 'Set as main display', ensure_only_display: 'Use only this display', ensure_secondary: 'Extend displays',
    effect: {
      no_operation: 'The display configuration is not modified',
      ensure_active: 'Activates the display if it is inactive',
      ensure_primary: 'Activates the display and sets it as the main display',
      ensure_only_display: 'Disconnects all other displays',
      ensure_secondary: 'Extends the desktop onto Foundation Virtual Display',
    },
    revert: 'The previous display configuration is restored when the stream ends',
  },
  headless: { label: 'Create the display when the host has none', text: 'Foundation Virtual Display is created at once; nothing else changes.' },
  policy: {
    resolution: 'Resolution', refresh: 'Refresh rate', follow: 'Follow client', fixed: 'Keep current', manual: 'Custom', default: 'Default',
    manualResolution: 'Resolution', manualRefresh: 'Refresh rate', followHost: 'Follow host resolution changes during the stream',
  },
  list: { resolutions: 'Resolutions', rates: 'Refresh rates', shared: 'Shared with Foundation Virtual Display; the driver applies the lists after it reloads', edit: 'Edit' },
  hdr: {
    running: 'HDR is streaming', off: 'HDR is off', fallback: 'Streaming in SDR', unavailable: 'HDR unavailable', idle: 'HDR ready', unknown: 'HDR status unknown',
    allow: 'Allow HDR', allowText: 'Offered to clients that ask for it', system: 'Turn on system HDR while streaming', systemText: 'Restored when the stream ends',
    reasonNoClient: 'No client is asking for HDR', reasonDisplay: 'The display does not report HDR', reasonCodec: 'The codec in use carries no HDR', reasonEncoder: 'The encoder cannot carry HDR metadata', reasonOff: 'HDR is not allowed',
    calibrateVirtual: 'Calibrate Foundation Virtual Display', calibratePhysical: 'Calibrate physical display', calibrateHost: 'Opens on the host', rtx: 'RTX HDR', bridge: 'Vulkan HDR bridge', analysis: 'HDR luminance analysis',
  },
  quality: { nr: 'DLSS noise reduction', strength: 'Strength', components: 'Components', needs: 'Needs the DLSS component', ready: 'Ready', off: 'Off' },
  encoding: {
    bitrate: 'Maximum bitrate', auto: 'Auto', autoText: 'The client decides', mbps: 'Mbps',
    format: 'Format', formats: { auto: 'Auto', h264: 'H.264', hevc: 'HEVC', av1: 'AV1', custom: 'Custom' },
    formatText: { auto: 'The client chooses', h264: 'Widest support', hevc: 'Less bandwidth', av1: 'Least bandwidth', custom: 'Set per codec' },
    encoder: 'Encoder', encoderAuto: 'Auto', encoderAutoText: 'Found by the host', encoderMissing: '{vendor} not found',
    effective: { encoder: 'Encoder', codecs: 'Codecs', bitrate: 'Bitrate cap', hdr: 'HDR', none: 'Not reported' },
    vendorTitle: '{vendor} parameters',
  },
  device: {
    ready: 'Ready', degraded: 'Needs repair', missing: 'Driver not installed', unknown: 'Driver state unknown', checking: 'Checking the driver…',
    driver: 'Driver', version: 'Version {installed}', bundled: 'Included {bundled}', install: 'Install', repair: 'Repair', recheck: 'Check again', create: 'Create now', close: 'Close now',
    exists: 'Display created', notCreated: 'Display not created', keep: 'Keep enabled', keepText: 'Stays after the stream ends', trayOnly: 'Saved by the control panel or the tray', headless: 'Create when the host has no display',
    reuse: 'One display for all clients', reuseText: 'Faster switching; scaling is no longer kept per client',
    links: { modes: 'Modes and refresh rates', calibration: 'HDR calibration', scaling: 'Scaling' },
  },
  advanced: {
    capture: 'Capture method', captureAuto: 'Auto', compute: 'Compute shader', vdd: 'VDD direct capture', vddText: 'Experimental', wgcMode: 'WGC runs as', wgcUser: 'User mode', wgcService: 'Service mode', wgcSwitch: 'Switch',
    gpu: 'Encoder graphics card', overrides: 'Per-app capture overrides', overridesText: 'Set in the app editor', amd: 'AMD capture cannot use a virtual display',
    vsync: 'Force vsync for NVIDIA', reset: 'Reset', resetText: 'Restores the default of every setting in this group', resetDone: 'Restored',
  },
  common: { on: 'On', off: 'Off', open: 'Open', hostOnly: 'Changes apply on the host' },
}
const ZH = {
  sections: {
    output: { target: '输出显示器', mode: '显示模式', prep: '显示器配置', headless: '无头模式', advanced: '高级' },
    modes: { policy: '分辨率策略', resolutions: '支持的分辨率', rates: '支持的刷新率' },
    hdr: { status: 'HDR', system: '系统 HDR', calibration: '校准', advanced: '高级' },
    quality: { nr: '降噪' },
    encoders: { bitrate: '码率', format: '视频格式', encoder: '编码器', effective: '编码器状态', advanced: '高级' },
    virtual: { device: '设备', links: '相关设置' },
    advanced: { capture: '捕获', gpu: '显卡', compat: '兼容性', sync: '同步与特殊', reset: '重置本组' },
  },
  display: {
    auto: '自动', autoText: '由主机选择', virtual: '基地虚拟显示器', virtualOn: '串流时创建', virtualOff: '未创建', physical: '显示器', countOne: '{n} 台显示器', countMany: '{n} 台显示器', primary: '主显示器', arrangement: '显示器排列',
    window: '窗口捕获', windowText: '串流所选窗口，而非整个显示器', windowTitle: '窗口标题', windowPlaceholder: '窗口标题（支持部分匹配）',
    noneFound: '主机没有列出物理显示器', unavailableInBrowser: '显示器列表由主机提供',
    ids: '显示器名称与标识',
  },
  mode: {
    resolution: '分辨率', refresh: '刷新率', scale: '缩放', applying: '正在应用…', applied: '已应用', failed: '无法应用：{error}', unsupported: '由主机上的控制面板应用', sliderHost: '显示器设置只能在主机上修改',
    target: '作用于 {name}', targetStream: '作用于 {name}（正在串流的显示器）', unit: 'Hz', vrr: '可变刷新率',
  },
  prep: {
    no_operation: '不更改', ensure_active: '激活此显示器', ensure_primary: '设为主显示器', ensure_only_display: '仅使用此显示器', ensure_secondary: '扩展显示器',
    effect: {
      no_operation: '不修改显示器配置',
      ensure_active: '若显示器未激活，则激活它',
      ensure_primary: '激活该显示器并设为主显示器',
      ensure_only_display: '断开其他显示器',
      ensure_secondary: '在基地虚拟显示器上扩展桌面',
    },
    revert: '串流结束后恢复原有显示器配置',
  },
  headless: { label: '主机没有显示器时自动创建', text: '立即创建基地虚拟显示器，其他设置不变。' },
  policy: {
    resolution: '分辨率', refresh: '刷新率', follow: '跟随客户端', fixed: '保持当前值', manual: '自定义', default: '默认',
    manualResolution: '分辨率', manualRefresh: '刷新率', followHost: '串流中跟随主机分辨率变化',
  },
  list: { resolutions: '分辨率', rates: '刷新率', shared: '与基地虚拟显示器共用同一列表；驱动重新加载后应用', edit: '编辑' },
  hdr: {
    running: 'HDR 串流中', off: 'HDR 未开启', fallback: '已回退为 SDR', unavailable: 'HDR 不可用', idle: 'HDR 就绪', unknown: 'HDR 状态未知',
    allow: '允许 HDR', allowText: '向请求 HDR 的客户端提供', system: '串流时自动开启系统 HDR', systemText: '串流结束后恢复',
    reasonNoClient: '没有客户端请求 HDR', reasonDisplay: '显示器未报告 HDR', reasonCodec: '当前编码不支持 HDR', reasonEncoder: '编码器无法携带 HDR 元数据', reasonOff: '未允许 HDR',
    calibrateVirtual: '校准基地虚拟显示器', calibratePhysical: '校准物理显示器', calibrateHost: '在主机上打开', rtx: 'RTX HDR', bridge: 'Vulkan HDR 桥接', analysis: 'HDR 亮度分析',
  },
  quality: { nr: 'DLSS 降噪', strength: '强度', components: '组件', needs: '需要 DLSS 组件', ready: '就绪', off: '关闭' },
  encoding: {
    bitrate: '最大码率', auto: '自动', autoText: '由客户端决定', mbps: 'Mbps',
    format: '格式', formats: { auto: '自动', h264: 'H.264', hevc: 'HEVC', av1: 'AV1', custom: '自定义' },
    formatText: { auto: '客户端选择', h264: '兼容最广', hevc: '更省带宽', av1: '最省带宽', custom: '按编码分别设置' },
    encoder: '编码器', encoderAuto: '自动', encoderAutoText: '由主机检测', encoderMissing: '未找到 {vendor}',
    effective: { encoder: '编码器', codecs: '编码', bitrate: '码率上限', hdr: 'HDR', none: '未报告' },
    vendorTitle: '{vendor} 参数',
  },
  device: {
    ready: '就绪', degraded: '需要修复', missing: '驱动未安装', unknown: '驱动状态未知', checking: '正在检测驱动…',
    driver: '驱动', version: '版本 {installed}', bundled: '内置 {bundled}', install: '安装', repair: '修复', recheck: '重新检测', create: '立即创建', close: '立即关闭',
    exists: '显示器已创建', notCreated: '显示器未创建', keep: '常驻', keepText: '串流结束后保留', trayOnly: '由控制面板或托盘保存', headless: '主机没有显示器时创建',
    reuse: '所有客户端共用一个显示器', reuseText: '切换更快；不再按客户端记住缩放',
    links: { modes: '分辨率与刷新率', calibration: 'HDR 校准', scaling: '缩放' },
  },
  advanced: {
    capture: '捕获方式', captureAuto: '自动', compute: '计算着色器', vdd: 'VDD 直接捕获', vddText: '实验性', wgcMode: 'WGC 运行方式', wgcUser: '用户模式', wgcService: '服务模式', wgcSwitch: '切换',
    gpu: '编码显卡', overrides: '按应用的捕获覆盖', overridesText: '在应用编辑器中设置', amd: 'AMD 捕获无法使用虚拟显示器',
    vsync: '为 NVIDIA 强制垂直同步', reset: '重置', resetText: '把本组每项设置恢复为默认值', resetDone: '已恢复',
  },
  common: { on: '开', off: '关', open: '打开', hostOnly: '修改在主机上生效' },
}
const EFFECT = {
  "zh_TW": {
    "no_operation": "不修改顯示器設定",
    "ensure_active": "若顯示器未啟用，則啟用它",
    "ensure_primary": "啟用該顯示器並設為主要顯示器",
    "ensure_only_display": "中斷其他顯示器的連線",
    "ensure_secondary": "在基地虛擬顯示器上延伸桌面"
  },
  "en_GB": {
    "no_operation": "The display configuration is not modified",
    "ensure_active": "Activates the display if it is inactive",
    "ensure_primary": "Activates the display and sets it as the main display",
    "ensure_only_display": "Disconnects all other displays",
    "ensure_secondary": "Extends the desktop onto Foundation Virtual Display"
  },
  "en_US": {
    "no_operation": "The display configuration is not modified",
    "ensure_active": "Activates the display if it is inactive",
    "ensure_primary": "Activates the display and sets it as the main display",
    "ensure_only_display": "Disconnects all other displays",
    "ensure_secondary": "Extends the desktop onto Foundation Virtual Display"
  },
  "de": {
    "no_operation": "Die Anzeigekonfiguration bleibt unverändert",
    "ensure_active": "Aktiviert die Anzeige, wenn sie aus ist",
    "ensure_primary": "Aktiviert die Anzeige und macht sie zur Hauptanzeige",
    "ensure_only_display": "Trennt alle anderen Anzeigen",
    "ensure_secondary": "Erweitert den Desktop auf Foundation Virtual Display"
  },
  "fr": {
    "no_operation": "La configuration d'affichage n'est pas modifiée",
    "ensure_active": "Active l'écran s'il est inactif",
    "ensure_primary": "Active l'écran et le définit comme écran principal",
    "ensure_only_display": "Déconnecte les autres écrans",
    "ensure_secondary": "Étend le bureau sur Foundation Virtual Display"
  },
  "es": {
    "no_operation": "No se modifica la configuración de pantalla",
    "ensure_active": "Activa la pantalla si está inactiva",
    "ensure_primary": "Activa la pantalla y la pone como principal",
    "ensure_only_display": "Desconecta las demás pantallas",
    "ensure_secondary": "Extiende el escritorio en Foundation Virtual Display"
  },
  "it": {
    "no_operation": "La configurazione dello schermo non cambia",
    "ensure_active": "Attiva lo schermo se è inattivo",
    "ensure_primary": "Attiva lo schermo e lo imposta come principale",
    "ensure_only_display": "Scollega gli altri schermi",
    "ensure_secondary": "Estende il desktop su Foundation Virtual Display"
  },
  "ja": {
    "no_operation": "ディスプレイ構成は変更しません",
    "ensure_active": "無効なら、そのディスプレイを有効にします",
    "ensure_primary": "有効にしてメインディスプレイにします",
    "ensure_only_display": "他のディスプレイを切断します",
    "ensure_secondary": "デスクトップを Foundation Virtual Display に拡張します"
  },
  "ko": {
    "no_operation": "디스플레이 구성은 바꾸지 않습니다",
    "ensure_active": "꺼져 있으면 이 디스플레이를 켭니다",
    "ensure_primary": "켜고 주 디스플레이로 설정합니다",
    "ensure_only_display": "다른 디스플레이 연결을 끊습니다",
    "ensure_secondary": "바탕 화면을 Foundation Virtual Display로 확장합니다"
  },
  "ru": {
    "no_operation": "Конфигурация дисплеев не меняется",
    "ensure_active": "Включает дисплей, если он выключен",
    "ensure_primary": "Включает дисплей и делает его основным",
    "ensure_only_display": "Отключает остальные дисплеи",
    "ensure_secondary": "Расширяет рабочий стол на Foundation Virtual Display"
  },
  "pt_BR": {
    "no_operation": "A configuração de tela não é alterada",
    "ensure_active": "Ativa a tela se ela estiver inativa",
    "ensure_primary": "Ativa a tela e a define como principal",
    "ensure_only_display": "Desconecta as outras telas",
    "ensure_secondary": "Estende a área de trabalho no Foundation Virtual Display"
  },
  "pt": {
    "no_operation": "A configuração do ecrã não é alterada",
    "ensure_active": "Ativa o ecrã se estiver inativo",
    "ensure_primary": "Ativa o ecrã e define-o como principal",
    "ensure_only_display": "Desliga os outros ecrãs",
    "ensure_secondary": "Alarga o ambiente de trabalho no Foundation Virtual Display"
  },
  "bg": {
    "no_operation": "Конфигурацията на дисплея не се променя",
    "ensure_active": "Включва дисплея, ако е изключен",
    "ensure_primary": "Включва дисплея и го прави основен",
    "ensure_only_display": "Изключва другите дисплеи",
    "ensure_secondary": "Разширява работния плот върху Foundation Virtual Display"
  },
  "cs": {
    "no_operation": "Konfigurace displeje se nemění",
    "ensure_active": "Zapne displej, pokud je vypnutý",
    "ensure_primary": "Zapne displej a nastaví ho jako hlavní",
    "ensure_only_display": "Odpojí ostatní displeje",
    "ensure_secondary": "Rozšíří plochu na Foundation Virtual Display"
  },
  "pl": {
    "no_operation": "Konfiguracja ekranu się nie zmienia",
    "ensure_active": "Włącza ekran, jeśli jest wyłączony",
    "ensure_primary": "Włącza ekran i ustawia go jako główny",
    "ensure_only_display": "Odłącza pozostałe ekrany",
    "ensure_secondary": "Rozszerza pulpit na Foundation Virtual Display"
  },
  "sv": {
    "no_operation": "Skärmkonfigurationen ändras inte",
    "ensure_active": "Aktiverar skärmen om den är av",
    "ensure_primary": "Aktiverar skärmen och gör den till huvudskärm",
    "ensure_only_display": "Kopplar från de andra skärmarna",
    "ensure_secondary": "Utökar skrivbordet till Foundation Virtual Display"
  },
  "tr": {
    "no_operation": "Ekran yapılandırması değişmez",
    "ensure_active": "Kapalıysa bu ekranı açar",
    "ensure_primary": "Ekranı açar ve ana ekran yapar",
    "ensure_only_display": "Diğer ekranların bağlantısını keser",
    "ensure_secondary": "Masaüstünü Foundation Virtual Display üzerine genişletir"
  },
  "uk": {
    "no_operation": "Конфігурація дисплеїв не змінюється",
    "ensure_active": "Вмикає дисплей, якщо його вимкнено",
    "ensure_primary": "Вмикає дисплей і робить його основним",
    "ensure_only_display": "Від'єднує інші дисплеї",
    "ensure_secondary": "Розширює робочий стіл на Foundation Virtual Display"
  }
}

const ENCODER_STATUS = {
  zh_TW: '編碼器狀態', de: 'Encoderstatus', fr: "État de l'encodeur", es: 'Estado del codificador', it: 'Stato del codificatore', ja: 'エンコーダーの状態', ko: '인코더 상태', ru: 'Состояние кодировщика', pt_BR: 'Estado do codificador', pt: 'Estado do codificador', bg: 'Състояние на енкодера', cs: 'Stav kodéru', pl: 'Stan enkodera', sv: 'Kodarstatus', tr: 'Kodlayıcı durumu', uk: 'Стан кодувальника',
}
export function displayTreeTexts(locale) {
  const code = canonicalLocale(locale)
  const base = code === 'zh' || code === 'zh_TW' ? ZH : EN
  const fx = EFFECT[code]
  const withFx = fx ? { ...base, prep: { ...base.prep, effect: { ...base.prep.effect, ...fx } } } : base
  const status = ENCODER_STATUS[code]
  if (!status) return withFx
  return { ...withFx, sections: { ...withFx.sections, encoders: { ...withFx.sections.encoders, effective: status } } }
}
export const DISPLAY_TREE_TEXTS = Object.freeze({ en: EN, zh: ZH })
