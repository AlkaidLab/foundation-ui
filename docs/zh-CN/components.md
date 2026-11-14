# 组件

`foundation-ui/vue` 导出 212 个组件。使用方需把 `md-*` 标签编译为自定义元素（见[快速开始](getting-started.md)）。

## 通用组件

| 组件 | 用途 |
| --- | --- |
| `MIcon` | Material Symbols 图标。 |
| `MButton` | 按钮：填充、淡色、描边、文字、危险、警告；五种尺寸，支持切换与忙碌状态。 |
| `MIconButton` | 图标按钮。 |
| `MFab` | 悬浮操作按钮。 |
| `MFabMenu` | 展开一组相关操作的悬浮按钮。 |
| `MSplitButton` | 主操作加相关操作菜单的拆分按钮。 |
| `MSeg` | 连接按钮组（单选），或切换按钮组（`multiple`）。 |
| `MChip` | 带色调与图标的标签。 |
| `MChipRow` | 单行标签，放不下的折叠为“+N”。 |
| `MChipSet` | 预设标签集，单选或多选。 |
| `MMenuChip` | 点开菜单的标签。 |
| `MSwitch` | Expressive 开关。 |
| `MSlider` | Expressive 滑块，五种轨道尺寸。 |
| `MProgress` | 已知进度的波浪进度条。 |
| `MLoading` | 短时等待的加载指示器。 |
| `MBadge` | 圆点或计数角标。 |
| `MBanner` | 需要用户决定的问题横幅。 |
| `MSnackbar` | 带可选操作的简短提示。 |
| `MNotice` | 行内提示：信息、警告或错误。 |
| `MEmpty` | 空状态。 |
| `MDialog` | 标题与操作固定、正文滚动的对话框。 |
| `MSheet` | 侧边面板、底部面板或居中对话框。 |
| `MPickSheet` | 带搜索的长列表选择面板。 |
| `MMenu` | Material 3 竖向菜单。 |
| `MContextMenu` | 整个窗口共用的右键菜单。 |
| `MOverflow` | ⋮ 按钮及其菜单。 |
| `MInfo` | 信息图标背后的帮助。 |
| `MToolbar` | 悬浮工具栏。 |
| `MEditToolbar` | 磁贴页编辑模式的悬浮工具栏。 |
| `MNav` | 导航：宽屏为侧栏，窄屏为底栏。 |
| `MRail` | 导航栏（收起与展开）或底栏。 |
| `MNavList` | 分类列表窗格。 |
| `MScene` | 依据返回栈在列表-详情、辅助窗格间自适应的布局。 |
| `MSceneFab` | MScene 底部停靠区的页面主操作。 |
| `MPage` | 详情窗格的一页，含标题与返回箭头。 |
| `MSection` | 分区标题。 |
| `MGroup` | 一组行（卡片）。 |
| `MItem` | 列表行：标题、说明行、前后插槽。 |
| `MSwitchItem` | 带开关的行。 |
| `MSliderItem` | 带滑块的行。 |
| `MCheckItem` | 可展开的检查结果行。 |
| `MChoiceItem` | 显示当前值，点开单选对话框的行。 |
| `MChoiceCards` | 每个选项一张带预览的大卡片。 |
| `MValueItem` | 显示数值，点开编辑对话框的行。 |
| `MValueDialog` | 文本或数字设置的对话框。 |
| `MFieldItem` | 表单字段行。 |
| `MField` | 文本框（单行或多行），带说明与错误文字。 |
| `MListEditor` | 可编辑的值列表。 |
| `MPathItem` | 带浏览按钮的路径字段。 |
| `MSplitItem` | 主区域加设置齿轮的拆分行。 |
| `MMasterSwitch` | 功能总开关。 |
| `MExpertItem` | 带说明的高级行。 |
| `MExpander` | 低频设置的展开区。 |
| `MFooter` | 页脚说明。 |
| `MHero` | 带形状图标、标题与正文的提示块。 |
| `MActions` | 分区上方的悬浮操作按钮。 |
| `MCoverGrid` | 封面网格。 |
| `MCarousel` | 吸附滚动的多项轮播。 |
| `MTable` | 可排序的数据表。 |
| `MMarkdown` | 安全的 Markdown 渲染（不输出原始 HTML）。 |
| `MSkeleton` | 骨架行。 |
| `MPageLoading` | 设置页骨架。 |
| `MSwatches` | 色板单选组。 |
| `MUpdatedStamp` | 自动保持最新的“更新于”时间戳。 |
| `MStat` | 带单位的实时数值。 |
| `MRoll` | 滚动数字。 |
| `MSparkline` | 迷你折线图。 |
| `MGauge` | 仪表。 |
| `MArcGauge` | 带分区的 240° 弧形仪表。 |
| `MRing` | 进度环或环形图。 |
| `MBar` | 粗数值条。 |
| `MInlineBar` | 表格单元内的数值条。 |
| `MChart` | 带刻度与时间范围的详情图表。 |
| `MChartX` | 折线、面积、堆叠、柱状与镜像图表。 |
| `MEventStrip` | 时间轴上的事件标记。 |
| `MHeatStrip` | 日历热力条。 |
| `MTimerRing` | 环形计时器。 |
| `MClockDial` | 模拟时钟。 |
| `MPinPad` | PIN 键盘。 |
| `MPinEntry` | 四位 PIN 输入框与按钮。 |
| `MWelcome` | Android 开机向导风格的首次运行页。 |
| `MBrand` | 产品图标与名称组合。 |
| `MMascot` | 随尺寸取图的吉祥物。 |
| `MScallop` | 缓慢旋转的波浪边形状。 |
| `MStatusPill` | 带操作按钮的状态胶囊。 |
| `MStatusPills` | 带标签的状态胶囊行。 |
| `MGithubMark` | GitHub 标志。 |
| `MBilibiliMark` | 哔哩哔哩标志。 |

