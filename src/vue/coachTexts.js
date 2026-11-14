import { textTable } from '../locale/texts/index.js'
// The words of the first-use tour (MCoachMarks): one sentence per element. Chinese and English; any other language reads English.
const EN = {
  next: 'Next', done: 'Got it', skip: 'Skip', rerun: 'Show the tour', rerunText: '',
  steps: {
    rail: { title: 'The sidebar', text: 'Everything is sorted here: streaming, host settings, input, display and system. On a narrow window it is the bar at the bottom.' },
    search: { title: 'Search everything', text: 'Press Ctrl+K at any time to find a setting, a page or an action by what it does.' },
    overview: { title: 'The overview', text: 'These tiles show how the host is doing right now: the picture, the clients, the components.' },
    edit: { title: 'Make it yours', text: 'The pencil lets you add, move and resize tiles, and pin the settings you use most.' },
    pair: { title: 'Connect a device', text: 'Scan the code with a client or type the PIN it shows, right here.' },
    config: { title: 'Host settings', text: 'General, network, security and sign-in: the options of this host itself. Resolution, encoders and audio are in Display & video and Audio.' },
    system: { title: 'When something is wrong', text: 'Component status and Diagnostics and logs show what is missing or failing, and how to fix it.' },
    help: { title: 'Help and about', text: 'The version, the guide and feedback. To see these tips again, choose "Show the tour" here.' },
  },
}
const ZH = {
  next: '下一个', done: '知道了', skip: '跳过', rerun: '重新看导览', rerunText: '',
  steps: {
    rail: { title: '导航栏', text: '功能都在这里分好类：串流、主机设置、输入与外设、显示、系统。窗口很窄时，它是底部的那一排。' },
    search: { title: '搜索一切', text: '随时按 Ctrl+K，按它的作用就能找到设置、页面和操作。' },
    overview: { title: '概览', text: '这些磁贴显示主机现在的状况：画面、客户端、各个组件。' },
    edit: { title: '按你的习惯来', text: '点铅笔可以添加、移动和调整磁贴大小，也能把常用的设置固定在这里。' },
    pair: { title: '连接设备', text: '在这里用客户端扫二维码，或输入它显示的 PIN。' },
    config: { title: '主机设置', text: '常规、网络、安全与登录：这台主机自己的选项。分辨率、编码器和音频在“显示与视频”“音频”里。' },
    system: { title: '出问题时看这里', text: '“组件状态”和“诊断与日志”会告诉你缺了什么、哪里出错，以及怎么修。' },
    help: { title: '帮助与关于', text: '版本、引导和反馈。想再看一遍这些提示，在这里选“重新看导览”。' },
  },
}
export const coachTexts = (locale) => textTable('coach', locale, EN, ZH)
