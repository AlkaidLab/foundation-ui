import { textTable } from '../locale/texts/index.js'
// The words of the offline state. They say what the old error page said (Sunshine does not answer; is the service running, is the port free, does the firewall let it through; the page
// goes back by itself) in plain words; the old wording is gone. The actions of the state (restart, user mode, log, the restart messages) are new.
const ZH = {
  pageTitle: 'Sunshine 没有响应',
  title: 'Sunshine 没有响应',
  line: 'Sunshine 没有在运行，或者没有回应请求。',
  tipsTitle: '可以这样排查：',
  tips: ['Sunshine 服务有没有在运行', '端口 {port} 有没有被占用或被拦截', '防火墙有没有拦截 Sunshine'],
  retry: '再试一次',
  footer: 'Sunshine 恢复后，这个页面会自动返回。',
  probing: '第{n}次探测 Sunshine...',
  failed: '第{n}次探测失败，{s}秒后重试...',
  awake: 'Sunshine 已恢复，正在返回…',
  // new
  restart: '重启 Sunshine', userMode: '以用户模式启动', viewLog: '查看日志', runDoctor: '运行体检',
  retryIn: '{s} 秒后重试', attemptFailed: '第{n}次探测失败',
  restarting: '正在重启 Sunshine...', restartFailed: '重启没有成功：{message}', restartTimeout: '重启后 Sunshine 还是没有回应', troubleshooting: '排查',
  proxyTitle: '无法连接 Sunshine 的 WebUI 面板', proxyLine: '代理或 TUN 软件可能拦截了 localhost、127.0.0.0/8 或 IPv6 环回地址，请将本机环回流量设为直连后重试。',
  proxyChecking: '正在重新检测… 第{n}次', proxyWaiting: '稍后自动重试', proxyAttempts: '已检测 {n} 次，通了会自动恢复',
  connectingTitle: '正在连接 Sunshine',
  unresponsiveTitle: '主机无响应', unresponsiveLine: 'Sunshine 的进程还在运行，但没有回应请求。通常等一会儿就好；一直不好，可以重启 Sunshine。',
}
const EN = {
  pageTitle: 'Sunshine is not responding',
  title: 'Sunshine is not responding',
  line: 'Sunshine is not running, or it does not answer requests.',
  tipsTitle: 'What to check:',
  tips: ['Is the Sunshine service running?', 'Is port {port} free and not blocked?', 'Is the firewall blocking Sunshine?'],
  retry: 'Try again',
  footer: 'This page returns by itself when Sunshine answers.',
  probing: 'Probe {n}: looking for Sunshine...',
  failed: 'Probe {n} failed, trying again in {s} s...',
  awake: 'Sunshine is back. Returning…',
  restart: 'Restart Sunshine', userMode: 'Start in user mode', viewLog: 'View log', runDoctor: 'Run health check',
  retryIn: 'Retry in {s} s', attemptFailed: 'Probe {n} failed',
  restarting: 'Restarting Sunshine...', restartFailed: 'The restart did not work: {message}', restartTimeout: 'Sunshine still does not answer after the restart', troubleshooting: 'Troubleshooting',
  proxyTitle: 'The Sunshine WebUI panel could not be reached', proxyLine: 'A proxy or TUN service may be intercepting localhost, 127.0.0.0/8, or IPv6 loopback traffic. Exclude loopback traffic from the proxy and try again.',
  proxyChecking: 'Checking again… try {n}', proxyWaiting: 'Trying again shortly', proxyAttempts: 'Checked {n} times; it recovers by itself when it answers',
  connectingTitle: 'Connecting to Sunshine',
  unresponsiveTitle: 'The host does not respond', unresponsiveLine: 'The Sunshine process is still running but does not answer requests. Usually it passes; if it does not, restart Sunshine.',
}
/** The tips name the port of the Web UI: the real one when the product knows it (`{ port }`), the default 47990 of the original page otherwise. */
export const offlineTexts = (locale = 'en', { port = 47990 } = {}) => {
  const T = textTable('offline', locale, EN, ZH)
  return { ...T, tips: T.tips.map((tip) => tip.replace('{port}', String(port))) }
}
