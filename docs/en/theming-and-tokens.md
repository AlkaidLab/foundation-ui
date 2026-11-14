# Theming and tokens

[Documentation](../../README.md#documentation) · [Getting started](getting-started.md) · **Theming and tokens** · [Components](components.md) · [Testing](testing.md)

## Colour

Colour roles come from Material 3 dynamic colour (`@material/material-color-utilities`, HCT). One seed colour per scheme produces every role. `foundation-ui/all.css` ships a generated default (`light`: vibrant, `dark`: tonal spot); `applyTheme` replaces it at run time.

```js
import { applyTheme } from 'foundation-ui/theme'

applyTheme(document.documentElement, {
  light: '#4a9eff',           // seed of the light scheme (BRAND_SEEDS.light)
  dark: '#d4a5a5',            // seed of the dark scheme (BRAND_SEEDS.dark)
  variants: { light: 'vibrant', dark: 'tonalSpot' },
  contrast: 0,                // contrast level of the Material scheme
  black: false,               // near-black surfaces in dark
  style: 'bright',            // 'bright' | 'classic' | 'quiet'
})
```

- **Variants**: `tonalSpot`, `expressive`, `vibrant`, `neutral`, `fidelity`.
- **Styles**: `bright` (default), `classic`, `quiet`; exported as `COLOR_STYLES`.
- `applyTheme` writes one `<style id="foundation-ui-theme">` into the document. The light sheet targets `:root`, `[data-bs-theme='light']` and `[data-theme='light']`; the dark sheet targets `[data-bs-theme='dark']` and `[data-theme='dark']`. Switch scheme by setting the attribute.
- `seedFromImage(image)` returns the seed colour of an image, for dynamic colour from a wallpaper.
- `schemeColors(seed, options)` returns the role map without touching the document; `colorCss(seed, options)` returns it as `--md-sys-color-*` declarations.

Roles are CSS custom properties named like Material Web's: `--md-sys-color-primary`, `--md-sys-color-on-primary`, `--md-sys-color-surface-container`, and so on. Status colours (`success`, `warning`) and chart colours (`chart1`…) are generated with the scheme. Page and card backgrounds use `--m-page` and `--m-card`.

## Shape

Corner tokens follow the Material 3 scale: `--md-sys-shape-corner-none` to `--md-sys-shape-corner-extra-large-increased`, defined in `tokens.css`.

## Motion

Spring motion tokens are defined in `foundation-ui/motion`:

| Token | Damping | Stiffness |
| --- | --- | --- |
| `fastSpatial` | 0.6 | 800 |
| `defaultSpatial` | 0.8 | 380 |
| `slowSpatial` | 0.8 | 200 |
| `fastEffects` | 1 | 3800 |
| `defaultEffects` | 1 | 1600 |
| `slowEffects` | 1 | 800 |

CSS cannot run a spring, so each one is sampled once into a `linear()` easing with the time it needs to settle. `springs.css` exposes them as `--m-spring-<name>` (easing) and `--m-spring-<name>-duration`:

```css
.panel { transition: transform var(--m-spring-default-spatial-duration) var(--m-spring-default-spatial); }
```

`SPRINGS`, `springEasing(spring)` and `motionCss()` are exported for use in scripts.

## Type and fonts

The interface face is Roboto Flex (variable). The display face of tiles is Google Sans Flex, family `M3E Display`, token `--m-font-display`; the dock clock has a few more faces. All fonts are SIL OFL 1.1; sources and licences are in [`src/fonts/FONTS.md`](../../src/fonts/FONTS.md). `all.css` imports `fonts.css`.

## Regenerating tokens

`src/tokens/tokens.css` and `springs.css` are generated from `theme.js` and `motion.js`:

```sh
npm run build:tokens
```

Edit the generator inputs, not the CSS.
