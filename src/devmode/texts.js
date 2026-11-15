// The words of the developer-mode pages and flows. Chinese is the original, English a plain translation; any other language reads English.
const ZH = {
  rail: '开发者', railDot: '有新动态',
  pages: { issues: 'Issue 与 PR', logs: '实时日志', api: 'API 检查器', flags: '功能开关', build: '构建与组件', tests: '测试工具', options: '开发者选项' },
  lines: { issues: '我们自己的仓库', logs: '面板与主机的日志', api: '只读查看主机 API', flags: '浮层与动画速度', build: '版本、提交与环境', tests: '触发错误、模拟主机状态', options: '调试、WebView、数据、更新' },
  hub: '开发者',
  // Issue 与 PR
  tabs: { issue: 'Issues', pr: 'PR', mine: '我的反馈' },
  allRepos: '全部仓库', open: '打开', closed: '已关闭', search: '搜索标题、编号或标签', searchIn: '在 {where} 中搜索', searchAll: '在 {n} 个仓库中搜索',
  reposN: '{n} 个仓库', refresh: '刷新', retry: '重试', loadMore: '加载更多', shownOf: '已显示 {n}',
  signedAs: '已登录 {login}', signedOut: '未登录 GitHub', signedOutSub: '公开仓库无需登录即可查看，创建 Issue 需要登录 GitHub', signedSub: '已登录，可以创建 Issue', connect: '登录 GitHub', disconnect: '退出登录', notConfigured: '未配置',
  stampOk: '已登录', stampOffline: '离线', emptyNone: '没有内容', stampCache: '显示缓存内容', stampPublic: '公开仓库 · 只读',
  rateTitle: 'GitHub 公共访问额度已用尽', rateNote: 'GitHub 公共访问额度已用尽，登录 GitHub 后可查看最新内容。', rateNoteComments: 'GitHub 公共访问额度已用尽，登录 GitHub 后可查看最新评论。', rateNoteSigned: 'GitHub 访问额度已用尽。', rateSoon: '即将恢复', rateReset: '约 {m} 分钟后恢复',
  offlineText: '网络不可用，显示的是 {ago}保存的内容', offlineNone: '网络不可用，且没有缓存内容', errorText: 'GitHub 请求失败（状态码 {status}）', forbiddenText: '该仓库为私有仓库，需要登录有访问权限的 GitHub 账号', authText: 'GitHub 登录已失效', reconnect: '重新登录',
  emptyIssues: '没有符合条件的 Issue', emptyPr: '没有符合条件的 PR', emptyMine: '尚未提交过反馈', loading: '加载中…',
  stOpen: '打开', stClosed: '已关闭', stMerged: '已合并', stDraft: '草稿',
  comments: '{n} 条评论', commentOne: '1 条评论', openOnGithub: '在 GitHub 打开', copyLink: '复制链接', copied: '已复制', reportIssue: '报告问题', sendFeedback: '提交反馈',
  pickOne: '选择一项以查看', bodyEmpty: '没有说明。', bodyCut: '内容已截断，完整内容见 GitHub。', back: '返回列表',
  // the reader of one item
  closeReader: '关闭', fullRead: '全屏阅读', fullExit: '退出全屏阅读', openedAt: '打开于 {when}', authorTag: '作者',
  commentsTitle: '评论 {n}', commentsLoading: '正在加载评论…', commentsFail: '无法加载评论', commentsAll: '显示全部 {n} 条评论', commentsHidden: '（已折叠 {n} 条）', commentsFold: '收起评论', commentsMore: '另有 {n} 条评论未显示，',
  mineSent: '已发布 #{n}', mineSaved: '已保存到本机', mineQueued: '未发送（无网络）',
  // the report
  errTitle: '报告问题', fbTitle: '提交反馈', previewTitle: '将要发送的内容',
  errLead: '已截取窗口并附上日志，个人信息已自动去除。发送前可逐项查看，取消不需要的项目。', fbLead: '描述遇到的问题或建议，可选择附上截图和日志。',
  fSubject: '标题', draftError: '错误', draftPage: '页面', draftVersion: '版本', draftSteps: '复现步骤：', draftLogs: '—— 发生错误时的日志 ——', fContent: '内容', fContentHint: '实际情况与期望结果', fContact: '联系方式（可选）', fSubjectHint: '用一句话概括问题',
  repo: '提交到', attach: '随报告附上', aShot: '窗口截图', aShotSub: '出错时的窗口', aLogs: '日志', aLogsSub: '最近的面板与主机日志', aDump: '崩溃转储', aDumpSub: '可能包含内存中的数据，默认不附带',
  aRisk: '有风险', aUnavailable: '此环境不能截图', aAuto: '已脱敏', aShotNote: '已自动遮盖敏感位置，可在预览中框选更多区域', aEmpty: '没有可附的内容',
  redacted: '已去除 {n} 处个人信息', redactedNone: '没有发现需要去除的内容', rPaths: '路径', rIps: '地址', rNames: '名称', rSecrets: '口令与证书',
  preview: '预览', previewHide: '收起预览', previewNote: '以下为将要发送的文字，附件见上方列表。',
  dest: '发送方式', destLocal: '下载诊断包并打开网页 Issue', destLocalSub: '无需账号。诊断包保存在本机，网页 Issue 已填好标题和内容，附件需手动拖入。',
  destGithub: '用我的 GitHub 账号发送', destGithubSub: '以你的账号创建 Issue；附件存放在私有存储，到期后删除。', destAnon: '匿名发送给开发者', destAnonSub: '仅发送文字，不含截图和日志。',
  destGithubOff: 'GitHub 登录服务尚未配置', destSignIn: '需要先登录 GitHub',
  send: '发送', autoSend: '以后自动发送', sendLocal: '下载并打开 Issue 页面', sending: '正在发送…', cancel: '取消', close: '关闭', done: '完成', copyText: '复制文字', download: '下载诊断包',
  sentTitle: '已发送', sentGithub: '已创建 {slug}#{n}', sentAnon: '已发送给开发者', sentLocal: '诊断包已保存，Issue 页面已打开', sentLocalNote: '将诊断包拖入 Issue 页面的编辑框即可作为附件。', queuedTitle: '没有发出', queuedText: '网络不可用，未能发送。可联网后重试，或改为下载诊断包。',
  limited: '发送过于频繁，稍后可重试', rejected: '发送未被接受，可改为下载诊断包', signedoutText: 'GitHub 登录已失效',
  expires: '附件到期后自动删除', mustTitle: '标题不能为空', mustDesc: '说明不能为空',
  // sign-in
  siTitle: '登录 GitHub', siLead: '用你的 GitHub 账号提交 Issue。仅申请读取仓库列表和创建 Issue 的权限，可随时退出登录。', siCodeHead: '在 GitHub 输入此代码', siOpen: '打开 github.com/login/device', siCopyCode: '复制代码',
  siWaiting: '等待在 GitHub 确认', siWaitingSub: '确认后将自动继续', siExpiresIn: '{m} 分 {s} 秒后失效', siStep1: '复制代码', siStep2: '在 GitHub 输入', siStep3: '回到这里',
  siDenied: 'GitHub 授权已被拒绝', siExpired: '代码已失效', siAgain: '重新获取代码', siOffline: '网络不可用，无法连接授权服务', siError: '授权服务无响应', siOpenFailed: '没有自动打开浏览器。复制代码，在浏览器中访问 github.com/login/device。', siCopyFailed: '复制失败，请手动选中代码', offlineHost: '无法连接 {host}',
  siPermIssues: '创建 Issue', siPermIssuesSub: '仅限我们自己的仓库', siPermRead: '读取仓库、Issue 与 PR', siPermReadSub: '用于列表和私有仓库', siPermNot: '不会读取你的代码，也不会写入其他仓库',
  siOffTitle: 'GitHub 登录服务尚未配置', siOffText: '登录需要授权服务（Worker）和 GitHub App，目前均未配置。仍可下载诊断包并打开网页 Issue。',
  siDone: '已登录 {login}', siDoneText: '现在可以用此账号提交 Issue。',
  // context menu
  ctxSection: '开发者', ctxDevtools: '开发者工具', ctxDevtoolsHint: '按 F12 打开浏览器的开发者工具', ctxReport: '就此处报告问题', ctxCopyRoute: '复制当前路由', ctxDevtoolsFail: '此窗口无法打开开发者工具',
  // pages
  logsLive: '实时', logsPause: '暂停', logsResume: '继续', logsClear: '清空视图', logsCopy: '复制', logsNone: '没有日志', logsFilter: '过滤', logsLevels: { error: '错误', warn: '警告', info: '信息', debug: '调试' }, logsMore: '只显示最近 {n} 行',
  apiRead: '读取', apiPath: '路径', apiHidden: '密码、令牌和证书内容已隐藏', apiCopy: '复制响应', apiNone: '选择一个端点，或输入以 /api/ 开头的路径', apiBad: '该路径不可读取',
  buildCopy: '复制环境信息', buildCopyTip: '复制内容为固定的英文键值格式，便于粘贴到问题报告', buildNotInstalled: '未安装', buildComponent: '组件', buildVersion: '版本', buildCommit: '提交', buildEnvironment: '本机环境', buildComponents: '组件', envTitle: '环境', buildPanel: '控制面板', buildUi: 'Foundation UI',
  testsError: '触发错误对话框', testsErrorSub: '预览一键报告', testsHost: '模拟主机状态', testsTelemetry: '发送测试事件', testsPreviewPayload: '预览错误报告载荷',
  flagsHint: '浮层仅在开发者模式开启时生效。',
  // 模拟主机状态: a choice with a confirm step, a banner while it runs, the chip in the header of every developer page
  simNone: '未模拟', simOffline: '离线', simStopped: '已停止', simUnresponsive: '无响应', simRow: '最长 60 秒，到时自动结束', simActive: '模拟中：{kind} · 还剩 {s} s',
  simConfirmTitle: '模拟「{kind}」？', simConfirmOffline: '面板会表现得像主机已离线：需要主机的页面显示离线状态页。', simConfirmStopped: '面板会表现得像主机意外停止：弹出「Sunshine 意外停止」的错误界面。', simConfirmUnresponsive: '面板会表现得像主机在运行但没有响应：需要主机的页面显示无响应状态页。',
  simConfirmTail: '最长 60 秒后自动结束，也可以随时结束。主机本身不受影响。', simStart: '开始模拟', simFailed: '无法开始模拟',
  simBanner: '正在模拟：{kind}', simBannerText: '{s} s 后自动结束', simChip: '模拟中 · {kind} · {s} s', simChipEnd: '结束',
  testSending: '发送中', testSent: '已发送', testFailed: '发送失败',
  // 账号与反馈 (every user), the redaction preview and the mask tool
  acctTitle: '账号与反馈', acctGithub: 'GitHub 账号', acctSigned: '已登录 {login}', acctSignedSub: '反馈将以此账号提交', acctOut: '未登录 GitHub', acctOutSub: '登录后可以用你的账号提交反馈', acctOff: 'GitHub 登录服务尚未配置', disconnectGithub: '退出 GitHub 登录', feedbackRow: '提交反馈', feedbackRowSub: '发送前可预览并确认', feedbackHere: '反馈此处问题',
  sendSignIn: '登录 GitHub 后发送',
  rSerials: '序列号', rRegions: '截图区域已遮盖',
  maskTitle: '遮盖截图', maskHint: '拖动框选需要额外遮盖的区域。自动遮盖的区域无法取消。', maskUndo: '撤销', maskClear: '清除手动遮盖', maskAuto: '自动遮盖 {n} 处', maskManual: '手动遮盖 {m} 处', maskNone: '没有自动遮盖的区域', maskSent: '这是将要发送的图片', maskFailed: '遮盖失败，未附上截图', maskAlt: '将要发送的截图',
  // the report goes to the developers privately (user_report), never to a public issue
  typeLabel: '类型', typeBug: '问题/崩溃', typeSuggestion: '功能建议', typeImprove: '体验改进', typeOther: '其他', destOurs: '私下发送给开发者', destOursSub: '发到开发者自己的服务器（api.alkaidlab.com），不会创建任何公开的 Issue，也不需要账号。截图和日志不会发送。', destSaveZip: '保存诊断包到本机', destSaveZipSub: '只保存文件：不发送，也不打开任何网页。截图和日志会放进诊断包。', sendSaveZip: '保存诊断包', sentOurs: '已私下发送给开发者', sentLocal2: '诊断包已保存', savedTitle: '已保存', errorsOff: '错误报告已关闭，无法发送。请在「关于 › 隐私」中开启，或保存诊断包。', attachLocalOnly: '截图和日志不会发送；它们只会放进保存到本机的诊断包。',
}
const EN = {
  rail: 'Developer', railDot: 'New activity',
  pages: { issues: 'Issues and PRs', logs: 'Live log', api: 'API inspector', flags: 'Feature switches', build: 'Builds and components', tests: 'Test tools', options: 'Developer options' },
  lines: { issues: 'Our own repositories', logs: 'Panel and host log', api: 'Read-only view of the host API', flags: 'Overlays and animation speed', build: 'Versions, commits, environment', tests: 'Trigger errors, simulate host states', options: 'Debug, WebView, data, update' },
  hub: 'Developer',
  tabs: { issue: 'Issues', pr: 'PRs', mine: 'My feedback' },
  allRepos: 'All repositories', open: 'Open', closed: 'Closed', search: 'Search title, number or label', searchIn: 'Search in {where}', searchAll: 'Search in {n} repositories',
  reposN: '{n} repositories', refresh: 'Refresh', retry: 'Retry', loadMore: 'Load more', shownOf: '{n} shown',
  signedAs: 'Signed in as {login}', signedOut: 'Not signed in to GitHub', signedOutSub: 'Public repositories are visible without signing in. Sign in to create issues.', signedSub: 'Signed in. You can create issues.', connect: 'Sign in to GitHub', disconnect: 'Sign out', notConfigured: 'Not configured',
  stampOk: 'Signed in', stampOffline: 'Offline', emptyNone: 'Nothing to show', stampCache: 'Showing cached content', stampPublic: 'Public repositories · read only',
  rateTitle: 'GitHub public access limit reached', rateNote: 'The GitHub public access limit has been reached. Sign in to GitHub to see the latest content.', rateNoteComments: 'The GitHub public access limit has been reached. Sign in to GitHub to see the latest comments.', rateNoteSigned: 'The GitHub access limit has been reached.', rateSoon: 'Resets soon', rateReset: 'Resets in about {m} min',
  offlineText: 'No network connection. Showing content saved {ago}.', offlineNone: 'No network connection and no cached content', errorText: 'The GitHub request failed (status {status})', forbiddenText: 'This is a private repository. Sign in with a GitHub account that has access.', authText: 'The GitHub sign-in has expired', reconnect: 'Sign in again',
  emptyIssues: 'No matching issues', emptyPr: 'No matching pull requests', emptyMine: 'No feedback sent yet', loading: 'Loading…',
  stOpen: 'Open', stClosed: 'Closed', stMerged: 'Merged', stDraft: 'Draft',
  comments: '{n} comments', commentOne: '1 comment', openOnGithub: 'Open on GitHub', copyLink: 'Copy link', copied: 'Copied', reportIssue: 'Report a problem', sendFeedback: 'Send feedback',
  pickOne: 'Select an item to read', bodyEmpty: 'No description.', bodyCut: 'The text is truncated. The full text is on GitHub.', back: 'Back to the list',
  closeReader: 'Close', fullRead: 'Full-screen reading', fullExit: 'Exit full-screen reading', openedAt: 'opened {when}', authorTag: 'Author',
  commentsTitle: 'Comments {n}', commentsLoading: 'Loading comments…', commentsFail: 'Comments could not be loaded', commentsAll: 'Show all {n} comments', commentsHidden: '({n} folded)', commentsFold: 'Fold the comments', commentsMore: '{n} more comments are not shown. ',
  mineSent: 'Published #{n}', mineSaved: 'Saved on this computer', mineQueued: 'Not sent (no network)',
  errTitle: 'Report a problem', fbTitle: 'Send feedback', previewTitle: 'What will be sent',
  errLead: 'The window was captured and the log attached. Personal data was removed automatically. Review each item before sending and clear what you do not want to include.', fbLead: 'Describe the problem or suggestion. You can attach a screenshot and the log.',
  fSubject: 'Title', draftError: 'Error', draftPage: 'Page', draftVersion: 'Version', draftSteps: 'Steps to reproduce:', draftLogs: '-- Log at the time of the error --', fContent: 'Details', fContentHint: 'What happened and what you expected', fContact: 'Contact (optional)', fSubjectHint: 'Summarise the problem in one line',
  repo: 'Send to', attach: 'Attached', aShot: 'Window screenshot', aShotSub: 'The window at the time of the error', aLogs: 'Log', aLogsSub: 'Recent panel and host log', aDump: 'Crash dump', aDumpSub: 'May contain data from memory; off by default',
  aRisk: 'Risk', aUnavailable: 'This environment cannot take a screenshot', aAuto: 'Redacted', aShotNote: 'Sensitive areas are covered automatically. Drag boxes in the preview to cover more.', aEmpty: 'Nothing to attach',
  redacted: '{n} personal items removed', redactedNone: 'Nothing needed removing', rPaths: 'paths', rIps: 'addresses', rNames: 'names', rSecrets: 'secrets',
  preview: 'Preview', previewHide: 'Hide the preview', previewNote: 'This is the text that will be sent. Attachments are listed above.',
  dest: 'How to send', destLocal: 'Download the diagnostics zip and open a web issue', destLocalSub: 'No account needed. The zip is saved on this computer and the web issue opens with the title and text filled in. Drag the zip in to attach it.',
  destGithub: 'Send with my GitHub account', destGithubSub: 'Creates the issue under your account. Attachments are kept in private storage and deleted after a while.', destAnon: 'Send to the developers anonymously', destAnonSub: 'Text only, without the screenshot and log.',
  destGithubOff: 'GitHub sign-in is not configured', destSignIn: 'Sign in to GitHub first',
  send: 'Send', autoSend: 'Send automatically from now on', sendLocal: 'Download and open the issue page', sending: 'Sending…', cancel: 'Cancel', close: 'Close', done: 'Done', copyText: 'Copy text', download: 'Download the zip',
  sentTitle: 'Sent', sentGithub: 'Created {slug}#{n}', sentAnon: 'Sent to the developers', sentLocal: 'The zip is saved and the issue page is open', sentLocalNote: 'Drag the zip into the editor of the issue page to attach it.', queuedTitle: 'Not sent', queuedText: 'No network connection, so it was not sent. Try again when online, or download the zip instead.',
  limited: 'Sending too often. Try again later.', rejected: 'The report was not accepted. Download the zip instead.', signedoutText: 'The GitHub sign-in has expired',
  expires: 'Attachments are deleted after a while', mustTitle: 'A title is required', mustDesc: 'A description is required',
  siTitle: 'Sign in to GitHub', siLead: 'Submit issues under your GitHub account. Only the permissions to read the repository list and create issues are requested. You can sign out at any time.', siCodeHead: 'Enter this code on GitHub', siOpen: 'Open github.com/login/device', siCopyCode: 'Copy the code',
  siWaiting: 'Waiting for confirmation on GitHub', siWaitingSub: 'This continues automatically once you confirm', siExpiresIn: 'Expires in {m} min {s} s', siStep1: 'Copy the code', siStep2: 'Enter it on GitHub', siStep3: 'Come back here',
  siDenied: 'Authorization was declined on GitHub', siExpired: 'The code expired', siAgain: 'Get a new code', siOffline: 'No network connection. The authorization service cannot be reached.', siError: 'The authorization service did not respond', siOpenFailed: 'The browser did not open. Copy the code and go to github.com/login/device in a browser.', siCopyFailed: 'Copying failed. Select the code by hand.', offlineHost: 'Could not reach {host}',
  siPermIssues: 'Create issues', siPermIssuesSub: 'Our own repositories only', siPermRead: 'Read repositories, issues and PRs', siPermReadSub: 'For the lists and the private repository', siPermNot: 'Your code is not read and no other repository is written',
  siOffTitle: 'GitHub sign-in is not configured', siOffText: 'Signing in needs the authorization service (a Worker) and a GitHub App, and neither is configured. You can still download the zip and open a web issue.',
  siDone: 'Signed in as {login}', siDoneText: 'You can now submit issues under this account.',
  ctxSection: 'Developer', ctxDevtools: 'Developer tools', ctxDevtoolsHint: 'Press F12 for the browser developer tools', ctxReport: 'Report this in an issue', ctxCopyRoute: 'Copy current route', ctxDevtoolsFail: 'Developer tools cannot be opened in this window',
  logsLive: 'Live', logsPause: 'Pause', logsResume: 'Resume', logsClear: 'Clear the view', logsCopy: 'Copy', logsNone: 'No log entries', logsFilter: 'Filter', logsLevels: { error: 'Error', warn: 'Warn', info: 'Info', debug: 'Debug' }, logsMore: 'Only the last {n} lines',
  apiRead: 'Read', apiPath: 'Path', apiHidden: 'Passwords, tokens and certificates are hidden', apiCopy: 'Copy the response', apiNone: 'Select an endpoint or enter a path that starts with /api/', apiBad: 'This path is not readable',
  buildCopy: 'Copy environment info', buildCopyTip: 'The copied text is a fixed English key=value format, for pasting into issue reports', buildNotInstalled: 'Not installed', buildComponent: 'Component', buildVersion: 'Version', buildCommit: 'Commit', buildEnvironment: 'This machine', buildComponents: 'Components', envTitle: 'Environment', buildPanel: 'Control panel', buildUi: 'Foundation UI',
  testsError: 'Trigger the error dialog', testsErrorSub: 'Preview the one-click report', testsHost: 'Simulate a host state', testsTelemetry: 'Send a test event', testsPreviewPayload: 'Preview an error report payload',
  flagsHint: 'The overlays only apply while developer mode is on.',
  simNone: 'Not simulating', simOffline: 'Offline', simStopped: 'Stopped', simUnresponsive: 'Not responding', simRow: 'Ends by itself after 60 s at most', simActive: 'Simulating: {kind} · {s} s left',
  simConfirmTitle: 'Simulate “{kind}”?', simConfirmOffline: 'The panel acts as if the host were offline: the pages that need the host show the offline page.', simConfirmStopped: 'The panel acts as if the host had stopped unexpectedly: the “Sunshine stopped unexpectedly” error surface opens.', simConfirmUnresponsive: 'The panel acts as if the host were running but not responding: the pages that need the host show the not-responding page.',
  simConfirmTail: 'It ends by itself after 60 s at most, or whenever you end it. The host itself is not touched.', simStart: 'Start the simulation', simFailed: 'Could not start the simulation',
  simBanner: 'Simulating: {kind}', simBannerText: 'Ends in {s} s', simChip: 'Simulating · {kind} · {s} s', simChipEnd: 'End',
  testSending: 'Sending', testSent: 'Sent', testFailed: 'Send failed',
  acctTitle: 'Account and feedback', acctGithub: 'GitHub account', acctSigned: 'Signed in as {login}', acctSignedSub: 'Feedback is submitted under this account', acctOut: 'Not signed in to GitHub', acctOutSub: 'Sign in to submit feedback under your own account', acctOff: 'GitHub sign-in is not configured', disconnectGithub: 'Sign out of GitHub', feedbackRow: 'Send feedback', feedbackRowSub: 'You can preview and confirm before it is sent', feedbackHere: 'Report a problem here',
  sendSignIn: 'Sign in to GitHub to send',
  rSerials: 'serials', rRegions: 'screenshot regions masked',
  maskTitle: 'Mask the screenshot', maskHint: 'Drag a box over any other area to cover. The automatic boxes cannot be removed.', maskUndo: 'Undo', maskClear: 'Clear my boxes', maskAuto: '{n} covered automatically', maskManual: '{m} covered by hand', maskNone: 'Nothing was covered automatically', maskSent: 'This is the exact image that will be sent', maskFailed: 'Masking failed, so no screenshot is attached', maskAlt: 'The screenshot that will be sent',
  // the report goes to the developers privately (user_report), never to a public issue
  typeLabel: 'Type', typeBug: 'Problem or crash', typeSuggestion: 'Feature request', typeImprove: 'Experience improvement', typeOther: 'Other', destOurs: 'Send privately to the developers', destOursSub: 'Goes to the developers\' own server (api.alkaidlab.com). No public issue is created and no account is needed. The screenshot and the log are not sent.', destSaveZip: 'Save the diagnostic zip on this computer', destSaveZipSub: 'Only saves the file: nothing is sent and no page opens. The screenshot and the log go into the zip.', sendSaveZip: 'Save the zip', sentOurs: 'Sent privately to the developers', sentLocal2: 'The zip is saved', savedTitle: 'Saved', errorsOff: 'Error reports are switched off, so the report cannot be sent. Turn them on in About › Privacy, or save the zip.', attachLocalOnly: 'The screenshot and the log are not sent; they only go into the zip saved on this computer.',
}
import { canonicalLocale } from '../locale/texts/resolve.js'
import { DEVMODE_LOCALES } from './locales.js'

const deep = (a, b) => {
  const o = { ...a }
  for (const k of Object.keys(b || {})) {
    const v = b[k]
    o[k] = v && typeof v === 'object' ? deep(a[k] || {}, v) : v
  }
  return o
}
export const devmodeTexts = (locale = 'en') => {
  const code = canonicalLocale(locale)
  if (code === 'zh') return { ...EN, ...ZH }
  if (code === 'en' || code === 'en_GB' || code === 'en_US') return EN
  const base = code === 'zh_TW' ? { ...EN, ...ZH } : EN
  const extra = DEVMODE_LOCALES[code]
  return extra ? deep(base, extra) : base
}
export const fillText = (text, values = {}) => String(text).replace(/\{(\w+)\}/g, (_, k) => (values[k] ?? ''))
