# 显示与视频: the tree

Approved design. The tree is data (`src/settings/displayTree.js`); the Web page, the control panel hub, the search index, the old-address redirects and the mapping table are read from it.

| # | place (`sub` of the tab `display`) | sections |
|---|---|---|
| 1 | `output` 显示器 | 输出显示器 · 显示模式 · 显示器配置 · 无头模式 · 高级 |
| 2 | `modes` 分辨率与刷新率 | 分辨率策略 · 支持的分辨率 · 支持的刷新率 |
| 3 | `hdr` HDR | HDR (status card + allow HDR) · 系统 HDR · 校准 · 高级 |
| 4 | `quality` 画质增强 | 降噪 (control panel page) |
| 5 | `encoders` 编码与码率 | 码率 · 视频格式 · 编码器 · 生效配置 · 高级 (only the active vendor) |
| 6 | `virtual` 基地虚拟显示器 | 设备 · 相关设置 |
| 7 | `advanced` 高级 | 捕获 · 显卡 · 兼容性 · 同步与特殊 · 重置本组 |

Rules: one home per setting key (`homeOf`); a row elsewhere is a shortcut that writes the same key (`shortcuts` in the tree); old addresses redirect (`#tab=display&sub=video` → `advanced`, a key in the address decides the place of a moved setting).

```
node scripts/display-mapping.mjs          # the old→new table, from code
npm test                                  # test/displaytree.test.js: every old key is in the tree exactly once
```

Components: `MDisplayCards` (display arrangement), `MModeCard` (resolution, refresh rate and scaling sliders with a live value line), `MPrepSeg` (display configuration with diagrams), `MHdrStatus`, `MModePicker` (supported resolutions and refresh rates: common values as a checklist, a custom value in one row, the list clients are offered below; `MModeChips` and the popup `MModeListDialog` stay for the surfaces that edit both lists together), `MVddDevice`, `MExpander`; `MChoiceCards` for the video format and the encoder, `MStatusPills` for 生效配置.
