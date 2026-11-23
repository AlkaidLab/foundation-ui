// When a saved setting takes effect, from the host audit of 2026-11-05 (live-settings-audit-20261105, read of src/config.cpp and the read sites). A save through POST /api/config writes the
// file and does not call apply_config, which copies the file into the running process once, at start. So the default is "after a restart"; the exceptions are named here.
//   live         the next device the host creates uses it, no restart (gamepad: set_global_gamepad_mode runs on the save; Windows only, the setter is empty elsewhere)
//   next-stream  read from the file again at the next launch of a stream (the two NVENC driver settings)
//   client       the number of the running stream is the client's; the host key is a cap or a list, and that copy is the startup one: after a restart
//   restart      everything else apply_config reads
//   now          the bitrate ceiling (max_bitrate), since feat/tray-bitrate-live of the release host: update_full_config sets it in the running process and every running session follows it
//   request      read from the saved file by the control panel at every pairing request (pin_prompt): the next request uses it
//   unclear      no reader of the saved value was found, or the writer the page uses does not stick
export const APPLIES = Object.freeze({ LIVE: 'live', NOW: 'now', NEXT: 'next-stream', REQUEST: 'next-request', CLIENT: 'client', RESTART: 'restart', UNCLEAR: 'unclear' })

const NEXT = new Set(['nvenc_manage_driver_settings', 'nvenc_vdd_force_vsync'])
const NOW = new Set(['max_bitrate'])
const REQUEST = new Set(['pin_prompt'])
const CLIENT = new Set(['fps', 'resolutions', 'hevc_mode', 'av1_mode', 'codec_strategy', 'codec_enable_hdr'])
const UNCLEAR = new Set(['external_endpoints', 'hdr_enhanced', 'notify_pre_releases', 'vdd_keep_enabled', 'vdd_headless_create'])

/** The class of a key on a host of this platform ('windows' | 'linux' | 'macos' | anything else = not known). */
export function appliesOf(key, platform = '') {
  if (key === 'gamepad') return String(platform).toLowerCase() === 'windows' ? APPLIES.LIVE : APPLIES.RESTART
  if (NOW.has(key)) return APPLIES.NOW
  if (NEXT.has(key)) return APPLIES.NEXT
  if (REQUEST.has(key)) return APPLIES.REQUEST
  if (CLIENT.has(key)) return APPLIES.CLIENT
  if (UNCLEAR.has(key)) return APPLIES.UNCLEAR
  return APPLIES.RESTART
}

const TEXTS = Object.freeze({
  zh: { live: '新建的手柄生效', now: '立即生效,正在串流的会话也会变', 'next-stream': '下一次串流生效', 'next-request': '下一次配对请求生效', client: '由客户端决定 · 重启后生效', restart: '重启后生效', unclear: '生效时机未确认' },
  en: { live: 'Applies to new controllers', now: 'Applies at once, also to a running stream', 'next-stream': 'Applies to the next stream', 'next-request': 'Applies at the next pairing request', client: 'Set by the client · after a restart', restart: 'After a restart', unclear: 'When it applies is not confirmed' },
})
/** The line every setting control states: when a change applies. */
export const appliesText = (key, platform = '', locale = 'en') => (TEXTS[/^zh/i.test(String(locale)) ? 'zh' : 'en'])[appliesOf(key, platform)]
