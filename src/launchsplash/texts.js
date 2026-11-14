// Text of the launch splash (启动画面): the stage line, the failure sentence and the notice line. Chinese and English; every other language falls back to English.
// The host and the launcher send codes, never sentences (docs/launch-splash.md in the host repository): this file turns a code into a line.

const EN = {
  stages: {
    starting: 'Starting',
    broker: 'Starting Broker',
    preparing: 'Sparxie is preparing',
    injecting: 'Injecting',
    'waiting-window': 'Waiting for the game window',
  },
  failed: 'Launch failed: {reason}',
  reasons: {
    broker: 'the Broker did not start',
    rejected: 'the Broker refused the launch',
    rpc: 'the connection to the Broker broke',
    'session-failed': 'the Sparxie session failed',
    lost: 'the Sparxie session ended unexpectedly',
    'timed-out': 'the game did not start in time',
    config: 'the Sparxie settings were not found',
    usage: 'the launch arguments are wrong',
    internal: 'the launcher hit an internal error',
    start: 'the start command could not run',
    prep: 'a prepare command failed',
    unknown: 'the reason is unknown',
  },
  notices: {
    direct: 'Sparxie could not take over; the game was started directly',
  },
}

const ZH = {
  stages: {
    starting: '正在启动',
    broker: '启动 Broker',
    preparing: 'Sparxie 准备中',
    injecting: '注入中',
    'waiting-window': '等待游戏窗口',
  },
  failed: '启动失败：{reason}',
  reasons: {
    broker: 'Broker 没有启动',
    rejected: 'Broker 拒绝了本次启动',
    rpc: '与 Broker 的连接中断',
    'session-failed': 'Sparxie 会话失败',
    lost: 'Sparxie 会话意外结束',
    'timed-out': '游戏没有在限定时间内启动',
    config: '没有找到 Sparxie 设置',
    usage: '启动参数有误',
    internal: '启动器内部错误',
    start: '启动命令无法运行',
    prep: '准备命令失败',
    unknown: '原因未知',
  },
  notices: {
    direct: 'Sparxie 未能接管，已直接启动游戏',
  },
}

export const LAUNCH_STAGES = Object.freeze(['starting', 'broker', 'preparing', 'injecting', 'waiting-window'])

/** The texts for a locale; `texts` overrides single entries (the product's own wording). */
export function launchSplashTexts(locale = 'zh', texts = {}) {
  const base = /^zh/i.test(String(locale)) ? ZH : EN
  return {
    stages: { ...base.stages, ...(texts.stages || {}) },
    failed: texts.failed || base.failed,
    reasons: { ...base.reasons, ...(texts.reasons || {}) },
    notices: { ...base.notices, ...(texts.notices || {}) },
  }
}

/**
 * The one line under the name, and what kind it is. A failure wins (its reason code is in `notice`), then a notice, then the stage; a code it does not
 * know says so in plain words and never shows the code.
 */
export function launchLine(T, { stage = 'starting', notice = '' } = {}) {
  if (stage === 'failed') {
    const reason = T.reasons[notice] || T.reasons.unknown
    return { kind: 'failed', text: T.failed.replace('{reason}', reason) }
  }
  if (notice && T.notices[notice]) return { kind: 'notice', text: T.notices[notice] }
  return { kind: 'stage', text: T.stages[stage] || T.stages.starting }
}
