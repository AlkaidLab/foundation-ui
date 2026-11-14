# The virtual display control

One control for the virtual display (杂鱼虚拟显示器), shared by the settings page and the home. It lives in `foundation-ui`:

```js
import { MVirtualDisplay, createVddStore, createHttpVddAdapter, vddTexts, VDD_MODES } from 'foundation-ui/vue'
```

| Export | What it is |
|---|---|
| `MVirtualDisplay` | the control. `variant="settings"` is the whole page body, `variant="card"` is the mode selector, the status, the resolution handling and a "more options" button (`@more`). Props: `store`, `variant`, `locale`. Slots: `notice` (driver missing), `prep` (the product's own picker for physical display handling, with `value` and `update`), `expert` (tier 3 rows) |
| `createVddStore(adapter, { autosave })` | state and saving, once per product. A settings page and a home card that get the same store share the state; `set(patch, { save })` and `setMode(mode, { save })` decide per placement whether to save at once (a card) or leave it to the page's save bar |
| `createHttpVddAdapter({ fetchJson, setProtected, status })` | an adapter for a product with no configuration object of its own (the control panel's home): reads `/api/config` fresh, posts the whole configuration with the changed keys |
| `vddTexts(locale)` | the texts (Chinese and English; every other language reads English) |
| `VDD_MODES`, `vddModeOf`, `vddPatchForMode`, `vddSummary`, `vddStatusOf`, `VDD_KEYS`, `VDD_PROTECTED` | the pure model (`src/settings/virtualDisplay.js`), tested in `test/virtualdisplay.test.js` |

## The mode (tier 1)

| Mode | Writes |
|---|---|
| physical display | `output_name` = the display the person had (or empty = automatic) |
| virtual, on demand | `output_name = ZakoHDR`, `vdd_keep_enabled` off |
| virtual, always on | `output_name = ZakoHDR`, `vdd_keep_enabled` on |

Options of a virtual mode (tier 2): one display for all clients (`vdd_reuse`), make one when the host has none (`vdd_headless_create`), what happens to the physical displays (`display_device_prep`), resolution and refresh rate handling (`resolution_change`, `refresh_rate_change`, with `manual_resolution` and `manual_refresh_rate`), follow host resolution changes (`dynamic_resolution_follow_display`). Expert (tier 3, by slot): Vulkan HDR bridge, NVIDIA vsync.

## Saving, and the two keys the tray owns

The host's `/api/config` save skips `vdd_keep_enabled` and `vdd_headless_create` on purpose (`protectedFields` in `config.cpp`: the tray owns them). They are written through the tray route `POST /api/tray/action` (`vdd_toggle_keep_enabled`, `vdd_toggle_headless_create`), which only the control panel can reach (its local token). So the adapter has an optional `setProtected(key, enabled)`:

- control panel (and the Web page inside its frame): the Tauri commands `set_vdd_keep_enabled` and `set_vdd_headless_create_enabled`; `enabled` is a real boolean;
- plain browser: no writer. The always-on mode is listed but cannot be chosen, headless create is read-only, both with a one-line note. Everything else saves normally.

## For a home card

```js
// once per product, next to the other stores
const adapter = createHttpVddAdapter({ fetchJson, setProtected, status })   // panel home
await adapter.load()
const store = createVddStore(adapter)
// in the card
<MVirtualDisplay :store="store" variant="card" :locale="locale" @more="openSettings('av', 'virtual')" />
```

In the Web UI the store is `useVddSettings()` (`composables/useVddSettings.js`): it reads and writes the shared configuration object, so the settings page and the home see the same values; the home's variant saves with `store.set(patch, { save: true })` (the card variant does this itself), which calls the page's own `save()`.
