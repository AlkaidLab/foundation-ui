# Home dashboard

One home for the control panel and the Web UI: `MHomeDash` in `foundation-ui/vue`, driven by a model that `buildHomeModel()`
produces from normalised host data. The two products differ only in where the data comes from.

## Layout

Four columns from 860 px wide (eight half-units), two from 640 px, one below. Compact density when the window is shorter than 824 px
or narrower than 1040 px. Rows have different heights on purpose:

1. Hero (two columns) and two curve cards. While streaming the curves are bitrate and frame rate, otherwise CPU and GPU load.
2. Control strip: a segmented group (gamepad type) and switch cards, only for settings that apply immediately.
3. Info cards: encoder, display, memory, devices (gamepad, microphone, USB). A card without a source is left out.
4. Table (paired clients, recent sessions, error log) beside the application list. While the setup is new the "get started" card and the
   download promo take this row (`guide` prop and slot).

Every card with detail has a chevron that opens a sheet (scaled chart, donut, rows). Edit mode hides and reorders cards inside their row
type (`useDashLayout`, stored per interface).

## Input of `buildHomeModel(input, texts)`

| Field | Meaning |
| --- | --- |
| `host` | `{ name, platform?, version?, uptimeMs?, running?, update? }` |
| `session` | `{ client_name, app_name, width, height, fps, codec, enable_hdr, enable_mic, bitrate (kbit/s), packet_loss, dropped_frames, fpsMeasured, latencyMs, latencyP95Ms, latencyLastMs, capture, uptimeMs }` or null |
| `sessionCount` | number of running sessions |
| `series` | `{ bitrate (kbit/s), fps, cpu, gpu }` arrays of samples |
| `sys` | `{ cpu, gpu, gpuName, memTotal, memAvail, memProcess? }` or null (older host, remote browser) |
| `encoder`, `display`, `pads`, `mic`, `usb` | labels; `display`: `{ hdr, hdrText, nits, vddText, vddTone, width, height, hz }` |
| `clients`, `apps`, `logs`, `recent` | table and list data; `parseErrorLog` and `parseSessionLog` read the host log |
| `canAct`, `busy` | whether the hero button may act |

`homeTexts(locale)` returns the text table (English; Chinese for `zh*`; other locales fall back to English).

## Sources

| Card | Control panel | Web UI |
| --- | --- | --- |
| Sessions, bitrate, fps | `/api/runtime/sessions`, `/api/perf/current` through the local proxy | the same, directly |
| CPU, GPU | Tauri command `system_load` (GetSystemTimes, PDH GPU engine counters) | `/api/runtime/system` |
| Memory | `get_process_memory_info` | `/api/runtime/system` |
| Paired clients, apps | `/api/clients/list`, `/api/apps` | the same |
| Recent sessions, error log | `CLIENT CONNECTED` / `CLIENT DISCONNECTED` and `Error:` lines of `/api/logs` | the same |
| Gamepad type | `get_controller_hub_config` / `save_controller_hub_config` | `/api/gamepad/config` |
| HDR, virtual display, microphone | runtime state of the panel | `/api/runtime/hdr-calibration`, `/api/vdd/status`, `/api/microphone/status` |

Nothing is invented: a card without data is not drawn, a field without a source is not shown.

## Get started card

Steps: download a control app, add the computer and pair, set the first picture quality, connect to the desktop, add a game. Ticks from
real data: paired clients > 0; a session was seen (running now, or in the log, remembered locally); an application other than the three
built-in ones (`src_assets/windows/assets/apps.json`). The first and third steps are ticked by hand. The card disappears when every step
is ticked or when hidden, and comes back through `useGuideCard(key).reopen()` (help page).

## Announcements

See `announcements.md`. The strip shows the highest-priority unread item; the list sheet shows every active item including read ones; the
rail shows the unread count.

## Controls on the home

The home strip holds no switch of its own that stands for a setting with several options. The virtual display has several, so its card shows the state only (`vdd`); the control card for it will be the shared virtual display control of the settings once `foundation-ui` exports it. The same rule applies to every control card: it is the tier-1 control of the setting (`src/settings/meta.js`), not a copy. The microphone switch and the gamepad type group are still the home's own until their shared controls are exported.
