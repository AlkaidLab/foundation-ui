// A small settings data set of the tests' own: made up for them, with no text or structure taken from a product. It is the kind of thing a product supplies
// (provideSettingsData), so the shared logic (the search, the list, the recent rows, the hash) is tested without any product's data in this package.
// Importing this module supplies it. The product's real data is checked in the product's own tests.
import { provideSettingsData } from '../../src/settings/provider.js'

const e = (id, title, path, icon, tab, sub, keywords = '') => ({ id, title, path, icon, keywords: [id, id.replace(/_/g, ' '), keywords].filter(Boolean).join(' '), route: 'config', params: { tab, ...(sub ? { sub } : {}), focus: id } })

export const FIXTURE_INDEX = [
  e('sunshine_name', 'config.sunshine_name', ['tabs.general'], 'settings', 'general'),
  e('controller', 'config.controller', ['shell.input_peripherals', 'tabs.gamepad'], 'sports_esports', 'input', 'gamepad'),
  e('gamepad', 'config.gamepad', ['shell.input_peripherals', 'tabs.gamepad'], 'sports_esports', 'input', 'gamepad'),
  e('usb_forwarding_enabled', 'config.usb_forwarding_enabled', ['shell.input_peripherals', 'tabs.usb'], 'usb', 'input', 'usb'),
  e('stream_audio', 'config.stream_audio', ['tabs.audio', 'tabs.sound'], 'volume_up', 'audio', 'sound'),
  e('hevc_mode', 'config.hevc_mode', ['tabs.display', 'shell.display_encoders'], 'desktop_windows', 'display', 'encoders', 'codec h265'),
  e('nvenc_preset', 'config.nvenc_preset', ['tabs.display', 'shell.display_encoders', 'tabs.nv'], 'memory', 'display', 'encoders'),
  e('max_bitrate', 'config.max_bitrate', ['tabs.display', 'shell.display_encoders'], 'desktop_windows', 'display', 'encoders', 'speed'),
  e('hdr_prep', 'config.hdr_prep', ['tabs.display', 'shell.display_hdr'], 'desktop_windows', 'display', 'hdr'),
  e('bind_address', 'config.bind_address', ['tabs.network'], 'lan', 'network', '', 'listen'),
  e('log_path', 'config.log_path', ['tabs.files'], 'folder', 'files'),
]

const en = {
  'tabs.general': 'General', 'tabs.audio': 'Audio', 'tabs.display': 'Display', 'tabs.network': 'Network', 'tabs.files': 'Files', 'tabs.gamepad': 'Gamepad', 'tabs.usb': 'USB', 'tabs.sound': 'Sound', 'tabs.nv': 'NVIDIA',
  'shell.input_peripherals': 'Input', 'shell.display_encoders': 'Encoders', 'shell.display_hdr': 'HDR', 'shell.recent': 'Recently used', 'shell.clear': 'Clear', 'navbar.configuration': 'Configuration',
  'config.sunshine_name': 'Host name', 'config.controller': 'Controller support', 'config.gamepad': 'Gamepad type', 'config.usb_forwarding_enabled': 'USB forwarding', 'config.stream_audio': 'Stream audio',
  'config.hevc_mode': 'HEVC support', 'config.nvenc_preset': 'Encoder preset', 'config.max_bitrate': 'Bitrate ceiling', 'config.hdr_prep': 'HDR preparation', 'config.bind_address': 'Bind address', 'config.log_path': 'Log file',
}
const zh = {
  'tabs.general': '常规', 'tabs.audio': '音频', 'tabs.display': '显示', 'tabs.network': '网络', 'tabs.files': '文件', 'tabs.gamepad': '手柄', 'tabs.usb': 'USB', 'tabs.sound': '声音', 'tabs.nv': 'NVIDIA',
  'shell.input_peripherals': '输入', 'shell.display_encoders': '编码器', 'shell.display_hdr': 'HDR', 'shell.recent': '最近使用', 'shell.clear': '清除', 'navbar.configuration': '设置',
  'config.sunshine_name': '主机名称', 'config.controller': '手柄支持', 'config.gamepad': '手柄类型', 'config.usb_forwarding_enabled': 'USB 转发', 'config.stream_audio': '串流音频',
  'config.hevc_mode': 'HEVC 支持', 'config.nvenc_preset': '编码预设', 'config.max_bitrate': '码率上限', 'config.hdr_prep': 'HDR 准备', 'config.bind_address': '绑定地址', 'config.log_path': '日志文件',
}
export const FIXTURE_LABELS = { en, zh, de: { 'tabs.general': 'Allgemein' } }

provideSettingsData({ searchIndex: FIXTURE_INDEX, labels: FIXTURE_LABELS })
