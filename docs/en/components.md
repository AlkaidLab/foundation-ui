# Components

`foundation-ui/vue` exports 212 components. Consumers must compile `md-*` tags as custom elements (see [Getting started](getting-started.md)).

## General components

| Component | Purpose |
| --- | --- |
| `MIcon` | Material Symbols icon. |
| `MButton` | Button: filled, tonal, outlined, text, danger and warning; five sizes, toggle and busy states. |
| `MIconButton` | Round icon-only button. |
| `MFab` | Floating action button. |
| `MFabMenu` | FAB that opens a short list of related actions. |
| `MSplitButton` | Main action plus a menu of related actions. |
| `MSeg` | Connected button group (single choice) or toggle group (`multiple`). |
| `MChip` | Chip with tone and icon. |
| `MChipRow` | Chips on one line; overflow collapses into a "+N" chip. |
| `MChipSet` | Presets as chips, one choice or several. |
| `MMenuChip` | Chip that opens a menu. |
| `MSwitch` | Expressive switch. |
| `MSlider` | Expressive slider in five track sizes. |
| `MProgress` | Wavy progress for work of known length. |
| `MLoading` | Loading indicator for short waits. |
| `MBadge` | Dot or count badge. |
| `MBanner` | Banner for a problem that needs a decision. |
| `MSnackbar` | Short confirmation with an optional action. |
| `MNotice` | Inline notice: info, warning or error. |
| `MEmpty` | Empty state. |
| `MDialog` | Dialog with a fixed title and actions and a scrolling body. |
| `MSheet` | Side sheet, bottom sheet or centred dialog. |
| `MPickSheet` | Searchable sheet for choosing from a long list. |
| `MMenu` | Material 3 vertical menu. |
| `MContextMenu` | One context menu for the whole window. |
| `MOverflow` | The ⋮ button with its menu. |
| `MInfo` | Help behind an info icon. |
| `MToolbar` | Floating toolbar. |
| `MEditToolbar` | Floating toolbar for the edit mode of a tile page. |
| `MNav` | Navigation: side rail on wide screens, bottom bar on narrow ones. |
| `MRail` | Navigation rail (collapsed and expanded) or bottom bar. |
| `MNavList` | List pane of categories. |
| `MScene` | Adaptive list-detail / supporting-pane layout from the back stack. |
| `MSceneFab` | The page’s main action in the dock of MScene. |
| `MPage` | One page of the detail pane with header and back arrow. |
| `MSection` | Section label. |
| `MGroup` | Group (card) of rows. |
| `MItem` | List row: title, supporting line, leading and trailing slots. |
| `MSwitchItem` | Row with a switch. |
| `MSliderItem` | Row with a slider. |
| `MCheckItem` | Expandable check result row. |
| `MChoiceItem` | Row showing the current value; opens a radio-list dialog. |
| `MChoiceCards` | Large cards, one per option, with a preview. |
| `MValueItem` | Row showing a value; opens an edit dialog. |
| `MValueDialog` | Dialog for a text or number setting. |
| `MFieldItem` | Form field row. |
| `MField` | Text field (single or multi-line) with supporting and error text. |
| `MListEditor` | Editable list of values. |
| `MPathItem` | Path field with a browse button. |
| `MSplitItem` | Row split into an action area and a settings gear. |
| `MMasterSwitch` | Large master switch of a feature. |
| `MExpertItem` | Expert row with its explanation. |
| `MExpander` | Expander for rarely used settings. |
| `MFooter` | Footer note. |
| `MHero` | Callout block with a shape icon, title and text. |
| `MActions` | Floating action buttons above a section. |
| `MCoverGrid` | Cover-art grid. |
| `MCarousel` | Snapping multi-browse carousel. |
| `MTable` | Data table with sortable columns. |
| `MMarkdown` | Safe Markdown renderer (no raw HTML). |
| `MSkeleton` | Skeleton rows. |
| `MPageLoading` | Skeleton of a settings page. |
| `MSwatches` | Colour swatch radio group. |
| `MUpdatedStamp` | “Updated 3 min ago” stamp that keeps itself current. |
| `MStat` | Live number with unit. |
| `MRoll` | Rolling numerals. |
| `MSparkline` | Sparkline. |
| `MGauge` | Gauge. |
| `MArcGauge` | 240° arc gauge with zones. |
| `MRing` | Progress or donut ring. |
| `MBar` | Thick value bar. |
| `MInlineBar` | Bar inside a table cell or row. |
| `MChart` | Detail chart with scale and time range. |
| `MChartX` | Line, area, stacked, bar and mirrored charts. |
| `MEventStrip` | Events as marks on a time axis. |
| `MHeatStrip` | Calendar heat strip. |
| `MTimerRing` | Circular timer. |
| `MClockDial` | Analogue clock. |
| `MPinPad` | PIN pad. |
| `MPinEntry` | Four-digit PIN boxes with a button. |
| `MWelcome` | First-run page in the style of Android setup flows. |
| `MBrand` | Product icon and name lockup. |
| `MMascot` | Mascot image sized to its slot. |
| `MScallop` | Rotating scalloped shape. |
| `MStatusPill` | Status capsule with action buttons. |
| `MStatusPills` | Row of labelled status pills. |
| `MGithubMark` | GitHub mark. |
| `MBilibiliMark` | Bilibili mark. |

