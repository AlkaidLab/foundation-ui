import { textTable } from '../locale/texts/index.js'
// The words of the Web UI access scope (MWebAccess): the choice, the address a phone opens, the confirmations. Chinese and English; any other language reads English.

const EN = {
  title: 'Access scope', label: 'Who can open the WebUI panel',
  scopes: { pc: 'This computer', lan: 'Local network', wan: 'Internet' },
  scopeText: {
    pc: 'Only this computer can open the WebUI panel. A phone cannot.',
    lan: 'Phones and computers on the same router can open it, after signing in.',
    wan: 'Anyone on the internet can open the sign-in page. Only the password protects it.',
  },
  streamNote: 'Streaming is not affected by this choice.',
  pcOnly: 'Right now only this computer can open the WebUI panel. Choose Local network to use a phone.',
  phoneTitle: 'Open on a phone', scan: 'Scan with the phone camera', copy: 'Copy', copied: 'Copied', pick: 'Show the code for this address',
  sameWifi: 'The phone must be on the same Wi-Fi as this computer.',
  cert: 'The first visit warns about the certificate: choose to continue.',
  forward: 'From outside, the router must also forward TCP {port} to this computer.',
  noAddress: 'No local network address was reported for this computer.',
  advanced: 'Advanced', advancedShow: 'Show', advancedHide: 'Hide',
  bind: 'Bind address', bindAll: 'All network interfaces', bindManual: 'Type an address', bindField: 'IP address', bindInvalid: 'Not an IP address.', bindAuto: 'All interfaces',
  bindText: 'The host listens only on this address, for the WebUI panel and for streaming. If it is wrong, other devices cannot connect.',
  restartTitle: 'Restart the host to apply', restartText: 'A running stream stops while the host restarts.', restart: 'Restart the host', restarting: 'Restarting…',
  confirmTitle: 'Open the WebUI panel to the internet?', confirmText: 'Anyone on the internet who knows your address can open the sign-in page, and only the password protects it.', confirmYes: 'Continue', confirmNo: 'Cancel',
  finalTitle: 'Note', finalText: 'Once it is open, anyone who guesses the password controls Sunshine on this computer: streams, apps and commands.', finalYes: 'Open to the internet',
  needTitle: 'Set a password first', needText: 'No password is set, so the WebUI panel cannot be opened to the internet.', needGo: 'Set a password', needOk: 'OK',
  failed: 'Could not save.',
}

const ZH = {
  title: '访问范围', label: '谁能打开 WebUI 面板',
  scopes: { pc: '仅本机', lan: '局域网', wan: '公网' },
  scopeText: {
    pc: '只有这台电脑自己能打开 WebUI 面板，手机打不开。',
    lan: '同一个路由器下的手机和电脑登录后可以打开。',
    wan: '互联网上任何人都能打开登录页，只靠密码保护。',
  },
  streamNote: '串流连接不受这个选择影响。',
  pcOnly: '现在只有这台电脑能打开 WebUI 面板。要用手机，请选「局域网」。',
  phoneTitle: '在手机上打开', scan: '用手机相机扫码', copy: '复制', copied: '已复制', pick: '显示这个地址的二维码',
  sameWifi: '手机要和这台电脑连同一个 Wi-Fi。',
  cert: '第一次打开会提示证书不受信任，选择继续访问即可。',
  forward: '从外面访问，还需要路由器把 TCP {port} 转发到这台电脑。',
  noAddress: '没有读到这台电脑的局域网地址。',
  advanced: '高级', advancedShow: '展开', advancedHide: '收起',
  bind: '绑定地址', bindAll: '所有网络接口', bindManual: '手动输入地址', bindField: 'IP 地址', bindInvalid: '不是有效的 IP 地址。', bindAuto: '所有网络接口',
  bindText: '主机只在这个地址上监听，WebUI 面板和串流都一样。选错了，其他设备就连不上。',
  restartTitle: '重启主机后生效', restartText: '主机重启期间，正在进行的串流会中断。', restart: '重启主机', restarting: '正在重启…',
  confirmTitle: '向公网开放 WebUI 面板？', confirmText: '互联网上任何知道你地址的人都能打开登录页，只有密码在保护它。', confirmYes: '继续', confirmNo: '取消',
  finalTitle: '注意', finalText: '开放后，谁猜中密码，谁就能控制这台电脑上的 Sunshine：串流、应用和命令。', finalYes: '确认向公网开放',
  needTitle: '先设置登录密码', needText: '还没有设置密码，不能向公网开放 WebUI 面板。', needGo: '去设置密码', needOk: '知道了',
  failed: '没能保存。',
}

export const webAccessTexts = (locale = 'en') => textTable('webAccess', locale, EN, ZH)
export const WEB_ACCESS_TEXTS = Object.freeze({ en: EN, zh: ZH })
