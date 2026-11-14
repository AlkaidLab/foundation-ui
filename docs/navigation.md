# Navigation and the caption bar

## Global back, three variants

After a jump between areas (体检 → 打开设置 → 网络, a home tile → its settings) the person can go back to where they were. One app-wide stack
(`createJumpHistory`, `src/nav/jumpHistory.js`) keeps the places left by a jump; a move the person makes (rail, list row, search) clears it; the page's own
sub-page back arrow is not part of it. Three looks share that stack:

| variant | what the person sees |
|---|---|
| A (default) | a round back button at the far left of the caption bar, left of the logo; enabled only when there is a place to go back to; tooltip 「返回：<页面名>」; Alt+Left and the system back (mouse button, gesture) take the same step |
| B | no button; after a jump a chip 「← 返回<页面名>」 at the top of the page; it disappears when the person navigates elsewhere |
| C | A and B together |

Choose one: add `?back=A`, `?back=B` or `?back=C` to the address (the Web UI in a browser), or set it in 开发者选项 › 全局返回 (stores
`foundation.back.variant` in the local storage; the panel has no address bar, so use the developer option there). The address wins over the stored choice.
A phone keeps its bottom bar and its page back arrow: the chip of B and C is drawn there too (it is the only form that fits), the button of A is not (no room in the caption bar).

## The version in the caption bar

`MCaptionVersion` (after the product name): the short version (`2026.1107`), a 测试版 tag for a pre-release build, a click or Enter copies the full version, channel,
commit, build time, package and system for a bug report. `src/about/titleVersion.js` is the one formatter (`shortVersion`, `titleVersionView`, `reportText`). A waiting
update adds 「有更新可用」 with the new short version (opens 软件更新) and a red dot on the navigation item that holds 软件更新; the state is `src/update/notice.js`
(remembered from the update checks that already run, nothing is asked again). A phone shows the same line at the top of 更多 (panel); the Web UI has no 更多 on a phone, its 帮助与关于 destination is the 关于 page, which already shows the version row and the update button.
