# Web UI and control panel: what each has

The Web UI's options match the control panel's, except what needs the local Tauri side: the virtual display driver's control, the local USB/IP, the panel's own settings, the
window and the tray, and local file access. A setting that is stored in the Sunshine configuration is never panel-only. The control panel shows the Web pages for everything in the
Sunshine configuration (the settings, clients, applications, downloads, password, logs), so those are the same page by construction.

Web rail (2026-11-02, `views/WebShell.vue`): 概览, 串流, 串流设置, 输入与外设, 显示, 系统, 帮助与关于: the panel's rail without 米塔 AI and 面板设置, with the same names, order, icons and list-pane rows.

## Destinations and pages

| Panel destination or page | Web counterpart | Panel-only? |
|---|---|---|
| 概览 (the card home) | 概览, the same card home (`MHomeDash`) with the same catalogue | Cards with a local source are panel-only: 温度 (HWiNFO), USB 设备, the USB/IP and signed-driver component cards (shown with "no data" in the Web UI) |
| 串流 > 客户端 | 串流 > 客户端 | no, the Web page is the panel's page |
| 串流 > 串流应用 | 串流 > 应用程序 | no |
| 串流 > 下载客户端 | 串流 > 下载客户端 | no |
| 串流设置 (常规, 配置文件, 高级, 输入, 音频/视频, 网络, 编码器) | 串流设置, the same list and pages | no: every key is in the Sunshine configuration |
| 串流设置 > 个性化 | 串流设置 > 个性化 | no (the appearance is kept per interface) |
| 串流设置 > 更改密码 | 串流设置 > 更改密码 | no |
| 输入与外设 > 手柄 (DualSense and the gamepad type) | 输入与外设 > 手柄 (the 输入 page at the gamepad block) | no: the tuning is stored by the host |
| 输入与外设 > 麦克风 (backend, status, sound path) | 输入与外设 > 麦克风 (the microphone page of 音频/视频: backend choice and live status from `/api/microphone/status`) | The "test the microphone" action and the virtual device driver are panel-only: they need the local audio and the driver |
| 输入与外设 > USB 设备 | none | **panel-only**: the local USB/IP driver and attach/detach are Tauri commands on this machine |
| 显示 > 虚拟显示器 (mode, resolutions, refresh rates, HDR) | 显示 > 虚拟显示器 (the virtual display page of 音频/视频) | The driver itself (install, update, start, stop, calibration run, trace) is **panel-only**: it needs the local driver; its settings in the configuration are not |
| 显示 > 画质增强 | none | **panel-only**: the in-session overlay, shortcuts and components are Tauri-side |
| 系统 > 组件状态 | 系统 > 组件状态 | Rows for the USB/IP and signed drivers read local state: **panel-only data**, the Web UI says so on the row |
| 系统 > 诊断与日志 | 系统 > 诊断与日志 | The diagnostics bundle is saved by the browser here and by a Tauri command in the panel; both exist |
| 系统 > 工具箱 (launch ControllerMeta, stylus test, timer, latency test) | none | **panel-only**: it starts local programs |
| 米塔 AI (chat, provider settings, desktop pet, screen vision) | the diagnosis assistant inside 系统 > 诊断与日志 | The assistant for a log works over the Web (the browser calls the provider with the person's key), so it is there, without its own rail item. The chat page needs the panel's stored provider settings and the pet and screen vision need Tauri: **panel-only** |
| 面板设置 > 个性化 | 串流设置 > 个性化 | no |
| 面板设置 > 语言 | 串流设置 > 常规 > language | no |
| 面板设置 > 软件更新 (channel, version, check) | 帮助与关于 (the version and the check; the install is the panel's) | The install and restart are **panel-only** |
| 面板设置 > 外观 export and import of the theme | none yet | not panel-only: a gap (the same JSON file can be offered by the Web UI) |
| 面板设置 > 启动, 通知, 大屏模式 | none | **panel-only**: start with Windows, desktop notifications, big screen mode and the gamepad cursor act on the local desktop |
| 面板设置 > 启动助手, 文件夹共享 | none | **panel-only**: local file access (paths of helpers, shared folders, the Explorer menu) |
| 面板设置 > 桌宠, 高级 (developer mode, text context, the panel's log level) | none | **panel-only** |
| 面板设置 > 剪贴板同步 | none | **panel-only**: the local clipboard |
| 面板设置 > 账户 (用户名与密码, 退出登录) | 串流设置 > 更改密码, 退出登录 in the account menu | no |
| 面板设置 > 维护 (cover cache, restart as administrator) | none | **panel-only**: local files and the process |
| 帮助与关于 > 关于 (version, update check, thanks, licences) | 帮助与关于 > 关于 | no |
| 帮助与关于 > 新手引导, 下载客户端, 赞助, 官网, 诊断 | the guide, 串流 > 下载客户端, the sponsor sheet, links | no |
| Window, tray, minimise to tray, the caption bar | none | **panel-only** |
| Search (pages, settings, actions, clients, applications, tiles) | the same search | no |

## What the Web rail changed

| Before | Now |
|---|---|
| 概览 / 串流 / 设置 / 帮助 | 概览 / 串流 / 串流设置 / 输入与外设 / 显示 / 系统 / 帮助与关于 |
| 设置 list: the settings and 更改密码 | 串流设置: the same list |
| 帮助 list: 故障排除, 组件状态, 关于 | 系统: 组件状态, 诊断与日志; 帮助与关于: 关于 |
| (the gamepad and the microphone were rows of the settings) | 输入与外设: 手柄, 麦克风 (the settings pages at those places; their addresses are `/config#tab=input&focus=ds5-block` and `/config#tab=av&sub=microphone`) |
| (the virtual display was a section of 音频/视频) | 显示: 虚拟显示器 (`/config#tab=av&sub=virtual`) |