## 产品功能组件

Foundation Panel 与 Foundation Sunshine Web UI 共用的功能页面与卡片，按功能分组。

| 分组 | 说明 | 组件 |
| --- | --- | --- |
| 窗口框架 | 标题栏、全局返回、版本、状态与搜索。 | `MCaption` `MCaptionVersion` `MCaptionBack` `MBackChip` `MCaptionAvatar` `MStatusBell` `MSponsorButton` `MUnifiedSearch` `MSearchResults` |
| 宿主挂载件 | 在应用外壳挂载一次：通知、对话框、待保存更改、右键菜单、错误面板。 | `MNotifyHost` `MDialogHost` `MPendingHost` `MPageBanners` `MContextProvider` `MPinHost` `MErrorHost` `MErrorCentre` `MStartupProblems` `MHostOffline` `MMenuPopup` `MCoachMarks` `MOnboardWindow` |
| 磁贴套件 | 首页磁贴的构件（docs/tile-kit.md）。 | `MTile` `MTileGrid` `MTileChart` `MTileShape` `MTileNumeral` `MTileChip` `MTileRing` `MTileStack` `MTileEmpty` `MTileHead` `MTileCover` |
| 首页仪表盘 | 仪表盘卡片、目录与布局（docs/home-dashboard.md）。 | `MHomeDash` `MDashSkeleton` `MDashCard` `MDashCardView` `MDashCatalogue` `MDashCurve` `MDashHero` `MDashStrip` `MDashSwitch` `MDashInfo` `MDashTable` `MDashApps` `MDashVdd` `MDashGuide` `MDashDownload` `MDashSponsor` `MDashComponent` `MDashWidget` `MDashJourney` `MPromo` `MStarPrompt` `MClientPrompt` |
| 托盘与菜单 | 托盘菜单、快捷面板及其设置（模型见 `foundation-ui/tray`）。 | `MTrayMenu` `MTrayRow` `MTraySliders` `MTrayPopup` `MTraySettings` `MTrayLayoutEditor` `MTrayThumb` |
| 首次运行引导 | 设置向导及各步骤。 | `MGuideFlow` `MHomeGuide` |
| 公告、支持与更新 | 公告条、面板、页面与弹窗；支持与更新面板；关于页。 | `MAnnouncementStrip` `MAnnouncementSheet` `MAnnouncementPopup` `MAnnouncementButton` `MAnnouncementPage` `MSupportSheet` `MUpdateSheet` `MSourceList` `MAbout` `MLinkActions` |
| 客户端与配对 | 客户端下载、连接设备对话框、配对。 | `MClientTag` `MClientCard` `MClientAssets` `MOsChips` `MConnectDialog` `MConnectPanel` `MPairPrompt` |
| 网络与远程访问 | 可达性结论、地址列表、远程访问流程与 Web 访问。 | `MReachCard` `MReachVerdict` `MReachOverview` `MPublicEndpoints` `MEndpointList` `MNetworkOverview` `MRemoteAccess` `MRemotePublic` `MRemoteWindow` `MWebAccess` |
| 显示与串流设置 | 虚拟显示器与显示模式控件、HDR 状态、外观、DualSense 页面。 | `MVirtualDisplay` `MVddDevice` `MDisplayCards` `MPrepArt` `MPrepSeg` `MModeCard` `MModeChips` `MModePicker` `MModeList` `MModeListDialog` `MModeListRow` `MFpsPresets` `MHdrStatus` `MAppearance` `MControllerArt` `MDsPlot` `MLightbar` `MLaunchSplash` `MLatencyClock` |
| 诊断与开发者 | 体检、日志、服务与组件状态、诊断导出、反馈、开发者页。 | `MDoctor` `MLogViewer` `MDiagnostics` `MDiagExport` `MServiceStatus` `MComponentStatus` `MFeedbackRow` `MFeedbackAccount` `MDeveloperPage` `MTestTools` `MInstaller` `MRoute` |
| 登录 | 登录与安全页面。 | `MLoginPage` `MSecurityLogin` |

同一入口还导出组合式函数与逻辑模块（`useTiles`、`useAnnouncements`、`createNav`、`calculateScene` 等），完整列表见 `src/vue/index.js`。
