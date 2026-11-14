# Common tasks: how many steps from the overview

Counted from the structure of the interface (not timed), for the default layout of the overview, in the control panel; the Web UI is the same except that its
rail is the page list. A step is one click or tap that changes what is on screen or acts; typing is not counted, a confirmation dialog is one step. "Search" is
Ctrl K, the words, Enter (3 key presses, 1 step for the person who has the search open).

"Before" is the interface of the round before the pins and the quick row (2026-11-02); "Now" counts only what is merged in the repositories; what is not merged yet is marked **planned**.

| # | Task | Before | Now | Next |
|---|---|---|---|---|
| 1 | Pair a client by PIN | 2 (tile: field, 配对) | 2 | 0 when the client asks (pairing prompt on any page), 2 from the caption button |
| 2 | Pair by QR | 0 to show it (the tile draws it), 1 to open the QR sheet | 0 | QR only where the client reads it (see below) |
| 3 | Download a client | 2 (tile: device chip, 下载) | 2 (the page: system chip, then the card with its QR) | 1: one recommended card per device |
| 4 | Start a stream check | 4 (rail 帮助与关于, 欢迎, step list, 连接) | 1 with the quick row (merged with the pins work) | – |
| 5 | Change the bitrate ceiling | 3 (rail 串流设置, 音频/视频, the slider) | 3; 1 as a pinned slider tile | pin it from the row |
| 6 | Change resolution or fps | not a host setting (the client asks for them) | – | – |
| 7 | Switch the encoder | 3 (rail, 编码器, choice) | 3; the encoder tile opens the page in 1 | – |
| 8 | Switch the gamepad type | 1 (strip on the overview) | 1 | – |
| 9 | Mic on or off | 1 (strip on the overview) | 1 | – |
| 10 | Virtual display on or off, its mode | 2 (tile, then its control) | 2 | – |
| 11 | Add an app | 3 (rail 串流, 串流应用, 添加新应用) | 2 (the button is fixed at the bottom right of the page) | 1 as a pinned action tile |
| 12 | View the log or report a problem | 2 (rail 系统, 日志) | 1 with the quick row | – |
| 13 | Check for updates | 2 (the host card, the version sheet) | 1 with the quick row | – |
| 14 | Change wallpaper or theme | 2 (rail 面板设置, 个性化) | 2; 1 as a pinned selector tile | – |
| 15 | Restart Sunshine | 2 (the host card button, the confirmation) | 1 with the quick row, then the confirmation | – |
| 16 | First time: download and pair | 4 steps and 3 decisions (device type, which client, PIN or QR) | 4 and 2 (the page recommends by system) | journey card: 3 steps, 1 decision (the device) |

## Pairing by QR: which clients read it

What the host puts in the QR (`POST /api/qr-pair`, src/confighttp/clients.cpp): `moonlight://pair?host=<LAN address>&port=<port>&pin=<pin>&name=<host name>`, valid for 120 s.

Checked in the sources of the clients (2026-11-03, default branches):
- Moonlight V+ Android (qiin2333/moonlight-vplus): reads it. `PcView.kt` has a QR scan entry (`ADD_PC_QR_SCAN_ID`, `startQrScan`) and `handleQrPairResult` accepts exactly the scheme `moonlight` with the host `pair` and the query parameters `host`, `port`, `pin`, adds the computer and pairs.
- Moonlight V+ desktop (qiin2333/moonlight-qt): no QR or `moonlight://` handling found; pairing is by the PIN (`app/cli/pair.cpp` is a command line pair).
- Moonlight macOS Enhanced (skyhua0224/moonlight-macos-enhanced): no URL scheme in its Info.plist and no QR code in the source tree; PIN only.
- VoidLink (iOS, Apple TV), Moonlight V+ HarmonyOS, 王冠版, 包子版: sources not read; assumed PIN only. A QR is therefore shown for the Android client only.
- Not verified: whether an installed older build of V+ Android has the scan entry; the checks read the current source.

What the host knows about a paired client: its name and UUID (`GET /api/clients/list`, `named_certs`). Nothing says which app made it. The fingerprint rules
(AlkaidLab/sunshine-client-fingerprint-rules) are a warning-only feed for forks of a known unauthorised client; the match is a tray warning of the host and is not
kept or served per client. A list of paired clients cannot honestly be marked "official" or "third party" from what the host has now: that needs the host to keep
the client family it saw at pairing (the extra query arguments the V+ clients send, `virtualDisplay`, `devicenickname`, `UIScale`) in the client's record.

## Round 11 and 12: what changed, merged and planned

Merged (commits in foundation-ui, the Web UI and the control panel):

| # | Task | Now |
|---|---|---|
| 17 | Pair from the overview | the compact pairing tile (PIN field, QR where the client reads it): 2; the journey card while no client is paired: 3 steps |
| 18 | Pair from any other page | 2: the caption button 连接设备, the dialog, the PIN; 0 for the person when the client asks (the prompt comes forward, one PIN field) |
| 19 | Download from the overview | the tile: the system chip, 下载 (1 after choosing the system once; the choice is remembered); copy the link or share it by QR: +1 |
| 20 | Download from any other page | 2: the caption button, the 安装客户端 tab; search 下载 or 配对 gives the same dialog first |
| 21 | First time: download and pair | the journey: system, install, pair, done (3 decisions fewer than before: the device's system only) |
| 22 | Download for another device | 复制链接 (the link of 下载 exactly) or 分享 (QR and the system share sheet) beside every file |
| 23 | Pin a setting or an action to the overview | a row's ⋮ menu, a right click or a long press, or the pin button of a search result: 1 |

Planned (decided, not merged or not verifiable yet):

- The third-party client tip ("this client is not ours") is **not built**: it needs the host to record the client family at pairing (the extra query arguments of the V+ clients). Deferred until then.
- The native tray menu and system notification of the pairing prompt are written; the Windows build of the tray entries is **planned** (the Windows VM is off; Linux does not build the app).
- Smart tiles and the sections layout are documented in `docs/home-tiles.md`; the step counts of the common tasks on a smart overview change with the scenario and are not counted here.
