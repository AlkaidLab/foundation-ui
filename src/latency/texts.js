// Text of the latency test clock: Chinese and English, every other language falls back to English. A product may override single entries.

const EN = {
  title: 'Latency test clock',
  frames: 'Frame', refresh: 'Refresh', interval: 'Frame interval',
  note: 'A reading can be off by up to one frame interval: the screen shows each frame for that long.',
  photoDark: 'White on black', photoLight: 'Black on white', photoMode: 'Photo mode',
  fullscreen: 'Full screen', fullscreenStream: 'Full screen on the streamed display', exit: 'Esc to exit',
  guideTitle: 'How to measure', external: 'D-lay (web)',
  steps: [
    'Open this clock on the host, full screen on the display the stream captures.',
    'Connect the client and show the stream next to the host screen.',
    'Photograph both screens at once. Latency = host reading − client reading; it is the same clock, so no sync is needed.',
  ],
  streamFailed: 'The streamed display could not be found; the clock opened on this display.',
}
const ZH = {
  title: '延迟测试时钟',
  frames: '帧', refresh: '刷新率', interval: '帧间隔',
  note: '单次读数最多差一个帧间隔：每一帧在屏幕上停留这么久。',
  photoDark: '白字黑底', photoLight: '黑字白底', photoMode: '拍照模式',
  fullscreen: '全屏', fullscreenStream: '在串流显示器上全屏打开', exit: 'Esc 退出',
  guideTitle: '怎么测', external: 'D-lay（网页版）',
  steps: [
    '在主机上打开这个时钟，在串流捕获的显示器上全屏。',
    '连接客户端，把串流画面放在主机屏幕旁边。',
    '同时拍下两块屏幕。延迟 = 主机读数 − 客户端读数；是同一个时钟，不需要对时。',
  ],
  streamFailed: '没有找到串流的显示器，时钟已在当前显示器上打开。',
}

export function latencyClockTexts(locale = 'en', overrides = {}) {
  return { ...(String(locale).toLowerCase().startsWith('zh') ? ZH : EN), ...overrides }
}
