# Getting started

[Documentation](../../README.md#documentation) · **Getting started** · [Theming and tokens](theming-and-tokens.md) · [Components](components.md) · [Testing](testing.md)

## Requirements

- Vue 3.5 or newer in the application.
- A bundler that resolves package `exports` and compiles Vue single-file components (the gallery of this repository uses Vite with `@vitejs/plugin-vue`).
- Node 20 or newer for the tests.

## Install

Foundation UI is not published to npm. Clone it next to the application as `ds5-ui-m3e`, and install its dependencies in the clone (a `file:` dependency is linked, not copied, so its own dependencies must be present there):

```sh
git clone https://github.com/AlkaidLab/foundation-ui ../ds5-ui-m3e
npm --prefix ../ds5-ui-m3e ci
```

In the application's `package.json`:

```json
{
  "dependencies": {
    "foundation-ui": "file:../ds5-ui-m3e",
    "vue": "^3.5.0"
  }
}
```

Run `npm install` in the application afterwards. The Foundation Panel and Foundation Sunshine Web UI builds read `FOUNDATION_UI_DIR`; set it when the clone is not at `../ds5-ui-m3e`.

## Compile Material Web tags

Text fields, select, checkbox, radio and menus are Material Web elements (`md-*`). Tell the Vue compiler to leave them alone:

```js
// vite.config.js
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('md-') } } })],
}
```

`foundation-ui/vue` also exports `isMaterialWebElement`, the same predicate.

## Entry points

| Import | Provides |
| --- | --- |
| `foundation-ui/all.css` | Fonts, tokens and the styles of every component |
| `foundation-ui/tokens.css`, `foundation-ui/springs.css` | Only the generated tokens, or only the spring easing tokens |
| `foundation-ui/theme` | `applyTheme`, `schemeColors`, `seedFromImage`, brand seeds, variants |
| `foundation-ui/motion` | Spring definitions and CSS easing helpers |
| `foundation-ui/vue` | Components, composables and logic of the Vue layer |
| `foundation-ui/icons` | The Material Symbols set used by `MIcon` |
| `foundation-ui/tray`, `foundation-ui/contextmenu/*`, `foundation-ui/popup` | Tray menu model, context menu builders, popup window helpers |
| `foundation-ui/settings`, `foundation-ui/diagnostics`, `foundation-ui/doctor`, `foundation-ui/update`, … | Settings, diagnostics, doctor and update models |
| `foundation-ui/locale` | Locale preference helpers |
| `foundation-ui/testing/*` | Test helpers, see [Testing](testing.md) |

Every export path is listed under `exports` in [`package.json`](../../package.json).

## First page

```js
// main.js
import { createApp } from 'vue'
import 'foundation-ui/all.css'
import { applyTheme } from 'foundation-ui/theme'
import App from './App.vue'

applyTheme(document.documentElement)
createApp(App).mount('#app')
```

```vue
<!-- App.vue -->
<script setup>
import { ref } from 'vue'
import { MPage, MSection, MGroup, MSwitchItem, MSliderItem } from 'foundation-ui/vue'

const rumble = ref(true)
const strength = ref(0.8)
</script>

<template>
  <MPage title="Gamepad">
    <MSection title="Haptics">
      <MGroup>
        <MSwitchItem v-model="rumble" icon="mobile_vibrate" title="Rumble" />
        <MSliderItem v-model="strength" icon="bolt" title="Strength" :min="0" :max="2" />
      </MGroup>
    </MSection>
  </MPage>
</template>
```

Light and dark follow the `data-bs-theme` attribute on `<html>` (`light` or `dark`).

## Run the gallery

```sh
git clone https://github.com/AlkaidLab/foundation-ui && cd foundation-ui
npm ci
npx vite --config gallery/vite.config.js
```

The gallery opens on `http://127.0.0.1:18081`. Pages such as `tiles.html`, `tray.html` and `charts.html` show one area each; add `?theme=dark` for the dark scheme.
