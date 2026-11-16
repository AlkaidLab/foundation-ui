// The words of the one feedback panel and of what opens it. Chinese is the original, English a plain translation; any other language reads the English.
// The wording rule of the panel: 反馈 everywhere (never 报告给开发者, 提交反馈, 发送反馈给开发者, 反馈此处问题 side by side), what goes with a report is said in one place, and the panel never claims to send what it does not.
const ZH = {
  title: '反馈', button: '反馈', lead: '私下发给开发者，不会公开，不需要账号。',
  context: '自动带上', contextPage: '页面', contextError: '错误',
  typeLabel: '类型', typeBug: '问题/崩溃', typeSuggestion: '功能建议', typeImprove: '体验改进', typeOther: '其他',
  description: '描述', descriptionHint: '发生了什么，你期望什么', descriptionRequired: '请写一句话说明情况',
  attach: '随反馈发送',
  logsTitle: '运行日志', logsText: '反馈会附带已脱敏的运行日志，用于排查问题。点「发送」就是同意发送这些内容，与「问题自动上报」开关无关。',
  shotTitle: '窗口截图', shotText: '已自动遮盖地址、名称和口令。可以预览，不需要时关掉。', preview: '查看将发送的内容', previewHide: '收起', previewTitle: '将发送的内容',
  previewText: '文字', previewPage: '所在页面', previewLogs: '运行日志', previewLogsNote: '日志由主机整理，去除路径、地址、名称和口令后发送；下面是页面最近的几行，作为样例。日志读取失败时只发送文字内容。', previewNone: '没有日志行', previewContact: '联系方式',
  contact: '联系方式（选填）', contactHint: '仅开发者可见，用于回复你。',
  offline: '现在没有网络。反馈会先保存在这台电脑上，联网后自动发送。',
  send: '发送', sendQueue: '保存，联网后发送', sending: '正在发送…', cancel: '取消', close: '关闭', done: '完成',
  saveZip: '保存诊断包到本机', saveZipHint: '只保存文件，不发送', github: '想公开讨论？在 GitHub 提 Issue',
  sentTitle: '已发送', sentText: '已私下发给开发者，只有开发者能看到。', refLabel: '编号',
  queuedTitle: '已保存，联网后自动发送', queuedText: '反馈暂存在这台电脑上，网络恢复后会自己发出，不用再操作。',
  attached: '本次随反馈发送：', attachedText: '文字', attachedLogs: '日志', attachedShot: '截图', attachedContact: '联系方式',
  limited: '发送过于频繁，稍后再试。', rejected: '发送没有被接受，可以先保存诊断包。',
  zipSaved: '诊断包已保存', errorLead: '错误信息会一起带上。',
  decisionCrashTitle: '刚才出现了问题', decisionCrashText: '要把这次的情况告诉开发者吗？', decisionSend: '发送反馈', decisionSkip: '忽略',
  card: '反馈问题或建议', cardText: '私下发给开发者，不需要账号', cardButton: '发送反馈', cardLast: '最近一次：{state} #{ref}', cardLastSent: '已发送', cardLastQueued: '已保存，等待网络',
  errorButton: '反馈这个问题', here: '反馈此处的问题',
  searchTitle: '反馈问题或建议', searchKeywords: '反馈 意见 建议 报告问题 吐槽 联系开发者 bug feedback report suggestion contact developers',
  rowHint: '私下发给开发者，附已脱敏的运行日志',
}
const EN = {
  title: 'Feedback', button: 'Feedback', lead: 'Sent privately to the developers. Nothing is public and no account is needed.',
  context: 'Added automatically', contextPage: 'Page', contextError: 'Error',
  typeLabel: 'Type', typeBug: 'Problem or crash', typeSuggestion: 'Feature request', typeImprove: 'Experience improvement', typeOther: 'Other',
  description: 'Description', descriptionHint: 'What happened, and what you expected', descriptionRequired: 'Write a sentence about what happened',
  attach: 'Sent with the feedback',
  logsTitle: 'Run log', logsText: 'Feedback includes the run log with personal details removed, so the problem can be found. Pressing Send is your consent to send it, whatever the “automatic problem reports” switch says.',
  shotTitle: 'Window screenshot', shotText: 'Addresses, names and secrets are covered. You can preview it and turn it off.', preview: 'See what will be sent', previewHide: 'Hide', previewTitle: 'What will be sent',
  previewText: 'Text', previewPage: 'Page', previewLogs: 'Run log', previewLogsNote: 'The host prepares the log and removes paths, addresses, names and secrets before it is sent. Below are the page’s last lines, as a sample. If the log cannot be read, only the text is sent.', previewNone: 'No log lines', previewContact: 'Contact',
  contact: 'Contact (optional)', contactHint: 'Only the developers see it; used to reply to you.',
  offline: 'There is no network right now. The feedback is kept on this computer and sent by itself when you are online again.',
  send: 'Send', sendQueue: 'Save and send when online', sending: 'Sending…', cancel: 'Cancel', close: 'Close', done: 'Done',
  saveZip: 'Save a diagnostic zip on this computer', saveZipHint: 'Saves a file only, sends nothing', github: 'Prefer a public discussion? Open a GitHub issue',
  sentTitle: 'Sent', sentText: 'Sent privately to the developers. Only they can see it.', refLabel: 'Reference',
  queuedTitle: 'Saved, sends when online', queuedText: 'The feedback is kept on this computer and goes out by itself when the network is back. Nothing more to do.',
  attached: 'Sent with this feedback:', attachedText: 'text', attachedLogs: 'log', attachedShot: 'screenshot', attachedContact: 'contact',
  limited: 'Too many reports in a short time. Try again later.', rejected: 'The feedback was not accepted. You can save a diagnostic zip instead.',
  zipSaved: 'Diagnostic zip saved', errorLead: 'The error details are included.',
  decisionCrashTitle: 'Something went wrong a moment ago', decisionCrashText: 'Do you want to tell the developers what happened?', decisionSend: 'Send feedback', decisionSkip: 'Ignore',
  card: 'Send feedback', cardText: 'Sent privately to the developers, no account needed', cardButton: 'Send feedback', cardLast: 'Last one: {state} #{ref}', cardLastSent: 'sent', cardLastQueued: 'saved, waiting for the network',
  errorButton: 'Report this problem', here: 'Report a problem here',
  searchTitle: 'Send feedback', searchKeywords: 'feedback report suggestion contact developers bug 反馈 意见 建议',
  rowHint: 'Sent privately, with the run log (personal details removed)',
}
const WORDS = { zh: ZH, en: EN }
/** The words for a locale: Chinese for zh*, English for everything else. */
export function feedbackTexts(locale = 'en') { return /^zh/i.test(String(locale)) ? ZH : EN }
export const FEEDBACK_LOCALES = Object.freeze(Object.keys(WORDS))
export const fillText = (text, values) => String(text).replace(/\{(\w+)\}/g, (_, k) => (values[k] ?? ''))