## Product components

Feature pages and cards shared by Foundation Panel and the Foundation Sunshine Web UI, grouped by area.

| Group | Purpose | Components |
| --- | --- | --- |
| Navigation chrome | Caption bar, global back, version, status and search. | `MCaption` `MCaptionVersion` `MCaptionBack` `MBackChip` `MCaptionAvatar` `MStatusBell` `MSponsorButton` `MUnifiedSearch` `MSearchResults` |
| Host plumbing | Mount once in the app shell: notifications, dialogs, pending changes, context menu, error surface. | `MNotifyHost` `MDialogHost` `MPendingHost` `MPageBanners` `MContextProvider` `MPinHost` `MErrorHost` `MErrorCentre` `MStartupProblems` `MHostOffline` `MMenuPopup` `MCoachMarks` `MOnboardWindow` |
| Tile kit | Building blocks of home-page tiles (docs/tile-kit.md). | `MTile` `MTileGrid` `MTileChart` `MTileShape` `MTileNumeral` `MTileChip` `MTileRing` `MTileStack` `MTileEmpty` `MTileHead` `MTileCover` |
| Home dashboard | Dashboard cards, catalogue and layout (docs/home-dashboard.md). | `MHomeDash` `MDashSkeleton` `MDashCard` `MDashCardView` `MDashCatalogue` `MDashCurve` `MDashHero` `MDashStrip` `MDashSwitch` `MDashInfo` `MDashTable` `MDashApps` `MDashVdd` `MDashGuide` `MDashDownload` `MDashSponsor` `MDashComponent` `MDashWidget` `MDashJourney` `MPromo` `MStarPrompt` `MClientPrompt` |
| Tray and menus | Tray menu, quick panel and their settings (models in `foundation-ui/tray`). | `MTrayMenu` `MTrayRow` `MTraySliders` `MTrayPopup` `MTraySettings` `MTrayLayoutEditor` `MTrayThumb` |
| First-run guide | Setup flow and its steps. | `MGuideFlow` `MHomeGuide` |
| Announcements, support, update | Announcement strip, sheet, page and popup; support and update sheets; about page. | `MAnnouncementStrip` `MAnnouncementSheet` `MAnnouncementPopup` `MAnnouncementButton` `MAnnouncementPage` `MSupportSheet` `MUpdateSheet` `MSourceList` `MAbout` `MLinkActions` |
| Clients and pairing | Client downloads, connect dialog, pairing. | `MClientTag` `MClientCard` `MClientAssets` `MOsChips` `MConnectDialog` `MConnectPanel` `MPairPrompt` |
| Network and remote access | Reachability verdicts, endpoints, remote-access flows and web access. | `MReachCard` `MReachVerdict` `MReachOverview` `MPublicEndpoints` `MEndpointList` `MNetworkOverview` `MRemoteAccess` `MRemotePublic` `MRemoteWindow` `MWebAccess` |
| Display and stream settings | Virtual-display and display-mode controls, HDR status, appearance, DualSense pages. | `MVirtualDisplay` `MVddDevice` `MDisplayCards` `MPrepArt` `MPrepSeg` `MModeCard` `MModeChips` `MModePicker` `MModeList` `MModeListDialog` `MModeListRow` `MFpsPresets` `MHdrStatus` `MAppearance` `MControllerArt` `MDsPlot` `MLightbar` `MLaunchSplash` `MLatencyClock` |
| Diagnostics and developer | Doctor, logs, service and component status, diagnostics export, feedback, developer page. | `MDoctor` `MLogViewer` `MDiagnostics` `MDiagExport` `MServiceStatus` `MComponentStatus` `MFeedbackRow` `MFeedbackAccount` `MDeveloperPage` `MTestTools` `MInstaller` `MRoute` |
| Sign-in | Sign-in and security pages. | `MLoginPage` `MSecurityLogin` |

The same entry point also exports composables and logic modules (`useTiles`, `useAnnouncements`, `createNav`, `calculateScene` and others); the full list is `src/vue/index.js`.
