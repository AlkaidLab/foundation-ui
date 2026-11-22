# Help tiles: the four tiles at the top of 帮助与关于

`MHelpTiles` (`foundation-ui/vue`) is the row of four small tiles that opens 帮助与关于 in the control panel and in the Web UI: 软件更新, 主机体检, 反馈问题, 客户端下载. It is the small tile of the
overview (`.m-tile .m-cal .m-calm`, its header and its type roles from [the tile kit](tile-kit.md)), so a change of the tile type ramp reaches it. What each tile shows is
`src/helpTiles/model.js` (pure, `foundation-ui/help-tiles`); its words are `src/helpTiles/texts.js` (20 languages, per-key fallback to English).

## Anatomy

Header (glyph and name), one value, one state line, one action. The whole tile is the button; the action in its corner says what a press does. Every state fills the same lines and the tile
is a square, so its size never depends on its state (the update tile has the same five lines in all of its five states).

| Tile | Value | State line (main · second part) | Action | Accent |
|---|---|---|---|---|
| 软件更新 | the installed version in its short form (`2026.1122`), the version that waits when one does | 已是最新 · time of the check / 有新版本 / 正在检查… / 检查失败 / 尚未检查 | 检查更新 (idle, up to date), 更新 (opens the update sheet), 重试 (failed), none while checking | tertiary container while an update waits (the tile keeps its size); warn when the check failed |
| 主机体检 | 正常, or the number of items that need a look with 项待处理; 未体检 before the first run | the time of the last check | 开始体检 / 重新体检 | ok, warn or error by the worst result |
| 反馈问题 | the answers not opened yet (`2 条新回复`); else the number of reports this window sent (`3 条已提交`); with no report: the action itself (the feedback glyph and 写反馈), no line of copy | the title of the newest answer; or the state of the newest report (处理中, 已回复, 已修复) · its age | 查看回复 (opens the answer), 写反馈 (opens the form) | primary while answers wait |
| 客户端下载 | the system the person chose for connecting a device, with the client recommended for it as the state line; before a choice: the action itself (the download glyph and its word) | the recommended client | 下载 | none |

A tile never carries a line that is copy (a slogan, a promise about privacy): it states what is true now, or it is its own action. What the feedback tile reads is what the window kept (`feedback/replies.js`: the
keys and titles of its own reports, the answers that came back); it asks nothing itself. The privacy words belong in the form.

## What leaves first

The second part of the state line (a time) leaves first: it wraps off the one line that shows when it does not fit, no script. The action's words leave next (at a tile under 134 px the action is its
arrow alone, the tile is still the button). The value shrinks only down to a floor of 20 px and never wraps; a version longer than the tile ends in an ellipsis. A name never breaks inside a word.

## Layout

At 628 px of page width and more (4 × 148 px, the overview's standard unit, and 3 × 12 px gaps): one row of four. Narrower: two by two, each at most 196 px, so a phone shows the tiles at its own
size and a tablet that cannot fit four does not stretch two. The order is the order of the row: 软件更新 first.

## What a product gives it

`update` { state, installed, next, checkedAt } (the product's own check; the tile asks nothing), `doctor` (the summary MDoctor keeps; read from the storage when left out), (the feedback tile reads the window's own reply state).
Events: `check`, `open-update`, `doctor`, `downloads`. 反馈问题 opens the form itself and shows only where a form host is mounted (as the old row did).
Acting on an available update is opening it: `noticeAfterTile(noticeState, tile)` puts the update dot out for that version (`update/notice.js`); a newer version brings it back.
`MIconButton` takes a `badge` ('dot' or a count) for the 关于 button of the rail; `aboutLine(installed, update, texts)` is the second line of the 关于 row ("2026.1122 · 有新版本").
The tiles belong on 帮助与关于 only: the About page (`MAbout`) keeps its own layout, version, update section, privacy and licences, with no tiles.
